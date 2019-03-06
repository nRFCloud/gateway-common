'use strict';

import {
    IGateway,
    GatewayConfig,
    State
} from './Gateway';

import * as util from './GatewayUtil';

import {
    BLEDescriptor,
} from './model/g2c';

import {
    IAdapterDriverFactory, IAdapter
} from './AdapterDriverFactory';

import * as AdapterDriverModel from './AdapterDriverModel';

import {
    DeviceConnectionDatabase,
    IDeviceConnectionDatabase,
} from './DeviceConnectionDatabase';

import * as AdapterDriver from './AdapterDriver';

import {
    G2CEvent,
    BLEDevice, BLEAddress, BLEConnectionOptions, BLEDeviceConnectionError,
    BLEConnectionConnParams, BLEConnectionScanParams, BLEConnectionSecurity, BLEConnectionSecurityParams,
    GatewayStatusEvent, DeviceConnectResultEvent, ScanResultInstantEvent,
    ScanResultBatchEvent, DeviceDisconnectedEvent,
    DeviceDiscoverEvent,
    CharacteristicValueChangedEvent, CharacteristicValueReadEvent, CharacteristicValueWriteEvent,
    DescriptorValueChangedEvent, DescriptorValueReadEvent, DescriptorValueWriteEvent,
    BLEDeviceConnectionDatabaseEntry,
    BLEDeviceConnectionStatus,
    BLECharacteristic,
} from './model/g2c';

import { IFSAdapter } from './FSAdapter';
import * as path from 'path';
import * as events from 'events';

import * as awsIot from 'aws-iot-device-sdk';

import * as wlogger from 'winston';

let logger = wlogger;

const packageVersion = 'unknown';

const defaultConfigFilename: string = 'config.json';
const maintainDeviceConnectionIntervalTime: number = 1000;

// Classes assisting in keeping the reported state in the Thing Shadow
// Classes ending with Wrapper use classes already found in g2c and provides a wrapper around that class that allows for adjusting that model
// FIXME: Review this way of doing the shadow reporting

export namespace ShadowReported {
    export class BLEAddressWrapper extends BLEAddress {
        constructor(props: BLEAddress) {
            super();
            this.address = props.address;
            this.type = props.type;
        }
    }

    export class BLEConnectionConnParamsWrapper extends BLEConnectionConnParams {
        constructor(params: BLEConnectionConnParams) {
            super();
            this.connectionSupervisionTimeout = params.connectionSupervisionTimeout;
            this.maxConnInterval = params.maxConnInterval;
            this.minConnInterval = params.minConnInterval;
        }
    }

    export class BLEConnectionScanParamsWrapper extends BLEConnectionScanParams {
        constructor(params: BLEConnectionScanParams) {
            super();
            this.active = params.active;
            this.interval = params.interval;
            this.timeout = params.timeout;
            this.window = params.window;
        }
    }

    export class BLEConnectionOptionsWrapper extends BLEConnectionOptions {
        constructor(props: BLEConnectionOptions) {
            super();
            this.scanParams = props.scanParams;
            this.connParams = props.connParams;
            this.security = props.security;
        }
    }

    export class BLEDeviceConnectionErrorWrapper extends BLEDeviceConnectionError {
        constructor(description: string, code: number) {
            super();
            this.description = description;
            this.code = code;
        }
    }


    export class BLEDeviceConnectionStatusWrapper extends BLEDeviceConnectionStatus {
        constructor(props: BLEDeviceConnectionStatus) {
            super();
            this.connected = props.connected;
            this.connectTimedOut = undefined; // connectTimedOut is irrelevant for the FE
            this.error = props.error;
            this.auth = props.auth;
        }
    }

    export class BLEDeviceConnectionDatabaseStatusEntryWrapper {
        id: string;
        status: BLEDeviceConnectionStatusWrapper;

        constructor(props: BLEDeviceConnectionDatabaseEntry) {
            this.id = props.id;

            if (props.status) {
                this.status = new BLEDeviceConnectionStatusWrapper(BLEDeviceConnectionStatus.copy(props.status));
            } else {
                this.status = null;
            }
        }

        private isStatusEqual(other: BLEDeviceConnectionDatabaseStatusEntryWrapper): boolean {
            if (this.status == null && other == null) {
                return true;
            }
            if (this.status == null) {
                return false;
            }

            return this.status.equals(other.status);
        }

        equals(other: BLEDeviceConnectionDatabaseStatusEntryWrapper) {
            if (this.id !== other.id) {
                return false;
            }

            return this.isStatusEqual(other);
        }
    }

    export class SecurityParamsWrapper extends BLEConnectionSecurityParams {
        constructor(props: BLEConnectionSecurityParams) {
            super();
            this.bond = props.bond;
            this.ioCaps = props.ioCaps;
            this.keypress = props.keypress;
            this.lesc = props.lesc;
            this.mitm = props.mitm;
        }
    }

    export class BLEConnectionSecurityWrapper extends BLEConnectionSecurity {
        constructor(props: BLEConnectionSecurity) {
            super();
            this.autoAccept = props.autoAccept;
            this.initiate = props.initiate;
            this.securityParams = props.securityParams;
        }
    }

    export class BLEDeviceConnectionDatabaseDesiredEntry {
        id: string;
        address: BLEAddressWrapper;
        connectOptions: BLEConnectionOptions;
        status: BLEDeviceConnectionStatus;
        name: string;

        constructor(props: BLEDeviceConnectionDatabaseEntry) {
            this.id = props.id;
            this.address = new BLEAddressWrapper(<BLEAddress>props.address);

            if (props.connectOptions) {
                this.connectOptions = new BLEConnectionOptions();

                if (props.connectOptions.connParams) {
                    this.connectOptions.connParams = new BLEConnectionConnParamsWrapper(<BLEConnectionConnParams>props.connectOptions.connParams);
                }

                if (props.connectOptions.scanParams) {
                    this.connectOptions.scanParams = new BLEConnectionScanParamsWrapper(<BLEConnectionScanParams>props.connectOptions.scanParams);
                }

                if (props.connectOptions.security) {
                    this.connectOptions.security = new BLEConnectionSecurityWrapper(<BLEConnectionSecurity>props.connectOptions.security);
                }
            }
        }

        private isAddressEqual(other: BLEAddress): boolean {
            if (this.address === null && other.address === null) {
                return true;
            }

            if (this.address === null) {
                return false;
            }
            return this.address.equals(other);
        }

        private isConnectOptionsEqual(other: BLEConnectionOptions): boolean {
            if (this.connectOptions === null && other.connParams === null) {
                return true;
            }

            if (this.connectOptions === null) {
                return false;
            }

            return this.connectOptions.equals(other);
        }

        equals(other: BLEDeviceConnectionDatabaseDesiredEntry): boolean {
            if (this.id !== other.id) {
                return false;
            }
            if (!this.isAddressEqual(other.address)) {
                return false;
            }
            return this.isConnectOptionsEqual(other.connectOptions);


        }
    }

    export class BLEDeviceConnectionDatabase {
        desiredConnections: Array<BLEDeviceConnectionDatabaseDesiredEntry>;
        statusConnections: any;

        constructor(props: BLEDeviceConnectionDatabaseEntry[]) {
            this.desiredConnections = [];
            this.statusConnections = {};

            if (props) {
                props.forEach(connection => {
                    this.desiredConnections.push(new BLEDeviceConnectionDatabaseDesiredEntry(connection));
                    this.statusConnections[connection.id] = new BLEDeviceConnectionDatabaseStatusEntryWrapper(connection);
                });
            }
        }

        equals(other: BLEDeviceConnectionDatabase): boolean {
            if (this.desiredConnections.length !== other.desiredConnections.length) {
                return false;
            }
            if (Object.keys(this.statusConnections).length !== Object.keys(other.statusConnections).length) {
                return false;
            }

            for (let thisConnection of this.desiredConnections) {
                let found = false;

                for (let otherConnection of other.desiredConnections) {
                    if (thisConnection.equals(otherConnection)) {
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    return false;
                }
            }

            for (let thisKey of Object.keys(this.statusConnections)) {
                let found = false;

                for (let otherKey of Object.keys(other.statusConnections)) {
                    if (this.statusConnections[thisKey].equals(other.statusConnections[otherKey])) {
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    return false;
                }
            }

            return true;
        }
    }
}

export interface GatewayTopics {
    base: string;
    gateway2Cloud: string;
    cloud2Gateway: string;
}

export interface WSSConnectOptions {
    accessKeyId: any;
    secretKey: any;
    sessionToken: any;
}

const STATUS_UPDATE = 'statusUpdate';
const DELETEDMYSELF = 'deletedmyself';
const CONNECTION_DATABASE_CHANGE = 'connectionDatabaseChange';

export class GatewayAWS extends events.EventEmitter implements IGateway {
    adapterDriverFactory: IAdapterDriverFactory;
    fsAdapter: IFSAdapter;
    config: GatewayConfig;
    shadowDataBaseTopic: string;
    state: State;
    mqtt: awsIot.device;
    configFilename: string | null;
    deviceConnectionDatabase: IDeviceConnectionDatabase = null;
    connectionsReported: ShadowReported.BLEDeviceConnectionDatabase;

    // BLE Security related
    secKeySets: Map<string, any>;
    environmentStage: string | null;
    gatewayVersion: string | null;
    adapter: IAdapter;
    adapterDriver: AdapterDriver.IAdapterDriver | null;
    started: boolean;

    // Variables used to keep track of listeners
    adapterEventListeners: any;
    adapterFactoryEventListeners: any;

    connectOptions: WSSConnectOptions;

    genericInfo: any;

    constructor(configFile: string | null, adapterId: string | null, fsAdapter: IFSAdapter, gatewayVersion?: string, newLogger?: any) {
        super();

        this.started = false;

        this.fsAdapter = fsAdapter;

        if (!configFile) {
            this.configFilename = path.join(process.cwd(), defaultConfigFilename);
        } else {
            this.configFilename = configFile;
        }

        this.config = <GatewayConfig>{};

        this.gatewayVersion = gatewayVersion;

        if (adapterId !== null) {
            this.config.adapterId = adapterId;
        }

        this.secKeySets = new Map<string, any>();

        if (newLogger) {
            logger = newLogger;
        }

        this.adapterEventListeners = {};
        this.adapterFactoryEventListeners = {};
        this.genericInfo = {
            versions: {
                library: packageVersion,
                gateway: this.gatewayVersion,
            },
            platform: {
                name: 'node',
                version: process.version,
            }
        };
    }

    async init(): Promise<any> {
        await this.ensureConfigFileExists();
        logger.info(`Reading gateway config from ${this.configFilename}.`);
        const configFileContent = await this.fsAdapter.readFile(this.configFilename);

        const configFromFile = JSON.parse(configFileContent);

        this.config = <GatewayConfig>Object.assign({}, configFromFile);
        this.state = new State(this.config.platform, this.config.version);
    }

    async ensureConfigFileExists() {
        const exists = await this.fsAdapter.exists(this.configFilename);
        if (!exists) {
            await this.fsAdapter.writeFile(this.configFilename, '{}');
        }
    }

    setConnectOptions(options: WSSConnectOptions) {
        this.connectOptions = options;
    }

    isStarted(): boolean {
        return this.started;
    }

    async start(): Promise<void> {
        if (this.adapter == null) {
            const adapter = await this.adapterDriverFactory.getAdapterByAdapterId(this.config.adapterId);

            if (adapter === null) {
                throw new Error(`Adapter with adapterId ${this.config.adapterId} not found.`);
            }

            this.adapter = adapter;
            this.adapterDriver = adapter.getAdapterDriver();
        }

        if (!this.deviceConnectionDatabase) {
            this.deviceConnectionDatabase = new DeviceConnectionDatabase(this.adapterDriver, maintainDeviceConnectionIntervalTime, logger);
            this.deviceConnectionDatabase.on('connectionUp', connection => this.connectionUpListener(connection));
            this.deviceConnectionDatabase.on('connectionDown', connection => this.connectionDownListener(connection));
            this.deviceConnectionDatabase.on('databaseChange', connections => this.connectionDatabaseChangeListener(connections));
            this.deviceConnectionDatabase.on('connectionRemoved', connection => this.connectionDatabaseRemovedListener(connection));
        }

        await this.deviceConnectionDatabase.start();

        try {
            await this.openAdapter();
        } catch (error) {
            await this.deviceConnectionDatabase.stop();
            throw error;
        }

        try {
            await this.connectToCloud();
        } catch (error) {
            await this.deviceConnectionDatabase.stop();
            await this.closeAdapter();
            throw error;
        }

        this.started = true;
    }

    async stop(): Promise<void> {
        // If we are not running, return.
        if (this.started === false) {
            return;
        }

        this.started = false;

        try {
            if (this.deviceConnectionDatabase) {
                await this.deviceConnectionDatabase.stop();
            }

            await this.disconnectFromCloud();
            await this.closeAdapter();
        } catch (error) {
            logger.error(`Error disconnecting from cloud or closing adapter. ${typeof error === 'string' ? error : JSON.stringify(error)}`);
        } finally {
            this.removeAdapterEventListeners();
            this.removeAdapterFactoryListeners();
        }

        this.emitStatusUpdate();
    }

    isRegistered(): boolean {
        if (this.config === null) {
            return false;
        }
        return this.config.clientCert !== null && this.config.privateKey != null && this.config.gatewayId != null;
    }

    async setAdapter(adapterId: string): Promise<void> {
        this.config.adapterId = adapterId;
        await this.storeConfig();
    }

    getAdapter(): string {
        return this.config.adapterId;
    }

    setAdapterDriverFactory(adapterDriverFactory: IAdapterDriverFactory): void {
        this.adapterDriverFactory = adapterDriverFactory;
    }

    async setCredentials(tenantId: string, gatewayId: string, clientCert: string, privateKey: string, caCert: string): Promise<void> {
        this.config.clientCert = clientCert;
        this.config.privateKey = privateKey;
        this.config.tenantId = tenantId;
        this.config.gatewayId = gatewayId;
        this.config.caCert = caCert;

        await this.storeConfig();
    }

    private async openAdapter(): Promise<void> {
        await this.openAdapterInternal();
    }

    private async closeAdapter(): Promise<void> {
        if (!this.adapterDriver) {
            return;
        }

        if (this.state && this.state.foundAttributes) {
            this.state.foundAttributes = {};
        }

        try {
            await this.adapterDriver.close();
            await this.adapterDriver.reset();
        } catch (error) {
            throw new Error(`Error closing the adapter ${error}.`);
        }
    }

    private updateEnvironmentStage(stage: string) {
        if (this.environmentStage) {
            if (this.environmentStage === stage) {
                logger.debug(`Already subscribed to ${stage}.`);
                return;
            } else {
                logger.info(`Changing gateway environment from ${this.environmentStage} to ${stage}.`);
                this.mqtt.unsubscribe(this.getGatewayTopics().cloud2Gateway);
            }
        }

        this.environmentStage = stage;

        const topic = this.getGatewayTopics().cloud2Gateway;
        this.mqtt.subscribe(topic);
        logger.debug(`Subscribed to ${topic}.`);
    }

    private connectToCloud(): Promise<void> {
        return new Promise<void>((resolveConnectToCloud, rejectConnectToCloud) => {
            logger.debug(`Connecting to nRF Cloud.`);
            this.shadowDataBaseTopic = `$aws/things/${this.config.gatewayId}/shadow`;

            try {
                let cloudDeviceOptions = {
                    privateKey: Buffer.from(this.config.privateKey, 'utf8') as any, //the typings file is incorrect: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/21152
                    clientCert: Buffer.from(this.config.clientCert, 'utf8') as any,
                    caCert: Buffer.from(this.config.caCert, 'utf8') as any,
                    clientId: `${this.config.gatewayId}`,
                    region: 'us-east-1',
                    host: 'a2n7tk1kp18wix.iot.us-east-1.amazonaws.com',
                    debug: true
                };

                if (this.connectOptions) {
                    cloudDeviceOptions = Object.assign(cloudDeviceOptions, this.connectOptions);
                }

                this.mqtt = new awsIot.device(cloudDeviceOptions);

                this.mqtt.subscribe(`${this.shadowDataBaseTopic}/get/accepted`);
                this.mqtt.subscribe(`${this.shadowDataBaseTopic}/update/delta`);
            } catch (e) {
                let message = '';

                if (e.message) {
                    message = e.message;
                } else if (typeof e === 'string') {
                    message = e;
                } else {
                    message = JSON.stringify(e);
                }

                logger.error(`Error calling connectToCloud: ${message}`);
                rejectConnectToCloud(e);
            }

            this.mqtt.on('error', (error: any) => {
                // Do a guess if gateway has been deleted
                if (this.mqtt
                    && error
                    && error.code === 'EPROTO'
                    && error.message.indexOf('alert certificate unknown') > -1
                    && error.message.indexOf('SSL alert number 46') > -1
                ) {
                    this.deleteYourselfOperation();
                } else {
                    logger.error(`AWS IoT gateway error ${error.message}`);
                }
            });

            this.mqtt.on('connect', () => {
                this.state.gateway.connects += 1;
                this.state.gateway.connected = true;

                logger.info(`Connected to nRF Cloud.`);
                logger.debug(`Connected to AWS IoT message broker, gateway id is ${this.config.gatewayId}.`);
                this.emitStatusUpdate();

                // Retrieve the data shadow stored in the cloud
                // The shadow contains the connections we shall maintain
                this.mqtt.publish(`${this.shadowDataBaseTopic}/get`, '');

                // Resolve the promise
                if (resolveConnectToCloud != null) {
                    resolveConnectToCloud();
                }
            });

            this.mqtt.on('close', () => {
                logger.info('Connection to nRF Cloud disconnected.');
                this.state.gateway.disconnects += 1;
                this.state.gateway.connected = false;
                this.emitStatusUpdate();
            });

            this.mqtt.on('reconnect', () => {
                logger.info('Reconnecting to nRF Cloud.');
            });

            this.mqtt.on('message', (topic, payload) => {
                if (payload == null) {
                    return;
                }
                if (payload === '') {
                    return;
                }

                const msg = JSON.parse(payload);
                this.state.messages.received += 1;
                this.emitStatusUpdate();
                logger.debug(`Received message on topic: ${topic}. Content:\n${JSON.stringify(msg, null, 4)}`);

                if (topic === this.getGatewayTopics().cloud2Gateway) {
                    if (msg) {
                        if (msg.type && msg.id) {
                            if (msg.type === 'operation') {
                                if (msg.operation) {
                                    const op = msg.operation;

                                    if (op.type === 'scan') {
                                        this.scanOperation(msg);
                                    } else if (op.type === 'device_connect') {
                                        GatewayAWS.deviceConnectOperation();
                                    } else if (op.type === 'device_disconnect') {
                                        GatewayAWS.deviceDisconnectOperation();
                                    } else if (op.type === 'device_discover') {
                                        this.deviceDiscoverOperation(msg);
                                    } else if (op.type === 'device_characteristic_value_read') {
                                        this.characteristicValueReadOperation(msg);
                                    } else if (op.type === 'device_characteristic_value_write') {
                                        this.characteristicValueWriteOperation(msg);
                                    } else if (op.type === 'device_descriptor_value_read') {
                                        this.descriptorValueReadOperation(msg);
                                    } else if (op.type === 'device_descriptor_value_write') {
                                        this.descriptorValueWriteOperation(msg);
                                    } else if (op.type === 'get_gateway_status') {
                                        this.gatewayStatusOperation(msg);
                                    } else if (op.type === 'delete_yourself') {
                                        this.deleteYourselfOperation();
                                    } else {
                                        logger.error(`Unknow operation ${op.type} received`);
                                        this.g2cError(msg.id, `Unknow operation ${op.type} received`);
                                        return;
                                    }
                                } else {
                                    logger.error('Operation not provided.');
                                    this.g2cError(msg.id, 'Operation not provided.');
                                }
                            } else {
                                logger.error(`Unknown message type received: ${msg.type}`);
                                this.g2cError(msg.id, `Unknown message type received: ${msg.type}`);
                            }
                        }
                    }
                } else if (topic.startsWith(this.shadowDataBaseTopic)) {
                    let desiredConnections;

                    if (topic === `${this.shadowDataBaseTopic}/update/delta`) {
                        if (msg.state) {
                            logger.debug('Got message on topic /update/delta');

                            if (msg.state.desiredConnections) {
                                desiredConnections = msg.state.desiredConnections;

                                let connections: BLEDeviceConnectionDatabaseEntry[] = [];

                                desiredConnections.forEach(wantedConnection => {
                                    try {
                                        const connection = GatewayAWS.deviceDbToBLEDeviceConnectionDatabaseEntry(wantedConnection);
                                        connections.push(connection);
                                    } catch (ex) {
                                        logger.error(`Error creating Device Connection Database Entry: ${ex}`);
                                    }
                                });

                                this.deviceConnectionDatabase.updateDeviceConnections(connections).then(() => {
                                    logger.debug('Device connections updated.');
                                });
                            }

                            if (msg.state.stage) {
                                this.updateEnvironmentStage(msg.state.stage);
                            }

                            if (msg.state.name) {
                                // Update shadow state document, start executing changes afterwards
                                this.state.gateway.name = msg.state.name;
                                this.emitStatusUpdate();
                                logger.debug('Device name updated.');
                            }

                            if (msg.state.beacons) {
                                //handle beacons!
                                this.adapterDriver.watchDevices(msg.state.beacons);
                            }

                            const updatedShadow = {
                                state: {
                                    reported: Object.assign(msg.state, {
                                        desiredConnections: desiredConnections ? JSON.parse(JSON.stringify(desiredConnections)) : undefined,
                                        genericInfo: this.getGenericInfo(), // Always send genericInfo
                                        stage: this.environmentStage,
                                        name: this.state.gateway.name,
                                    }),
                                }
                            };

                            // Update shadow state document, start executing changes afterwards
                            this.publish(`${this.shadowDataBaseTopic}/update`, updatedShadow);
                        }
                    } else if (topic === `${this.shadowDataBaseTopic}/get/accepted`) {
                        logger.debug('Got shadow connections updated message.');

                        if (msg.state && msg.state.desired) {
                            if (msg.state.desired.desiredConnections) {
                                desiredConnections = msg.state.desired.desiredConnections;
                                const connections: BLEDeviceConnectionDatabaseEntry[] = [];

                                desiredConnections.forEach(desiredConnection => {
                                    try {
                                        const connection = GatewayAWS.deviceDbToBLEDeviceConnectionDatabaseEntry(desiredConnection);
                                        connections.push(connection);
                                    } catch (ex) {
                                        logger.error(`Error creating Device Connection Database Entry ${ex}.`);
                                    }
                                });

                                this.deviceConnectionDatabase.updateDeviceConnections(connections).then(() => {
                                    logger.debug('Device connections updated.');
                                });
                            }

                            if (msg.state.desired.beacons) {
                                //handle beacons!
                                this.adapterDriver.watchDevices(msg.state.desired.beacons);
                            }

                            this.updateEnvironmentStage(msg.state.desired.stage ? msg.state.desired.stage : 'beta');

                            const updatedShadow = {
                                state: {
                                    reported: {
                                        genericInfo: this.getGenericInfo(), // Always send genericInfo
                                        stage: this.environmentStage
                                    }
                                }
                            };

                            // Update shadow state document, start executing changes afterwards
                            this.publish(`${this.shadowDataBaseTopic}/update`, updatedShadow);
                        } else {
                            this.updateEnvironmentStage('beta');
                        }

                        if (msg.state && msg.state.desired && msg.state.desired.name) {
                            this.state.gateway.name = msg.state.desired.name;
                            this.emitStatusUpdate();
                            logger.debug('Device name updated.');
                        }
                    }
                }
            });

            this.mqtt.on('close', () => {
                logger.info('Closing connection to nRF Cloud.');
            });
        });
    }

    private async disconnectFromCloud(): Promise<void> {
        if (this.mqtt) {
            this.mqtt.unsubscribe(`${this.shadowDataBaseTopic}/get/accepted`);
            this.mqtt.unsubscribe(`${this.shadowDataBaseTopic}/update/delta`);
            this.mqtt.unsubscribe(`${this.shadowDataBaseTopic}/get}`);
            this.mqtt.unsubscribe(`${this.getGatewayTopics().cloud2Gateway}`);
            logger.debug(`Disconnecting from nRF Cloud, unsubscribed from all topics and removed all listeners.`);

            await new Promise<void>(resolve => {
                this.mqtt.end(true, () => {
                    resolve();
                });
            });

            this.mqtt.removeAllListeners();
            this.state.gateway.connected = false;
            this.environmentStage = null;
            this.emitStatusUpdate();
        } else {
            logger.debug('Cloud object does not exist, assuming we already are disconnected.');
        }
    }

    resetCounters() {
        this.state.messages.sent = 0;
        this.state.messages.errorsSent = 0;
        this.state.messages.received = 0;
    }

    private async storeConfig(): Promise<void> {
        try {

            await this.fsAdapter.writeFile(this.configFilename, JSON.stringify(this.config));

        } catch (error) {
            throw new Error(`Error storing configuration to ${this.configFilename}. Error is ${error}.`);
        }
    }

    private emitStatusUpdate() {
        this.emit(STATUS_UPDATE, util.deepCloneObject(this.state));
    }

    private assertAdapterConnected(reportToCloud: boolean, requestId?: string): boolean {
        if (this.adapter == null || !this.state.adapter.bleEnabled) {
            if (reportToCloud) {
                logger.error(`Adapter is not connected or BLE is not enabled.`);
                this.g2cError(requestId ? requestId : 'N/A', `Adapter is not connected or BLE is not enabled.`);
            }

            return false;
        } else {
            return true;
        }
    }

    private static deviceDbToBLEDeviceConnectionDatabaseEntry(deviceToConvert): BLEDeviceConnectionDatabaseEntry {
        const device = JSON.parse(JSON.stringify(deviceToConvert));

        if (!device.connectOptions) {
            device.connectOptions = {};
        }
        if (!device.connectOptions.scanParams) {
            device.connectOptions.scanParams = {};
        }

        if (typeof device.connectOptions.scanParams.active !== 'boolean') {
            device.connectOptions.scanParams.active = false;
        }

        if (typeof device.connectOptions.scanParams.interval !== 'number') {
            device.connectOptions.scanParams.interval = 100;
        }

        if (typeof device.connectOptions.scanParams.window !== 'number') {
            device.connectOptions.scanParams.window = 50;
        }

        if (typeof device.connectOptions.scanParams.timeout !== 'number') {
            device.connectOptions.scanParams.timeout = 1;
        }

        if (!device.connectOptions.connParams) {
            device.connectOptions.connParams = {};
        }

        if (typeof device.connectOptions.connParams.minConnInterval !== 'number') {
            device.connectOptions.connParams.minConnInterval = 7.5;
        }

        if (typeof device.connectOptions.connParams.maxConnInterval !== 'number') {
            device.connectOptions.connParams.maxConnInterval = 7.5;
        }

        if (typeof device.connectOptions.connParams.slaveLatency !== 'number') {
            device.connectOptions.connParams.slaveLatency = 0;
        }

        if (typeof device.connectOptions.connParams.connectionSupervisionTimeout !== 'number') {
            device.connectOptions.connParams.connectionSupervisionTimeout = 4000;
        }

        if (!device.connectOptions.security) {
            device.connectOptions.security = {};
        }

        if (typeof device.connectOptions.security.initiate !== 'boolean') {
            device.connectOptions.security.initiate = false;
        }

        if (typeof device.connectOptions.security.autoAccept !== 'boolean') {
            device.connectOptions.security.autoAccept = true;
        }

        if (!device.connectOptions.security.securityParams) {
            device.connectOptions.security.securityParams = {};
        }

        if (typeof device.connectOptions.security.securityParams.bond !== 'boolean') {
            device.connectOptions.security.securityParams.bind = false;
        }

        if (typeof device.connectOptions.security.securityParams.mitm !== 'boolean') {
            device.connectOptions.security.securityParams.mitm = false;
        }

        if (typeof device.connectOptions.security.securityParams.lesc !== 'boolean') {
            device.connectOptions.security.securityParams.lesc = false;
        }

        if (typeof device.connectOptions.security.securityParams.keypress !== 'boolean') {
            device.connectOptions.security.securityParams.keypress = false;
        }

        if (typeof device.connectOptions.security.securityParams.ioCaps !== 'string') {
            device.connectOptions.security.securityParams.ioCaps = 'none';
        }

        const deviceAddress = new BLEAddress();
        deviceAddress.address = device.address.address;
        deviceAddress.type = device.address.type;

        // TODO: convert msq to be equal to the Iris data model
        const scanParams = new BLEConnectionScanParams();
        scanParams.active = device.connectOptions.scanParams.active;
        scanParams.interval = device.connectOptions.scanParams.interval;
        scanParams.window = device.connectOptions.scanParams.window;
        scanParams.timeout = device.connectOptions.scanParams.timeout;

        const connParams = new BLEConnectionConnParams();

        connParams.minConnInterval = device.connectOptions.connParams.minConnInterval;
        connParams.maxConnInterval = device.connectOptions.connParams.maxConnInterval;
        connParams.slaveLatency = device.connectOptions.connParams.slaveLatency;
        connParams.connectionSupervisionTimeout = device.connectOptions.connParams.connectionSupervisionTimeout;

        const securityParams = new BLEConnectionSecurityParams();
        securityParams.bond = device.connectOptions.security.bond;
        securityParams.ioCaps = device.connectOptions.security.ioCaps;
        securityParams.keypress = device.connectOptions.security.keypress;
        securityParams.lesc = device.connectOptions.security.lesc;
        securityParams.mitm = device.connectOptions.security.mitm;

        const security = new BLEConnectionSecurity();
        security.autoAccept = device.connectOptions.security.autoAccept;
        security.initiate = device.connectOptions.security.initiate;
        security.securityParams = securityParams;

        const connectOptions = new BLEConnectionOptions();
        connectOptions.scanParams = scanParams;
        connectOptions.connParams = connParams;
        connectOptions.security = security;

        return new BLEDeviceConnectionDatabaseEntry(deviceAddress.address, deviceAddress, connectOptions, device);
    }

    private connectionDownListener(deviceConnection: BLEDeviceConnectionDatabaseEntry) {
        if (this.state.foundAttributes && this.state.foundAttributes[deviceConnection.address.address]) {
            delete this.state.foundAttributes[deviceConnection.address.address];
        }

        this.g2cDeviceDisconnected(deviceConnection);
        logger.info(`Device ${deviceConnection.address.address} disconnected.`);

        this.emitStatusUpdate();
    }

    private getGatewayTopics(): GatewayTopics {
        const gatewayBaseTopic = `${this.environmentStage}/${this.config.tenantId}/gateways/${this.config.gatewayId}`;

        return <GatewayTopics>{
            base: gatewayBaseTopic,
            gateway2Cloud: `${gatewayBaseTopic}/g2c`,
            cloud2Gateway: `${gatewayBaseTopic}/c2g`
        };
    }

    private getGenericInfo() {
        return this.genericInfo;
    }

    public setGenericInfo(info) {
        this.genericInfo = Object.assign(this.genericInfo, info);
    }

    private connectionDatabaseChangeListener(connections: BLEDeviceConnectionDatabaseEntry[]) {
        const currentConnections = new ShadowReported.BLEDeviceConnectionDatabase(connections);

        if (this.connectionsReported) {
            // Only report back to cloud if there is a difference between the current connections and the previously reported connections
            if (this.connectionsReported.equals(currentConnections) === false) {
                logger.debug(`The state of connections previously reported to nRF Cloud is not equal to current state. Reporting new state back to back-end.`);
                const updatedShadow = {
                    state: {
                        reported: {
                            statusConnections: util.deepCloneObject(currentConnections.statusConnections)
                        }
                    }
                };

                logger.debug(`Updating shadow attribute state.reported.statusConnections with this object:\n${JSON.stringify(currentConnections.statusConnections, null, 4)}`);
                logger.debug(`Previous shadow attribute state.reported.statusConnections object was:\n${JSON.stringify(this.connectionsReported.statusConnections, null, 4)}`);

                // Set this connectionsReported to compare againts for the next connection database change.
                this.connectionsReported = currentConnections;

                // Update shadow state document, start executing changes afterwards
                this.publish(`${this.shadowDataBaseTopic}/update`, updatedShadow);
            }
        } else {
            this.connectionsReported = currentConnections;
        }

        this.emit(CONNECTION_DATABASE_CHANGE, connections);
    }

    private connectionDatabaseRemovedListener(connection: BLEDeviceConnectionDatabaseEntry) {
        logger.info(`Removing keys for ${connection.address.address} since connection is deleted.`);
        this.deleteStoredKeySet(connection.address.address);
        this.emitStatusUpdate();
    }

    private async deviceDiscover(deviceConnection: BLEDeviceConnectionDatabaseEntry): Promise<void> {
        logger.debug(`Discovering with the following connection ${JSON.stringify(deviceConnection)}`);

        try {
            // Check if attributes are available already
            if (this.state.foundAttributes && this.state.foundAttributes[deviceConnection.address.address]) {
                logger.info(`Device ${deviceConnection.address.address} already discovered, no need to do device discovery.`);
                this.g2cDeviceDiscover(deviceConnection, this.state.foundAttributes[deviceConnection.address.address]);
            } else {
                const deviceAddress = BLEAddress.copy(deviceConnection.address);

                try {
                    const services = await this.adapterDriver.getAttributes(BLEAddress.copy(deviceAddress));
                    logger.info(`Connect and discovery of peripheral ${deviceAddress.toString()} complete.`);

                    if (!this.state.foundAttributes) {
                        this.state.foundAttributes = {};
                    }

                    this.state.foundAttributes[deviceConnection.address.address] = services;
                    this.g2cDeviceDiscover(deviceConnection, services);
                } catch (error) {
                    const text = `Connected to device ${deviceConnection.address.address} but an error occurred when discovering the device. ${GatewayAWS.errorToString(error)}`;
                    logger.info(text);
                    this.g2cError('N/A', text);
                }
            }
        } catch (error) {
            logger.error(`Error during discovery: ${error.description}`);
            this.g2cError('N/A', `Error during discovery: ${error.description}`);
        }

        this.emitStatusUpdate();
    }

    private connectionUpListener(deviceConnection: BLEDeviceConnectionDatabaseEntry) {
        this.g2cDeviceConnected(deviceConnection);
        this.deviceDiscover(deviceConnection);
    }

    private deleteStoredKeySet(address: string) {
        this.secKeySets.delete(address);
    }

    private addAdapterEventListener(event: string, func: any): void {
        // Check that listener does not exist from before
        if (this.adapterEventListeners[event] != null) {
            throw `Listener for adapter event ${event} already registered. Terminating.`;
        }

        const before = this.adapterDriver.listenerCount(event);
        this.adapterDriver.on(event as any, func);
        this.adapterEventListeners[event] = func;
        const after = this.adapterDriver.listenerCount(event);
        logger.debug(`GatewayAWS.adapterDriver listeners for event ${event} #${before}->${after}`);
    }

    private removeAdapterEventListeners(): void {
        Object.keys(this.adapterEventListeners).forEach(event => {
            const before = this.adapterDriver.listenerCount(event);
            this.adapterDriver.removeListener(event, this.adapterEventListeners[event]);
            const after = this.adapterDriver.listenerCount(event);
            logger.debug(`GatewayAWS.adapterDriver listeners for event ${event} #${before}->${after}`);
            delete this.adapterEventListeners[event];
        });
    }

    private addAdapterFactoryEventListener(event: string, func: any): void {
        // Check that listener does not exist from before
        if (this.adapterFactoryEventListeners[event] != null) {
            throw `Listener for adapter factory event ${event} already registered. Terminating.`;
        }

        this.adapterDriverFactory.on(event as any, func);
        this.adapterFactoryEventListeners[event] = func;
    }

    private removeAdapterFactoryListeners(): void {
        Object.keys(this.adapterFactoryEventListeners).forEach(event => {
            this.adapterDriverFactory.removeListener(event, this.adapterFactoryEventListeners[event]);
            delete this.adapterFactoryEventListeners[event];
        });
    }

    private async openAdapterInternal(): Promise<void> {
        const state = this.state;

        this.addAdapterEventListener('adapterError', adapterError => {
            this.g2cError('N/A', GatewayAWS.errorToString(adapterError)); // FIXME: convert this into a proper error document
        });

        this.addAdapterEventListener('adapterWarning', warning => {
            if (warning.message.includes('not supported')) {
                logger.warn(warning.message);
            } else {
                logger.info(warning.message);
            }
        });

        this.addAdapterEventListener('adapterStateChange', stateChanged => {
            this.state.adapter.scanning = stateChanged.scanning;
            this.state.adapter.connecting = stateChanged.connecting;
            this.state.adapter.available = stateChanged.available;

            this.state.adapter.bleEnabled = stateChanged.bleEnabled;

            logger.debug(`State change, adapter available: ${this.state.adapter.available}, BLE enabled: ${this.state.adapter.bleEnabled}, connecting: ${this.state.adapter.connecting}, scanning: ${this.state.adapter.scanning}.`);
            this.emitStatusUpdate();
        });

        this.addAdapterEventListener('deviceDiscovered', (discoveredDevice, scanTimeout) => {
            this.g2cScanResultInstant(discoveredDevice, scanTimeout);
        });

        this.addAdapterEventListener('devicesDiscovered', discoveredDevices => {
            this.g2cScanResultBatch(discoveredDevices);
        });

        this.addAdapterEventListener('characteristicValueChanged', e => this.characteristicValueChangedEventListener(e));
        this.addAdapterEventListener('descriptorValueChanged', e => this.descriptorValueChangedEventListener(e));


        const adapterFactoryErrorListener = error => {
            logger.error(`Error from adapter factory ${error.message}.`);
            this.g2cError('N/A', error); // TODO: convert this into a proper error document
        };
        this.addAdapterFactoryEventListener('error', adapterFactoryErrorListener);

        const adapterAddedListener = adapterAdded => {
            logger.debug(`Added adapter ${adapterAdded.id}.`);
        };
        this.addAdapterFactoryEventListener('added', adapterAddedListener);

        const adapterRemovedListener = async adapterRemoved => {
            if (this.adapter && this.adapter.id === adapterRemoved.id) {
                // TODO: if it is not the adapter we are using; ignore it. If it is the one we are using; inform cloud and ui
                logger.error(`Adapter ${adapterRemoved.id} removed! Stopping all operations.`);
                this.state.adapter.available = false;
                this.state.adapter.bleEnabled = false;
                this.emit(STATUS_UPDATE, util.deepCloneObject(state));
                await this.stop();
            }
        };

        this.addAdapterFactoryEventListener('removed', adapterRemovedListener);

        this.adapterDriver.setDefaultSecurityParameters(
            BLEConnectionSecurityParams.create(
                false,
                false,
                false,
                false,
                'none',
                7,
                16,
                false,
                {
                    enc: false,
                    link: false,
                    id: false,
                    sign: false
                },
                {
                    enc: false,
                    link: false,
                    id: false,
                    sign: false
                }
            )
        );

        try {
            await this.adapterDriver.open();
        } catch (openError) {
            this.state.adapter.available = false;
            this.state.adapter.bleEnabled = false;
            this.removeAdapterEventListeners();
            throw new Error(`Non-recoverable error opening adapter. Try to pull the dongle out and insert it again or power cycle if you have a development kit. ${openError}`);
        }
    }

    private publish(topic: string, g2c: any) {
        const message: string = JSON.stringify(g2c);

        if (topic.startsWith(this.shadowDataBaseTopic)) {
            logger.debug(`Publishing message on topic: ${topic}. Content:\n${JSON.stringify(g2c, null, 4)}`);
        }

        if (this.mqtt) {
            this.mqtt.publish(topic, message);
            this.state.messages.sent += 1;
            this.emitStatusUpdate();
        } else {
            logger.info('Not able to send message to nRF Cloud. Message discarded.');
        }
    }

    private characteristicValueChangedEventListener(event: AdapterDriverModel.ConnectionCharacteristicValueChangedEvent) {
        const connection = this.deviceConnectionDatabase.getDeviceConnection(event.address.address);

        if (!connection) {
            logger.info(`Characteristic value changed on device not found in device connection database. Device address is ${BLEAddress.copy(event.address)}.`);
            return;
        }

        this.g2cCharacteristicValueChanged(connection, util.AdapterDriverToBLEModel.convertCharacteristic(event.characteristic.path.split('/')[0], event.characteristic));
    }

    private descriptorValueChangedEventListener(event: AdapterDriverModel.ConnectionDescriptorValueChangedEvent) {
        const connection = this.deviceConnectionDatabase.getDeviceConnection(event.address.address);

        if (!connection) {
            logger.info(`Characteristic value changed on device not found in device connection database. Device address is ${BLEAddress.copy(event.address)}.`);
            return;
        }

        this.g2cDescriptorValueChanged(connection, event.descriptor);
    }
    messageId = 0;

    private publishG2C(g2c: any) {
        const topic: string = this.getGatewayTopics().gateway2Cloud;

        if (this.state.gateway.connected) {
            this.publish(topic, Object.assign(g2c, {messageId: this.messageId++}));
            logger.debug(`Publishing message on topic: ${topic}. Content:\n${JSON.stringify(g2c, null, 4)}`);
        } else {
            logger.info(`Not able to publish message to nRF Cloud since we are not connected.`);
        }
    }

    private g2cError(requestId: string, description: any, code?: number, deviceAddress?: BLEAddress) {
        let c: number;

        if (code === undefined) {
            c = -1;
        } else {
            c = code;
        }

        let desc: string;

        if (typeof description === 'object' && description !== null) {
            desc = JSON.stringify(description, null, 4);
        } else {
            desc = description;
        }

        const g2c = {
            requestId,
            type: 'event',
            gatewayId: this.config.gatewayId,
            event: {
                type: 'error',
                timestamp: new Date().toISOString(),
                error: {
                    description: desc,
                    code: c,
                },
                device: deviceAddress ? {address: deviceAddress} : undefined,
            },
        };

        this.publishG2C(g2c);
        this.state.messages.errorsSent += 1;
    }

    private g2cScanResultBatch(devicesFound: Array<AdapterDriverModel.DeviceDiscovered>) {
        const devices: Array<BLEDevice> = [];

        Object.keys(devicesFound).forEach(key => {
            devices.push(util.AdapterDriverToBLEModel.convertDeviceDiscovered(devicesFound[key]));
        });

        const event: ScanResultBatchEvent = new ScanResultBatchEvent(devices);
        this.publishG2C(new G2CEvent(this.state.scanRequestId !== null ? this.state.scanRequestId : 'N/A', this.config.gatewayId, event));
        this.state.scanRequestId = null;
        logger.info(`Sending batch scan result g2c. ${devices.length} devices found.`);
        this.emitStatusUpdate();
    }

    private g2cScanResultInstant(advScanData: AdapterDriverModel.DeviceDiscovered, timeout: boolean = false) {
        const device = util.AdapterDriverToBLEModel.convertDeviceDiscovered(advScanData);
        const event: ScanResultInstantEvent = new ScanResultInstantEvent(device != null ? [device] : [], timeout);
        this.publishG2C(new G2CEvent(this.state.scanRequestId !== null ? this.state.scanRequestId : 'N/A', this.config.gatewayId, event));
        this.state.scanRequestId = null;
    }

    private g2cDeviceConnected(deviceConnection: BLEDeviceConnectionDatabaseEntry) {
        const event: DeviceConnectResultEvent = new DeviceConnectResultEvent(deviceConnection);
        this.publishG2C(new G2CEvent('N/A', this.config.gatewayId, event));
        this.emitStatusUpdate();
    }

    private g2cDeviceDisconnected(deviceConnection: BLEDeviceConnectionDatabaseEntry) {
        const event: DeviceDisconnectedEvent = new DeviceDisconnectedEvent(deviceConnection);
        this.publishG2C(new G2CEvent('N/A', this.config.gatewayId, event));
        this.emitStatusUpdate();
    }

    private g2cDeviceDiscover(deviceConnection: BLEDeviceConnectionDatabaseEntry, services: Array<AdapterDriverModel.Service>) {
        const event: DeviceDiscoverEvent =
            new DeviceDiscoverEvent(deviceConnection, util.AdapterDriverToBLEModel.convertServices(services));

        this.publishG2C(new G2CEvent(this.state.deviceDiscoverRequestId, this.config.gatewayId, event));
        this.state.deviceDiscoverRequestId = null;
        this.emitStatusUpdate();
    }

    private g2cCharacteristicValueChanged(deviceConnection: BLEDeviceConnectionDatabaseEntry, characteristic: BLECharacteristic) {
        const event: CharacteristicValueChangedEvent =
            new CharacteristicValueChangedEvent(deviceConnection, characteristic);
        this.publishG2C(new G2CEvent('N/A', this.config.gatewayId, event));
    }

    private g2cCharacteristicValueRead(deviceConnection: BLEDeviceConnectionDatabaseEntry, characteristic: BLECharacteristic) {
        const event: CharacteristicValueReadEvent =
            new CharacteristicValueReadEvent(deviceConnection, characteristic);

        this.publishG2C(new G2CEvent(this.state.characteristicValueReadRequestId, this.config.gatewayId, event));
        this.state.characteristicValueReadRequestId = null;
        this.emitStatusUpdate();
    }

    private g2cCharacteristicValueWrite(deviceConnection: BLEDeviceConnectionDatabaseEntry, characteristic: BLECharacteristic) {

        const event: CharacteristicValueWriteEvent = new CharacteristicValueWriteEvent(deviceConnection, characteristic);

        this.publishG2C(new G2CEvent(this.state.characteristicValueWriteRequestId, this.config.gatewayId, event));
        this.state.characteristicValueWriteRequestId = null;
    }

    private g2cDescriptorValueChanged(deviceConnection: BLEDeviceConnectionDatabaseEntry, descriptor: BLEDescriptor) {
        const event: DescriptorValueChangedEvent =
            new DescriptorValueChangedEvent(deviceConnection, descriptor);

        this.publishG2C(new G2CEvent('N/A', this.config.gatewayId, event));
    }

    private g2cDescriptorValueRead(deviceConnection: BLEDeviceConnectionDatabaseEntry, descriptor: BLEDescriptor) {
        const event: DescriptorValueReadEvent =
            new DescriptorValueReadEvent(deviceConnection, descriptor);

        this.publishG2C(new G2CEvent(this.state.descriptorValueReadRequestId, this.config.gatewayId, event));
        this.state.descriptorValueReadRequestId = null;
    }

    private g2cDescriptorValueWrite(deviceConnection: BLEDeviceConnectionDatabaseEntry, descriptor: BLEDescriptor) {
        const event: DescriptorValueWriteEvent =
            new DescriptorValueWriteEvent(deviceConnection, descriptor);

        this.publishG2C(new G2CEvent(this.state.descriptorValueWriteRequestId, this.config.gatewayId, event));
        this.state.descriptorValueWriteRequestId = null;
        this.emitStatusUpdate();
    }

    private g2cGatewayStatus(msgId) {
        const event: GatewayStatusEvent =
            new GatewayStatusEvent(
                util.deepCloneObject(this.deviceConnectionDatabase.getDeviceConnections()),
                this.state.gateway
            );

        this.publishG2C(new G2CEvent(msgId, this.config.gatewayId, event));
    }

    private gatewayStatusOperation(msg) {
        this.g2cGatewayStatus(msg.id);
    }

    private getDeviceConnectionByDeviceAddress(deviceAddress: string, deviceAddressType: string): BLEDeviceConnectionDatabaseEntry {
        let retval: BLEDeviceConnectionDatabaseEntry;

        if (deviceAddressType === null) {
            retval = this.deviceConnectionDatabase.findConnectionByAddress(BLEAddress.create(deviceAddress, 'randomStatic'));

            if (!retval) {
                retval = this.deviceConnectionDatabase.findConnectionByAddress(BLEAddress.create(deviceAddress, 'public'));
            }
        } else {
            retval = this.deviceConnectionDatabase.findConnectionByAddress(BLEAddress.create(deviceAddress, deviceAddressType));
        }

        return retval;
    }

    private getAttribute(deviceAddress: string, attributePath: string): any {
        const state = this.state;

        if (!state.foundAttributes || !state.foundAttributes[deviceAddress]) {
            return null;
        }

        const foundAttributes = state.foundAttributes[deviceAddress];
        return util.findAttributeByPath(foundAttributes, attributePath);
    }

    private static errorToString(error: any): String {
        let message: string;

        switch (typeof error) {
            case 'object':
                if (error !== null) {
                    message = JSON.stringify(error);
                } else {
                    message = 'Unknown error';
                }
                break;
            case 'string':
                message = error;
                break;
        }

        logger.debug(message);
        return error;
    }

    private async characteristicValueWriteOperation(msg): Promise<void> {
        if (!this.assertAdapterConnected(true, msg.id)) {
            return;
        }

        const op = msg.operation;
        this.state.characteristicValueWriteRequestId = msg.id;
        this.emitStatusUpdate();

        const deviceAddress = op.deviceAddress;
        const serviceUUID = op.serviceUUID;
        const characteristicUUID = op.characteristicUUID;
        const characteristicValue = op.characteristicValue;

        // FIXME: add address type
        const connection = this.getDeviceConnectionByDeviceAddress(deviceAddress, null);

        if (!connection) {
            const message = `Not able to write a characteristic value to device ${deviceAddress} since the device does not exist in the database.`;
            logger.info(message);
            this.g2cError(msg.id, message);
            return;
        }

        const characteristicPath = `${serviceUUID}/${characteristicUUID}`;
        const characteristic: AdapterDriverModel.Characteristic = this.getAttribute(deviceAddress, characteristicPath);

        if (!characteristic) {
            this.g2cError(msg.id, `Device characteristic with path ${characteristicPath} not found for ${deviceAddress}.`);
            return;
        }

        const ack = true;

        try {
            await this.adapterDriver.writeCharacteristicValue(connection.address as BLEAddress, characteristic, characteristicValue, ack);
            this.g2cCharacteristicValueWrite(
                connection,
                util.AdapterDriverToBLEModel.convertCharacteristic(characteristicPath, characteristic)
            );
        } catch (error) {
            logger.error(error);
            this.g2cError(
                msg.id,
                `Error writing characteristic value ${characteristicPath} to device connection  ${deviceAddress}. Error is ${GatewayAWS.errorToString(error)}.`,
                null,
                BLEAddress.copy(connection.address)
            );
        }
    }

    private async characteristicValueReadOperation(msg): Promise<void> {
        if (!this.assertAdapterConnected(true, msg.id)) {
            return;
        }

        const op = msg.operation;
        this.state.characteristicValueReadRequestId = msg.id;
        this.emitStatusUpdate();

        const deviceAddress = op.deviceAddress;
        const serviceUUID = op.serviceUUID;
        const characteristicUUID = op.characteristicUUID;

        const connection = this.getDeviceConnectionByDeviceAddress(deviceAddress, null);

        if (!connection) {
            const message = `Not able to read a characteristic value from device ${deviceAddress} since the device does not exist in the database.`;
            logger.info(message);
            this.g2cError(msg.id, message);
            return;
        }

        const characteristicPath = `${serviceUUID}/${characteristicUUID}`;
        const characteristic: AdapterDriverModel.Characteristic = this.getAttribute(deviceAddress, characteristicPath);

        if (!characteristic) {
            this.g2cError(msg.id, `Device characteristic with path ${characteristicPath} not found for ${deviceAddress}.`);
            return;
        }

        try {

            // Update the value in the characteristic since it is not updated in the pc-ble-driver-js cache.
            characteristic.value = await this.adapterDriver.readCharacteristicValue(connection.address as BLEAddress, characteristic);
            this.g2cCharacteristicValueRead(
                connection,
                util.AdapterDriverToBLEModel.convertCharacteristic(characteristicPath, characteristic)
            );
        } catch (error) {
            logger.error(error);
            this.g2cError(
                msg.id,
                `Error reading characteristic value ${characteristicPath} on peripheral ${deviceAddress}. Error is ${GatewayAWS.errorToString(error)}.`,
                null,
                BLEAddress.copy(connection.address)
            );
        }
    }

    private async descriptorValueWriteOperation(msg): Promise<void> {
        if (!this.assertAdapterConnected(true, msg.id)) {
            return;
        }

        const op = msg.operation;
        const state: State = this.state;

        state.descriptorValueWriteRequestId = msg.id;
        this.emitStatusUpdate();

        const deviceAddress = op.deviceAddress;
        const serviceUUID = op.serviceUUID;
        const characteristicUUID = op.characteristicUUID;
        const descriptorUUID = op.descriptorUUID;
        const descriptorValue = op.descriptorValue;

        // FIXME: add device address type
        const connection = this.getDeviceConnectionByDeviceAddress(deviceAddress, null);

        if (!connection) {
            const message = `Not able to write a descriptor value to device ${deviceAddress} since the device does not exist in the database.`;
            logger.info(message);
            this.g2cError(msg.id, message);
            return;
        }

        const descriptorPath = `${serviceUUID}/${characteristicUUID}/${descriptorUUID}`;
        const descriptor: AdapterDriverModel.Descriptor = this.getAttribute(deviceAddress, descriptorPath);

        if (!descriptor) {
            this.g2cError(msg.id, `Device descriptor with path ${descriptorPath} not found for ${deviceAddress}.`);
            return;
        }

        const ack = true;

        try {
            await this.adapterDriver.writeDescriptorValue(connection.address as BLEAddress, descriptor, descriptorValue, ack);
            this.g2cDescriptorValueWrite(
                connection,
                util.AdapterDriverToBLEModel.convertDescriptor(descriptorPath, descriptor)
            );
        } catch (error) {
            logger.error(error);

            this.g2cError(
                msg.id,
                `Error writing descriptor value ${descriptorValue} to device ${deviceAddress}, service ${serviceUUID}, characteristic ${characteristicUUID}, descriptor ${descriptorUUID}. Error is ${GatewayAWS.errorToString(error)}.`,
                null,
                BLEAddress.copy(connection.address));
        }
    }

    private async descriptorValueReadOperation(msg): Promise<void> {
        if (!this.assertAdapterConnected(true, msg.id)) {
            return;
        }

        const op = msg.operation;
        const state: State = this.state;
        state.descriptorValueReadRequestId = msg.id;
        this.emitStatusUpdate();

        const deviceAddress = op.deviceAddress;
        const serviceUUID = op.serviceUUID;
        const characteristicUUID = op.characteristicUUID;
        const descriptorUUID = op.descriptorUUID;

        // FIXME: add address type
        const connection = this.getDeviceConnectionByDeviceAddress(deviceAddress, null);

        if (!connection) {
            const message = `Not able to write a descriptor value to device ${deviceAddress} since the device does not exist in the database.`;
            logger.info(message);
            this.g2cError(msg.id, message);
            return;
        }

        const descriptorPath = `${serviceUUID}/${characteristicUUID}/${descriptorUUID}`;
        const descriptor: AdapterDriverModel.Descriptor = this.getAttribute(deviceAddress, descriptorPath);

        if (!descriptor) {
            this.g2cError(
                msg.id,
                `Device descriptor with path ${descriptorPath} not found for ${deviceAddress}.`,
                null,
                BLEAddress.copy(connection.address)
            );
            return;
        }

        try {
            // Update the value in the descriptor since it is not updated in the pc-ble-driver-js cache.
            descriptor.value = await this.adapterDriver.readDescriptorValue(connection.address as BLEAddress, descriptor);
            this.g2cDescriptorValueRead(connection, util.AdapterDriverToBLEModel.convertDescriptor(descriptorPath, descriptor));
        } catch (error) {
            logger.error(error);
            this.g2cError(msg.id, `Unknown read descriptor value read: ${error}`);
        }
    }

    private async deviceDiscoverOperation(msg): Promise<void> {
        if (!this.assertAdapterConnected(true, msg.id)) {
            return;
        }

        const op = msg.operation;
        const deviceAddress = op.deviceAddress;

        const deviceConnection = this.deviceConnectionDatabase.getDeviceConnection(deviceAddress);

        if (!deviceConnection) {
            const text = `Peripheral connection for peripheral ${deviceAddress} does not exist`;
            logger.info(text);
            this.g2cError(op.messageId, text);
            return;
        }

        await this.deviceDiscover(deviceConnection);
    }

    private async scanOperation(msg): Promise<void> {
        if (!this.assertAdapterConnected(true, msg.id)) {
            return;
        }

        const op = msg.operation;
        const state: State = this.state;

        state.scanRequestId = msg.id;
        this.emitStatusUpdate();

        try {
            const scanParams = {
                active: false,
                interval: 100,
                window: 100,
                timeout: 10,
                scanType: op.scanType || 0,
            };

            scanParams.timeout = op.scanTimeout;
            scanParams.interval = op.scanInterval;

            if (op.scanMode !== undefined && op.scanMode !== null) {
                scanParams.active = op.scanMode === 'active';
            }

            state.scanReportingMode = op.scanReporting;

            // Filter advertisement packets to send g2c
            if (op.filter !== undefined && op.filter.rssi !== undefined && op.filter.rssi !== null) {
                state.filter.rssi = op.filter.rssi;
            } else {
                state.filter.rssi = null;
            }

            if (op.filter !== undefined && op.filter.name !== undefined && op.filter.name !== null) {
                state.filter.name = op.filter.name;
            } else {
                state.filter.name = null;
            }

            logger.info('Starting scanning for peripherals.');

            await this.adapterDriver.startScan(
                scanParams.active,
                scanParams.interval,
                scanParams.window,
                scanParams.timeout,
                state.scanReportingMode === 'batch',
                state.filter.rssi,
                state.filter.name,
                scanParams.scanType,
            );
        } catch (error) {
            logger.error(error);
            this.g2cError(msg.id, GatewayAWS.errorToString(error));
        }
    }

    private static deviceConnectOperation() {
        logger.warn('deviceConnectOperation is not supported anymore. Please use database instead.');
    }

    private static deviceDisconnectOperation() {
        logger.warn('deviceDisconnectionOperation is not supported anymore. Please use database instead.');
    }

    private async deleteYourselfOperation(): Promise<void> {
        try {
            await this.stop();

            if (this.deviceConnectionDatabase) {
                this.deviceConnectionDatabase.clearDatabase();
            }
        } catch (error) {
            logger.error(`Error deleting or stopping gateway.${error}.`);
        }

        if (this.configFilename !== null) {
            try {
                await this.fsAdapter.unlink(this.configFilename);
            } catch (error) {
                logger.debug(`Error deleting credentials and config.${error}`);
            }

            this.config.clientCert = null;
            this.config.privateKey = null;

            // Clear the internal state by providing a default state
            this.state = new State(this.config.platform, this.config.version);
            this.secKeySets = new Map<string, any>();

            logger.info(`Deleted myself and disconnected from nRF Cloud.`);
            this.emit(DELETEDMYSELF);

            await this.disconnectFromCloud();
        } else {
            logger.error('No credentials to delete.');
        }
    }

    debug(): any {
        const retval: any = {};
        retval.events = {};
        retval.events.gateway = {};

        this.eventNames().forEach(event => {
            retval.events.gateway[event] = this.listenerCount(event);
        });

        if (this.adapterDriver) {
            retval.adapterDriver = this.adapterDriver.debug();
        }

        return retval;
    }
}
