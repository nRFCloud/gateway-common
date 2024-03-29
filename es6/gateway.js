import * as awsIot from 'aws-iot-device-sdk';
import { EventEmitter } from 'events';
import isEqual from 'lodash/isEqual';
import { isBeacon } from 'beacon-utilities';
import { AdapterEvent } from './bluetoothAdapter';
import { MqttFacade } from './mqttFacade';
import { Characteristic, Descriptor } from './interfaces/bluetooth';
import { C2GEventType, ScanType, } from './interfaces/c2g';
import { assumeType } from './utils';
import { UpdateStatus } from './fotaAdapter';
import { JobExecutionStatus } from './interfaces/interfaces';
import { FotaEvent, FotaQ } from './fotaQueue';
const CLIENT_CHARACTERISTIC_CONFIGURATION = '2902';
export var GatewayEvent;
(function (GatewayEvent) {
    GatewayEvent["NameChanged"] = "NAME_CHANGED";
    GatewayEvent["Deleted"] = "GATEWAY_DELETED";
    GatewayEvent["DeviceRemoved"] = "DEVICE_REMOVED";
    GatewayEvent["ConnectionsChanged"] = "CONNECTIONS_CHANGED";
    GatewayEvent["StatusChanged"] = "STATUS_CHANGED";
    GatewayEvent["DeviceUpdate"] = "DEVICE_UPDATE";
    GatewayEvent["BeaconUpdate"] = "BEACON_UPDATE";
})(GatewayEvent || (GatewayEvent = {}));
export class Gateway extends EventEmitter {
    constructor(config) {
        super();
        this.fotaAdapter = null;
        this.fotaQueue = FotaQ;
        this.deviceConnections = {};
        this.deviceConnectionIntervalHolder = null;
        this.lastTriedAddress = null;
        this._name = '';
        this.discoveryCache = {};
        this.watchList = [];
        this.fotaMap = {};
        this.gatewayId = config.gatewayId;
        this.stage = config.stage ?? 'prod';
        this.tenantId = config.tenantId;
        this.bluetoothAdapter = config.bluetoothAdapter;
        this.fotaAdapter = config.fotaAdapter ?? null;
        this.watchInterval = config.watchInterval ?? 60;
        this.watchDuration = config.watchDuration ?? 2;
        this.state = {
            isTryingConnection: false,
            scanning: false,
            connected: false,
        };
        this.bluetoothAdapter.on(AdapterEvent.DeviceConnected, (deviceId) => {
            this.deviceConnections[deviceId] = true;
            this.reportConnectionUp(deviceId);
            this.doDiscover(deviceId, true);
            this.mqttFacade.requestJobsForDevice(deviceId); //Since this device just connected, we want to know if there are any outstanding FOTA jobs
        });
        this.bluetoothAdapter.on(AdapterEvent.DeviceDisconnected, (deviceId) => {
            if (typeof this.deviceConnections[deviceId] !== 'undefined') {
                this.deviceConnections[deviceId] = false;
                this.reportConnectionDown(deviceId);
            }
        });
        //A Gateway is just an AWS IoT device, here's where it's started and connected
        this.gatewayDevice = new awsIot.device({
            keyPath: config.keyPath,
            certPath: config.certPath,
            caPath: config.caPath,
            clientId: this.gatewayId,
            host: config.host,
            protocol: config.protocol ?? (config.accessKeyId ? 'wss' : 'mqtts'),
            accessKeyId: config.accessKeyId,
            secretKey: config.secretKey,
            sessionToken: config.sessionToken,
            debug: !!config.debug,
        });
        this.gatewayDevice.on('connect', () => {
            console.log('connect');
            //To finish the connection, an empty string must be published to the shadowGet topic
            this.gatewayDevice.publish(this.shadowGetTopic, '');
            this.mqttFacade.reportBLEFOTAAvailability(this.fotaAdapter !== null);
            this.updateState({ connected: true });
        });
        this.gatewayDevice.on('message', (topic, payload) => {
            this.handleMessage(topic, payload);
        });
        this.gatewayDevice.on('error', this.handleError);
        this.gatewayDevice.on('close', () => {
            this.updateState({ connected: false });
        });
        /*
        The gateway needs to listen to these topics:
        c2g: this is the primary way that the cloud talks to the gateway (cloud2gateway). Operations are sent over this topic like "start scanning"
        shadowGet/accepted:
        shadowUpdate: Both of these deal with the device's shadow. This is how bluetooth devices are "added" to a gateway as well as beacons. They're for different things, but can be handled the same
        bleFotaRcvTopic: FOTA messages are received via this topic. We also check for FOTA updates when a device connects (see above)
         */
        this.gatewayDevice.subscribe(this.c2gTopic);
        this.gatewayDevice.subscribe(`${this.shadowGetTopic}/accepted`);
        this.gatewayDevice.subscribe(this.shadowUpdateTopic);
        if (this.fotaAdapter !== null) {
            this.gatewayDevice.subscribe(this.bleFotaRcvTopic);
            this.fotaQueue.setFotaAdapter(this.fotaAdapter);
            this.fotaQueue.on(FotaEvent.DfuStatus, (item, update) => this.dfuStatusListener(item, update));
            this.fotaQueue.on(FotaEvent.DownloadProgress, (item, percentage) => this.dfuDownloadListener(item, percentage));
            this.fotaQueue.on(FotaEvent.ErrorUpdating, (item, update) => this.dfuErrorListener(item, update));
        }
        this.mqttFacade = new MqttFacade({
            mqttClient: this.gatewayDevice,
            g2cTopic: this.g2cTopic,
            shadowTopic: this.shadowTopic,
            gatewayId: this.gatewayId,
            bleFotaTopic: this.fotaTopicPrefix,
        });
        this.watcherHolder = setInterval(async () => {
            await this.performWatches();
            this.performRSSIs();
        }, this.watchInterval * 1000);
    }
    get c2gTopic() {
        return `${this.stage}/${this.tenantId}/gateways/${this.gatewayId}/c2g`;
    }
    get g2cTopic() {
        return `${this.stage}/${this.tenantId}/gateways/${this.gatewayId}/g2c`;
    }
    get beacons() {
        return this.watchList;
    }
    get connections() {
        return this.deviceConnections;
    }
    get name() {
        return this._name;
    }
    get topicPrefix() {
        return `${this.stage}/${this.tenantId}/${this.gatewayId}`;
    }
    get shadowGetTopic() {
        return `${this.shadowTopic}/get`;
    }
    get shadowUpdateTopic() {
        return `${this.shadowTopic}/update/delta`;
    }
    get shadowTopic() {
        return `${this.topicPrefix}/shadow`;
    }
    get fotaTopicPrefix() {
        return `${this.topicPrefix}/jobs/ble`;
    }
    get bleFotaRcvTopic() {
        return `${this.fotaTopicPrefix}/rcv`;
    }
    handleMessage(topic, payload) {
        const message = JSON.parse(payload);
        if (topic === this.c2gTopic) {
            this.handleC2GMessage(message);
        }
        if (topic.startsWith(this.shadowTopic)) {
            this.handleShadowMessage(message);
        }
        if (topic === this.bleFotaRcvTopic) {
            console.log('got ble fota message', message);
            this.handleFotaMessage(message);
        }
    }
    //The cloud is telling us to perform a task (operation)
    handleC2GMessage(message) {
        console.log('got g2c message', message);
        if (!message || !message.type || !message.id || message.type !== 'operation' || !message.operation || !message.operation.type) {
            throw new Error('Unknown message ' + JSON.stringify(message));
        }
        let op = message.operation;
        switch (op.type) {
            case C2GEventType.Scan: //Do a bluetooth scan
                assumeType(op);
                this.startScan(op);
                break;
            case C2GEventType.PerformDiscover: //Do a discover AND full value read
                assumeType(op);
                if (op.deviceAddress) {
                    this.doDiscover(op.deviceAddress);
                }
                break;
            case C2GEventType.CharacteristicValueRead: //Read a characteristic
                assumeType(op);
                if (op.deviceAddress && op.serviceUUID && op.characteristicUUID) {
                    this.doCharacteristicRead(op);
                }
                break;
            case C2GEventType.CharacteristicValueWrite: //Write value to a characteristic
                assumeType(op);
                if (op.deviceAddress &&
                    op.serviceUUID &&
                    op.characteristicUUID &&
                    op.characteristicValue) {
                    this.doCharacteristicWrite(op);
                }
                break;
            case C2GEventType.DescriptorValueRead: //Read a descriptor
                assumeType(op);
                if (op.deviceAddress &&
                    op.characteristicUUID &&
                    op.serviceUUID &&
                    op.descriptorUUID) {
                    this.doDescriptorRead(op);
                }
                break;
            case C2GEventType.DescriptoValueWrite: //Write value to a descriptor
                assumeType(op);
                if (op.deviceAddress &&
                    op.characteristicUUID &&
                    op.serviceUUID &&
                    op.descriptorUUID &&
                    op.descriptorValue) {
                    this.doDescriptorWrite(op);
                }
                break;
            case C2GEventType.GatewayStatus: //Get information about the gateway
                //This is probably not used for anything
                break;
            case C2GEventType.DeleteYourself: //User has deleted this gateway from their account
                console.log('Gateway has been deleted');
                this.emit(GatewayEvent.Deleted);
                break;
        }
    }
    //The gateway's shadow has changed, we need to react to the change
    handleShadowMessage(message) {
        if (!message.state) {
            return;
        }
        const newState = message.state.desired || message.state;
        if (!newState) {
            return;
        }
        //state.desiredConnections is the list of bluetooth connections we should be worried about
        if (newState.desiredConnections) {
            if (!newState.desiredConnections?.length) {
                this.updateDeviceConnections([]);
                return;
            }
            if (typeof newState.desiredConnections[0] === 'string') {
                this.updateDeviceConnections(newState.desiredConnections);
            }
            else if (typeof newState.desiredConnections[0].id !== 'undefined') {
                this.updateDeviceConnections(newState.desiredConnections.map((conn) => conn.id));
            }
        }
        //state.name is the name of the gateway
        if (newState.name) {
            this.emit(GatewayEvent.NameChanged, newState.name);
        }
        //state.beacons is a list of beacons we should watch
        if (newState.beacons) {
            this.handleBeaconState(newState.beacons);
        }
    }
    //Beacons are just a flat list of ids
    handleBeaconState(beacons) {
        this.watchList = beacons;
    }
    handleFotaMessage(message) {
        if (this.fotaAdapter === null) { //we don't have anything to use to handle fota, so ignore
            return;
        }
        const [deviceId, jobId, jobStatus, downloadSize, host, path] = message;
        if (!this.isDeviceConnected(deviceId)) {
            return; //we can ignore it, the device isn't connected now, when the device connects, we'll grab all jobs for it
        }
        const files = path.split(' ');
        const updateObj = {
            deviceId,
            jobId,
            uris: files.map((file) => `https://${host}/${file}`),
        };
        this.fotaQueue.add(updateObj);
    }
    //On a timer, we should report the RSSIs of the devices
    //The way to report about the devices is to send a "scan result" message with the updated information
    async performRSSIs() {
        for (const deviceId of Object.keys(this.deviceConnections)) {
            if (!this.deviceConnections[deviceId]) {
                //Device isn't connected, don't bother trying to get the rssi
                continue;
            }
            try {
                const result = await this.bluetoothAdapter.getRSSI(deviceId);
                const updatedDeviceObj = Object.assign({}, result, {
                    rssi: result.rssi,
                    address: {
                        address: deviceId,
                        type: '',
                    },
                    name: result.name,
                });
                this.emit(GatewayEvent.DeviceUpdate, updatedDeviceObj);
                this.mqttFacade.handleScanResult(updatedDeviceObj, false);
            }
            catch (err) {
                //squelch. If there was an error, we don't care since this is not a critical piece of information
            }
        }
    }
    //On a timer, we should report about any beacons
    //Like RSSIs, we just send the information as a "scan result"
    async performWatches() {
        if (!this.watchList || this.watchList.length < 1) {
            return;
        }
        //Skip if we're already scanning
        if (this.state.scanning) {
            return;
        }
        this.updateState({ scanning: true });
        //The way to track beacons is to just scan for them
        return new Promise((resolve) => {
            this.bluetoothAdapter.startScan((result) => {
                if (this.watchList.includes(result.address.address)) {
                    this.emit(GatewayEvent.BeaconUpdate, result);
                    this.mqttFacade.handleScanResult(result, false);
                }
            });
            setTimeout(() => {
                this.bluetoothAdapter.stopScan();
                this.updateState({ scanning: false });
                resolve();
            }, this.watchDuration * 1000);
        });
    }
    handleError(error) {
        console.error('Error from MQTT', error);
    }
    //Do a "discover" operation on a device, this will do a standard bluetooth discover AS WELL AS grabs the current value for each characteristic and descriptor
    async doDiscover(deviceAddress, forceNew = false) {
        if (forceNew || typeof this.discoveryCache[deviceAddress] === 'undefined') {
            this.discoveryCache[deviceAddress] = await this.bluetoothAdapter.discover(deviceAddress);
        }
        this.mqttFacade.reportDiscover(deviceAddress, this.discoveryCache[deviceAddress]);
    }
    //Do a characteristic read operation
    async doCharacteristicRead(op) {
        try {
            const char = new Characteristic(op.characteristicUUID, op.serviceUUID);
            char.value = await this.bluetoothAdapter.readCharacteristicValue(op.deviceAddress, char);
            this.mqttFacade.reportCharacteristicRead(op.deviceAddress, char);
        }
        catch (err) {
            this.mqttFacade.reportError(err);
        }
    }
    //Do a characteristic write operation, note that we don't care about write without response
    async doCharacteristicWrite(op) {
        try {
            const char = new Characteristic(op.characteristicUUID, op.serviceUUID);
            char.value = op.characteristicValue;
            await this.bluetoothAdapter.writeCharacteristicValue(op.deviceAddress, char);
            this.mqttFacade.reportCharacteristicWrite(op.deviceAddress, char);
            this.mqttFacade.reportCharacteristicChanged(op.deviceAddress, char);
        }
        catch (err) {
            this.mqttFacade.reportError(err);
        }
    }
    //Do a descriptor read operation
    async doDescriptorRead(op) {
        try {
            const descriptor = new Descriptor(op.descriptorUUID, op.characteristicUUID, op.serviceUUID);
            descriptor.value = await this.bluetoothAdapter.readDescriptorValue(op.deviceAddress, descriptor);
            this.mqttFacade.reportDescriptorRead(op.deviceAddress, descriptor);
        }
        catch (err) {
            this.mqttFacade.reportError(err);
        }
    }
    //Do a descriptor write operation
    //intercept "subscribe" events (writing to 2902) and instead setup/tear down a subscription
    async doDescriptorWrite(op) {
        try {
            const descriptor = new Descriptor(op.descriptorUUID, op.characteristicUUID, op.serviceUUID);
            descriptor.value = op.descriptorValue;
            if (descriptor.uuid === CLIENT_CHARACTERISTIC_CONFIGURATION) {
                const characteristic = new Characteristic(op.characteristicUUID, op.serviceUUID);
                if (descriptor.value.length > 0 && descriptor.value[0]) {
                    await this.bluetoothAdapter.subscribe(op.deviceAddress, characteristic, (characteristic) => {
                        this.mqttFacade.reportCharacteristicChanged(op.deviceAddress, characteristic);
                    });
                }
                else {
                    await this.bluetoothAdapter.unsubscribe(op.deviceAddress, characteristic);
                }
            }
            else {
                await this.bluetoothAdapter.writeDescriptorValue(op.deviceAddress, descriptor);
            }
            this.mqttFacade.reportDescriptorChanged(op.deviceAddress, descriptor);
            this.mqttFacade.reportDescriptorWrite(op.deviceAddress, descriptor);
        }
        catch (err) {
            this.mqttFacade.reportError(err);
        }
    }
    //Filter out results that don't match the sent operation
    shouldIncludeResult(op, result) {
        if (op.scanType === ScanType.Beacon && !isBeacon(result.advertisementData)) {
            return false;
        }
        if (op.filter) {
            if (op.filter.name && result.name.indexOf(op.filter.name) < 0) {
                return false;
            }
            if (op.filter.rssi && result.rssi < op.filter.rssi) {
                return false;
            }
        }
        return true;
    }
    //Do a scanning operation
    startScan(op) {
        if (this.state.scanning) {
            return;
        }
        this.updateState({ scanning: true });
        this.bluetoothAdapter.startScan((result) => {
            if (this.shouldIncludeResult(op, result)) {
                this.mqttFacade.handleScanResult(result, false);
            }
        });
        setTimeout(() => {
            this.bluetoothAdapter.stopScan();
            this.mqttFacade.handleScanResult(null, true);
            this.updateState({ scanning: false });
        }, op.scanTimeout * 1000);
    }
    //Given the desired connections from the shadow, update our list of connections
    async updateDeviceConnections(connections) {
        const existingConnections = { ...this.deviceConnections };
        const deviceIds = Object.keys(existingConnections);
        const connectionsToAdd = connections.filter((id) => deviceIds.indexOf(id) < 0);
        const connectionsToRemove = deviceIds.filter((id) => connections.indexOf(id) < 0);
        for (const connectionToRemove of connectionsToRemove) {
            try {
                await this.bluetoothAdapter.disconnect(connectionToRemove);
            }
            catch (error) {
                console.error('error', `Error removing connection to device ${error instanceof Object ? JSON.stringify(error) : error}`);
            }
            finally {
                if (typeof this.deviceConnections[connectionToRemove] !== 'undefined') {
                    delete this.deviceConnections[connectionToRemove];
                    this.emit(GatewayEvent.DeviceRemoved, connectionToRemove);
                }
            }
        }
        for (const connectionToAdd of connectionsToAdd) {
            if (deviceIds.indexOf(connectionToAdd) < 0) {
                this.deviceConnections[connectionToAdd] = false;
            }
        }
        this.startDeviceConnections();
        if (!isEqual(this.deviceConnections, existingConnections)) {
            //If there was a difference, report the current connections
            this.reportConnections();
        }
    }
    //Report the current connections
    reportConnections() {
        const statusConnections = this.getStatusConnections();
        this.mqttFacade.reportConnections(statusConnections);
        this.emit(GatewayEvent.ConnectionsChanged, statusConnections);
    }
    //Convert our list of connections to what the cloud is expecting
    getStatusConnections() {
        const statusConnections = {};
        for (const connection of Object.keys(this.deviceConnections)) {
            statusConnections[connection] = {
                id: connection,
                status: {
                    connected: this.deviceConnections[connection],
                },
            };
        }
        return statusConnections;
    }
    //On an interval, try to initiate connections. This is started only when we have connections to initiate
    startDeviceConnections() {
        if (this.deviceConnectionIntervalHolder === null) {
            this.deviceConnectionIntervalHolder = setInterval(() => this.initiateNextConnection(), 1000);
        }
    }
    //Try to initiate the next connection on the list
    //Will go through the list one at a time to connect (so it won't be stuck trying to connect to only the first one in the list)
    async initiateNextConnection() {
        if (this.state.isTryingConnection) {
            return;
        }
        const connections = Object.keys(this.deviceConnections).filter((deviceId) => !this.deviceConnections[deviceId]);
        if (connections.length < 1) { //everything is already connected
            return;
        }
        let nextAddressToTry;
        if (!this.lastTriedAddress || connections.indexOf(this.lastTriedAddress) < 0) {
            nextAddressToTry = connections[0];
        }
        else {
            const indexOf = connections.indexOf(this.lastTriedAddress);
            if (indexOf + 1 >= connections.length) {
                nextAddressToTry = connections[0];
            }
            else {
                nextAddressToTry = connections[indexOf + 1];
            }
        }
        try {
            if (this.fotaQueue.currentItem?.deviceId !== nextAddressToTry) { //If we're currently doing fota, skip this one
                this.updateState({ isTryingConnection: true });
                await this.bluetoothAdapter.connect(nextAddressToTry);
            }
        }
        catch (error) {
        }
        finally {
            this.lastTriedAddress = nextAddressToTry;
            this.updateState({ isTryingConnection: false });
        }
    }
    stopDeviceConnections() {
        clearInterval(this.deviceConnectionIntervalHolder);
        this.deviceConnectionIntervalHolder = null;
    }
    isDeviceConnected(deviceId) {
        return !!this.connections[deviceId];
    }
    //Whenever a device is connected or dissconnected, we need to report it with two messages
    reportConnectionUp(deviceId) {
        this.reportConnections();
        this.mqttFacade.reportConnectionUp(deviceId);
    }
    reportConnectionDown(deviceId) {
        this.reportConnections();
        this.mqttFacade.reportConnectionDown(deviceId);
    }
    updateState(newState) {
        this.state = Object.assign({}, this.state, newState);
        this.emit(GatewayEvent.StatusChanged, this.state);
    }
    dfuErrorListener(item, update) {
        this.mqttFacade.reportBLEFOTAStatus([item.deviceId, item.jobId, JobExecutionStatus.Failed, update.message]);
    }
    dfuDownloadListener(item, percentage) {
        this.mqttFacade.reportBLEFOTAStatus([item.deviceId, item.jobId, JobExecutionStatus.Downloading, percentage]);
    }
    dfuStatusListener(item, update) {
        const { deviceId, jobId } = item;
        switch (update.status) {
            case UpdateStatus.ProgressChanged:
                this.mqttFacade.reportBLEFOTAStatus([deviceId, jobId, JobExecutionStatus.InProgress, update.progress?.percent]);
                break;
            case UpdateStatus.DfuAborted:
                this.mqttFacade.reportBLEFOTAStatus([deviceId, jobId, JobExecutionStatus.Failed, update.message]);
                break;
            case UpdateStatus.DfuCompleted:
                this.mqttFacade.reportBLEFOTAStatus([deviceId, jobId, JobExecutionStatus.Succeeded, '']);
                break;
        }
    }
}
//# sourceMappingURL=gateway.js.map