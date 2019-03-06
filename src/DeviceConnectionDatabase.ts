'use strict';

import {
    BLEAddress,
    BLEDeviceConnectionStatistics,
    BLEDeviceConnectionDatabaseEntry,
    BLEDeviceAuthStatus
} from './model/g2c';

import {
    IAdapterDriver,
    AdapterState
} from './AdapterDriver';

import {
    Address,
    ConnectionUpEvent,
    ConnectionDownEvent,
    ConnectTimedOutEvent,
    ConnectCanceledEvent,
    ConnectionErrorEvent,
    ConnectionSecurityRequestEvent,
    ConnectionAuthenticationStatusEvent,
    ConnectionSecurityParametersRequestEvent,
    ConnectionOptions, ConnectionSecurityParams, DeviceDiscovered,
} from './AdapterDriverModel';

import {
    deepCloneObject
} from './GatewayUtil';

import {
    EventEmitter
} from 'events';

import * as wlogger from 'winston';

let logger = wlogger;

export interface IDeviceConnectionDatabase extends EventEmitter {
    updateDeviceConnections(deviceConnections: BLEDeviceConnectionDatabaseEntry[]): Promise<void>;

    getDeviceConnection(deviceId: string): BLEDeviceConnectionDatabaseEntry | null;

    getDeviceConnections(): BLEDeviceConnectionDatabaseEntry[];

    start(): Promise<void>;

    stop(): Promise<void>;

    clearDatabase(): void;

    findConnectionByAddress(address: BLEAddress): BLEDeviceConnectionDatabaseEntry | null;

    on(event: 'databaseChange', listener: (connections: BLEDeviceConnectionDatabaseEntry[]) => void): this;

    on(event: 'connectionUp', listener: (connection: BLEDeviceConnectionDatabaseEntry) => void): this;

    on(event: 'connectionDown', listener: (connection: BLEDeviceConnectionDatabaseEntry) => void): this;

    on(event: 'connectionRemoved', listener: (connection: BLEDeviceConnectionDatabaseEntry) => void): this;

    debug(): string;
}

// Events
const CONNECTION_REMOVED = 'connectionRemoved';
const DATABASE_CHANGE = 'databaseChange';
const CONNECTION_UP = 'connectionUp';
const CONNECTION_DOWN = 'connectionDown';

export class DeviceConnectionDatabase extends EventEmitter implements IDeviceConnectionDatabase {
    adapterDriver: IAdapterDriver;
    deviceConnections: BLEDeviceConnectionDatabaseEntry[];
    connectInterval: number;
    connectTimer: NodeJS.Timer | null;
    previousAdapterState: AdapterState;
    started: boolean;
    adapterEventListeners: any;
    connectIndex: number;

    // Listeners

    constructor(adapter: IAdapterDriver, connectInterval: number, newLogger?: any) {
        super();
        this.adapterDriver = adapter;
        this.deviceConnections = [];
        this.connectInterval = connectInterval;
        this.connectTimer = null;
        this.previousAdapterState = null;
        this.started = false;
        this.adapterEventListeners = {};
        this.connectIndex = 0;

        if (newLogger) {
            logger = newLogger;
        }
    }

    private addAdapterEventListeners() {
        this.addAdapterEventListener('deviceUpdate', event => this.deviceStatusUpdate(event));
        this.addAdapterEventListener('connectionDown', event => this.deviceConnectionDown(event));
        this.addAdapterEventListener('connectionUp', event => this.deviceConnectionUp(event));
        this.addAdapterEventListener('connectTimedOut', event => this.deviceConnectTimedOut(event));
        this.addAdapterEventListener('connectCanceled', event => this.deviceConnectCanceled(event));
        this.addAdapterEventListener('connectionError', event => this.deviceConnectionError(event));
        this.addAdapterEventListener('connectionSecurityRequest', event => this.deviceConnectionSecurityRequest(event));
        this.addAdapterEventListener('connectionSecurityParametersRequest', event => this.deviceConnectionSecurityParametersRequest(event));
        this.addAdapterEventListener('connectionAuthenticationStatus', event => this.deviceConnectionAuthenticationStatus(event));
        this.addAdapterEventListener('adapterStateChange', event => this.adapterStateChange(event));
    }

    private addAdapterEventListener(event: string, func: any): void {
        // Check that listener does not exist from before
        if (this.adapterEventListeners[event] != null) {
            throw `Listener for event ${event} already registered. Terminating.`;
        }

        const before = this.adapterDriver.listenerCount(event);
        this.adapterDriver.on(event as any, func);
        this.adapterEventListeners[event] = func;
        const after = this.adapterDriver.listenerCount(event);
        logger.debug(`DeviceConnectionDatabase.adapterDriver listeners for event ${event} #${before}->${after}`);
    }

    private removeAdapterEventListeners(): void {
        Object.keys(this.adapterEventListeners).forEach(event => {
            const before = this.adapterDriver.listenerCount(event);
            this.adapterDriver.removeListener(event, this.adapterEventListeners[event]);
            const after = this.adapterDriver.listenerCount(event);
            logger.debug(`DeviceConnectionDatabase.adapterDriver listeners for event ${event} #${before}->${after}`);
            delete this.adapterEventListeners[event];
        });
    }

    async start(): Promise<void> {
        if (this.started) {
            return;
        }

        if (this.adapterDriver == null) {
            throw new Error(`Adapter must be set before starting device connection database.`);
        }

        if (this.adapterDriver.getState().bleEnabled) {
            throw new Error(`Device connection database needs to be started before adapter driver is running BLE`);
        }

        this.clearDatabase();
        this.addAdapterEventListeners();
        this.started = true;
    }

    async stop(): Promise<void> {
        if (!this.started) {
            return;
        }

        this.removeAdapterEventListeners();

        if (this.deviceConnections) {
            this.deviceConnections.forEach(deviceConnection => {
                deviceConnection.status.connected = false;
            });
        }

        this.emitChangeInDatabase();
        await this.establishConnections(false);

        // From now on we do not know the state of the adapterDriver since we are not receiving those events
        this.previousAdapterState = null;
        this.started = false;
    }

    // Sends in a list of connections, returns when connections are actually established/disconnected
    async updateDeviceConnections(peripheralConnections: BLEDeviceConnectionDatabaseEntry[]): Promise<void> {
        if (peripheralConnections == null) {
            return;
        }

        const existingKeys: string[] = [];
        const desiredKeys: string[] = [];

        for (let existingDevice in this.deviceConnections) {
            existingKeys.push(this.deviceConnections[existingDevice].id);
        }

        for (let newDevice in peripheralConnections) {
            desiredKeys.push(peripheralConnections[newDevice].id);
        }

        const newPeripheralsToAdd = desiredKeys.filter(value => {
            return existingKeys.indexOf(value) === -1;
        });

        const devicesToRemove = existingKeys.filter(value => {
            return desiredKeys.indexOf(value) === -1;
        });

        logger.debug(`Connections to add: ${newPeripheralsToAdd.length}, Connections to remove (promises): ${devicesToRemove.length}`);

        for (const deviceToRemove of devicesToRemove) {
            const connectionToRemove = this.getDeviceConnection(deviceToRemove);

            try {
                await this.adapterDriver.disconnect(connectionToRemove.address);
            } catch (error) {
                logger.error('error', `Error removing connection to device ${error instanceof Object ? JSON.stringify(error) : error}`);
            } finally {
                const connectionToRemoveIndex = this.deviceConnections.findIndex(connection => {
                    return connection.id === deviceToRemove;
                });

                if (connectionToRemoveIndex === -1) {
                    logger.info('Trying to remove a connection that is not part of the database');
                } else {
                    const connectionToRemove = this.deviceConnections[connectionToRemoveIndex];

                    this.deviceConnections.splice(connectionToRemoveIndex, 1);
                    this.emitChangeInDatabase();
                    this.emit(CONNECTION_REMOVED, deepCloneObject(connectionToRemove));
                }
            }
        }

        for (const peripheralToUpdate of peripheralConnections) {
            if (existingKeys.indexOf(peripheralToUpdate.id) === -1) {
                this.addDeviceConnection(peripheralToUpdate); // don't have it already
            } else {
                this.updateDeviceConnection(peripheralToUpdate);
            }
        }

        this.emitChangeInDatabase();
    }

    getDeviceConnection(deviceId: string): BLEDeviceConnectionDatabaseEntry | null {
        const connection: BLEDeviceConnectionDatabaseEntry = this.deviceConnections.find(c => {
            return deviceId === c.id;
        });

        if (connection == null) {
            return null;
        }

        return connection;
    }

    getDeviceConnections(): BLEDeviceConnectionDatabaseEntry[] {
        return this.deviceConnections;
    }

    private adapterDisconnected(): void {
        const connections = this.getDeviceConnections();

        connections.forEach(connection => {
            connection.status.connected = false;
        });

        this.emitChangeInDatabase();
    }


    findConnectionByAddress(address: Address): BLEDeviceConnectionDatabaseEntry | null {
        const connection: BLEDeviceConnectionDatabaseEntry = this.deviceConnections.find(c => {
            if (c.address.address === address.address) {
                // If address type argument is undefined or null, do not compare against address type
                // This is actually a hack, due to the fact that instanceIds do not contain address type
                if (address.type == null) {
                    return true;
                }

                if (c.address.type === address.type) {
                    return true;
                }
            }

            return false;
        });

        if (connection == null) {
            return null;
        }

        return connection;
    }

    clearDatabase(): void {
        this.deviceConnections = [];
        this.emitChangeInDatabase();
    }

    private async doConnectionEstablishment(): Promise<void> {
        if (this.deviceConnections && this.deviceConnections.length > 0) {
            const connections = this.deviceConnections.filter(deviceConnection => {
                return deviceConnection.status.connected === false && deviceConnection.status.connecting === false;
            });

            if (connections.length === 0) {
                return;
            }

            if (this.connectIndex >= connections.length) {
                this.connectIndex = 0;
            }

            const connection = connections[this.connectIndex++];

            logger.debug(`${connections.length} connections are down. Trying to connect to ${connection.address.address}/${connection.address.type} first.`);

            if (connection.status.connecting) {
                logger.debug(`Connection to ${connection.address.address}/${connection.address.type} already in progress.`);
                return;
            }

            try {
                connection.status.connecting = true;
                const address = await this.adapterDriver.connect(connection.address as Address, connection.connectOptions as ConnectionOptions);
                // DeviceConnectionDatabase.updateDeviceConnectionEntry(connection, true, false);
                logger.info(`Successfully connected to peripheral ${address.address}/${address.type}.`);
            } catch (error) {
                logger.info(`Connect to peripheral ${connection.address.address}/${connection.address.type} failed. ${error instanceof Object ? JSON.stringify(error) : error}`);
                // We do not care about errors, we typically get Could not connect. Connection procedure timed out." which we already
                // have processed in the this.adapterDriver.connect callback.
            } finally {
                connection.status.connecting = false;
            }
        } else {
            return;
        }
    }

    private async establishConnections(enable: boolean): Promise<void> {
        if (enable) {
            await this.startConnectionEstablishment(this.connectInterval);
            logger.debug(`Connection establishment enabled with interval ${this.connectInterval}`);
        } else {
            await this.startConnectionEstablishment(0);
            logger.debug(`Connection establishment cancelled.`);
        }
    }

    private startConnectionEstablishment(connectInterval: number): Promise<void> {
        return new Promise<void>(resolve => {
            if (connectInterval === 0) {
                logger.debug(`Stopping connect functionality since connect interval is ${connectInterval}.`);

                if (this.connectTimer != null) {
                    clearInterval(this.connectTimer);
                    this.connectTimer = null;
                }
                resolve();
                return;
            }

            // If the connectTimer is already running, return
            if (this.connectTimer != null) {
                resolve();
                return;
            }

            this.connectTimer = setInterval(async () => {
                if (!this.adapterDriver) {
                    logger.warn(`BLE adapter not set.`);
                    return;
                }

                if (this.adapterDriver.getState().connecting) {
                    // Skip this interval since a connect is already in progress.
                    return;
                }

                if (!this.adapterDriver.getState()) {
                    logger.warn('BLE adapter state not found.');
                    return;
                }

                if (!this.adapterDriver.getState().available) {
                    logger.warn(`BLE adapter not available.`);
                    return;
                }

                if (!this.adapterDriver.getState().bleEnabled) {
                    logger.warn(`BLE adapter not in a state where it can connect to devices.`);
                    return;
                }

                try {
                    await this.doConnectionEstablishment();
                } catch (error) {
                    logger.error(`Error running connect procedure ${JSON.stringify(error)}.`);
                }
            }, connectInterval);

            resolve();
        });
    }

    private addDeviceConnection(connection: BLEDeviceConnectionDatabaseEntry) {
        this.deviceConnections.push(connection);
    }

    private updateDeviceConnection(connection: BLEDeviceConnectionDatabaseEntry) {
        const index = this.deviceConnections.findIndex((conn) => conn.id === connection.id);
        if (index > -1) {
            this.deviceConnections[index].raw = connection.raw; //we really only care about the raw values.
        } else {
            this.addDeviceConnection(connection);
        }
    }

    private emitChangeInDatabase(): void {
        this.emit(DATABASE_CHANGE, deepCloneObject(this.deviceConnections));
    }

    private static updateDeviceConnectionEntry(connection: BLEDeviceConnectionDatabaseEntry, connected: boolean, connectTimedOut: boolean): void {
        connection.status.connected = connected;

        if (connected) {
            connection.status.connecting = false;
        }

        if (connectTimedOut === true) {
            connection.status.connectTimedOut = true;
            connection.status.connected = false;
        } else {
            connection.status.connectTimedOut = false;

            if (connection.statistics === null) {
                connection.statistics = new BLEDeviceConnectionStatistics();
            }

            if (connected) {
                connection.statistics.connectCount++;
                connection.statistics.lastConnect = new Date().toISOString();
            } else {
                connection.statistics.disconnectCount++;
                connection.statistics.lastDisconnect = new Date().toISOString();
            }
        }
    }

    private deviceConnectionUp(event: ConnectionUpEvent) {
        logger.debug(`ConnectionUpEvent: ${JSON.stringify(event)}`);

        if (event) {
            const connection = this.findConnectionByAddress(event.address);

            if (connection) {
                DeviceConnectionDatabase.updateDeviceConnectionEntry(connection, true, false);
                this.emitChangeInDatabase();
                this.emit(CONNECTION_UP, deepCloneObject(connection));

                if (connection.connectOptions
                    && connection.connectOptions.security
                    && connection.connectOptions.security.initiate) {

                    logger.info(`Initiating authentication to device ${connection.address.toString()}.`);

                    this.adapterDriver.authenticate(BLEAddress.copy(connection.address), <ConnectionSecurityParams>{
                        bond: false,
                        ioCaps: 'none',
                        lesc: false,
                        mitm: false,
                        oob: false,
                        keypress: false,
                        minKeySize: 7,
                        maxKeySize: 16,
                        kdistPeer: {
                            id: false,
                            link: false,
                            enc: false,
                            sign: false
                        },
                        kdistOwn: {
                            id: false,
                            link: false,
                            enc: false,
                            sign: false
                        }
                    }).catch(error => {
                        logger.error(error);
                    });
                }
            } else {
                logger.error(`In connection up event, connection to peripheral ${event.address.toString()} not found in database.`);
            }
        }
    }

    private deviceConnectionDown(event: ConnectionDownEvent) {
        if (event != null) {
            const connection = this.findConnectionByAddress(event.address);

            if (connection !== null) {
                DeviceConnectionDatabase.updateDeviceConnectionEntry(connection, false, false);
                this.emitChangeInDatabase();
                this.emit(CONNECTION_DOWN, deepCloneObject(connection));
            } else {

                logger.error(`In connection down event, connection for peripheral ${event.address.address} not found in database.`);
            }
        }
    }

    private deviceStatusUpdate(event: DeviceDiscovered) {
        if (event !== null) {
            const connection = this.findConnectionByAddress(event.address);
            if (connection !== null) {
                connection.deviceName = event.name;
                connection.statistics.rssi = event.rssi;
                this.emitChangeInDatabase();
            }
        }
    }

    private deviceConnectTimedOut(event: ConnectTimedOutEvent) {
        if (event != null) {
            const connection = this.findConnectionByAddress(event.address);

            if (connection !== null) {
                DeviceConnectionDatabase.updateDeviceConnectionEntry(connection, false, true);
                this.emitChangeInDatabase();
            } else {
                logger.error(`In connect timed out event, connection to peripheral ${event.address.toString()} not found in database.`);
            }
        }
    }

    private deviceConnectCanceled(event: ConnectCanceledEvent) {
        if (event) {
            const connection = this.findConnectionByAddress(event.address);

            if (connection) {
                DeviceConnectionDatabase.updateDeviceConnectionEntry(connection, false, false);
                this.emitChangeInDatabase();
            } else {
                logger.error(`In connection canceled event, connection to peripheral ${event.address.toString()} not found in database.`);
            }
        }
    }

    private deviceConnectionError(event: ConnectionErrorEvent) {
        if (event != null) {
            const connection = this.findConnectionByAddress(event.address);

            if (connection != null) {
                this.emitChangeInDatabase();
            } else {
                logger.error(`In connection error event, connection to peripheral ${event.address.toString()} not found in database.`);
            }
        }
    }

    private deviceConnectionAuthenticationStatus(event: ConnectionAuthenticationStatusEvent): void {
        if (event != null) {
            const connection = this.findConnectionByAddress(event.address);

            if (!connection) {
                logger.error(`Getting authentication status for a device connection that does not exist.`);
                return;
            }

            if (!connection.status.auth) {
                connection.status.auth = BLEDeviceAuthStatus.copy(event.status);
            }

            this.emitChangeInDatabase();
        } else {
            logger.error(`Received device connection authentication status without any event.`);
        }
    }

    private async deviceConnectionSecurityRequest(event: ConnectionSecurityRequestEvent): Promise<void> {
        if (event != null) {
            const connection = this.findConnectionByAddress(event.address);

            if (!connection) {
                logger.error(`Getting security request for a device connection that does not exist.`);
                return;
            }

            logger.info(`Got a security request from ${connection.address.toString()}. The peer supports ${event.securityParams.toString()}.`);

            try {
                await this.adapterDriver.authenticate(event.address, <ConnectionSecurityParams>{
                    bond: false,
                    ioCaps: 'none',
                    lesc: false,
                    mitm: false,
                    oob: false,
                    keypress: false,
                    minKeySize: 7,
                    maxKeySize: 16,
                    kdistPeer: {
                        id: false,
                        link: false,
                        enc: false,
                        sign: false
                    },
                    kdistOwn: {
                        id: false,
                        link: false,
                        enc: false,
                        sign: false
                    }
                });
            } catch (error) {
                logger.error(`Error replying with security parameters ${error instanceof Object ? JSON.stringify(error) : error}`);
            }
        } else {
            logger.error(`Received device connection security request without any event.`);
        }
    }

    private async deviceConnectionSecurityParametersRequest(event: ConnectionSecurityParametersRequestEvent): Promise<void> {
        if (event != null) {
            const connection = this.findConnectionByAddress(event.address);

            if (!connection) {
                logger.error(`Getting security parameters request for a device connection that does not exist.`);
                return;
            }

            try {
                await this.adapterDriver.securityParametersReply(event.address, 'success', null);
            } catch (error) {
                logger.error(`Error replying to security parameters request ${error instanceof Object ? JSON.stringify(error) : error}`);
            }
        } else {
            logger.error(`Received device connection security request without any event.`);
        }
    }

    private async adapterStateChange(event: AdapterState): Promise<void> {
        const currentEvent = JSON.parse(JSON.stringify(event));

        if (currentEvent.bleEnabled === true
            && ((this.previousAdapterState && this.previousAdapterState.bleEnabled === false)
                || !this.previousAdapterState)) {
            logger.debug('Starting connection establishment since adapter has become available.');
            await this.establishConnections(true);
        } else if (currentEvent.bleEnabled === false
            && ((this.previousAdapterState && this.previousAdapterState.bleEnabled === true)
                || !this.previousAdapterState)
        ) {
            logger.debug('Stopping connection establishment since adapter is not available.');
            await this.establishConnections(false);
        }

        if (currentEvent.available === false) {
            this.adapterDisconnected();
        }

        this.previousAdapterState = currentEvent;
    }

    debug(): string {
        const eventsToDebug = [
            'databaseChange',
            'connectionUp',
            'connectionDown',
            'connectionRemoved'
        ];

        const f = event => {
            return `${event}:${this.listenerCount(event)}`;
        };

        let retval = 'DeviceConnectionDatabase (';

        eventsToDebug.forEach(event => {
            retval += `${f(event)}`;
        });

        retval += ')';

        return retval;
    }
}
