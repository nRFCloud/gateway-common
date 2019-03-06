'use strict';

import * as events from 'events';

import {
    Address,
    ConnectionDownEvent,
    ConnectionUpEvent,
    ConnectTimedOutEvent,
    ConnectionErrorEvent,
    ConnectionOptions,
    ConnectCanceledEvent,
    ConnectionSecurityParams,
    ConnectionSecurityRequestEvent,
    ConnectionSecurityParametersRequestEvent,
    ConnectionAuthenticationStatusEvent,
    ConnectionCharacteristicValueChangedEvent,
    ConnectionDescriptorValueChangedEvent,
    Service,
    Characteristic,
    Descriptor,
    DeviceDiscovered,
    AdapterError,
    AdapterWarning,
    ErrorEvent,
} from './AdapterDriverModel';

export interface IAdapterDriverListeners {
}

export interface AdapterState {
    available: boolean;
    bleEnabled: boolean;
    scanning: boolean;
    advertising: boolean;
    connecting: boolean;
}

export enum ScanType {
    Regular = 0,
    Beacon = 1,
}

/**
 * @description Driver Adapter that abstracts away the BLE Adapter.
 */
export interface IAdapterDriver extends IAdapterDriverListeners, events.EventEmitter {
    open(): Promise<void>;

    close(): Promise<void>;

    reset(): Promise<void>;

    connect(connection: Address, connectOptions: ConnectionOptions): Promise<Address>;

    disconnect(connection: Address): Promise<void>;

    watchDevices(connections: string[]): Promise<string[]>;

    unwatchDevices(connections: string[]): Promise<string[]>;

    cancelConnect(): Promise<void>;

    /**
     * Start authentication towards peer
     */
    authenticate(connection: Address, securityParameters: ConnectionSecurityParams): Promise<void>;

    /**
     * Reply to a security parameter request
     */
    securityParametersReply(connection: Address, status: string, securityParameters: ConnectionSecurityParams): Promise<void>;

    /**
     * Set default security parameters
     */
    setDefaultSecurityParameters(securityParameters: ConnectionSecurityParams): void;

    sendPasskey(connection: Address, keyType: string, key: string): Promise<void>;

    /**
     * Starts scanning for devices
     * @param active Active scanning
     * @param interval Scan interval
     * @param window Scan window
     * @param timeout Scan timeout
     * @param batch Batch up scan reports until scan has timed out
     * @param rssi RSSI value threshold, values lower than threadhold will be discarded
     * @param name Filter on advertised name
     * @param scanType Type of scan to do: 0 = Regular, 1 = Beacon
     */

    startScan(active: boolean, interval: number, window: number, timeout?: number, batch?: boolean, rssi?: number, name?: string, scanType?: ScanType): Promise<void>;

    stopScan(): Promise<void>;

    on(event: 'deviceDiscovered', listener: (discoveredDevice: DeviceDiscovered | null, timeout?: boolean) => void): this;

    on(event: 'devicesDiscovered', listener: (dicoveredDevices: Array<DeviceDiscovered>) => void): this;

    getState(): AdapterState;

    getImpl(): any; // Get underlying adapterDriver implementation

    getConnections(): Array<Address>;

    getAttributes(connection: Address): Promise<Array<Service>>;

    getServices(connection: Address): Promise<Array<Service>>;

    getCharacteristics(connection: Address, service: Service): Promise<Array<Characteristic>>;

    getDescriptors(connection: Address, characteristic: Characteristic): Promise<Array<Descriptor>>;

    writeCharacteristicValue(connection: Address, characteristic: Characteristic, characteristicValue: Array<number>, ack: boolean): Promise<void>;

    writeDescriptorValue(connection: Address, descriptor: Descriptor, descriptorValue: Array<number>, ack: boolean): Promise<void>;

    readCharacteristicValue(connection: Address, characteristic: Characteristic): Promise<Array<number>>;

    readDescriptorValue(connection: Address, descriptor: Descriptor): Promise<Array<number>>;

    on(event: 'adapterStateChange', listener: (stateChanged: AdapterState) => void): this;

    on(event: 'adapterError', listener: (error: AdapterError) => void): this;

    on(event: 'adapterWarning', listener: (warning: AdapterWarning) => void): this;

    on(event: 'connectionDown', handler: (n: ConnectionDownEvent) => void): void;

    on(event: 'connectionUp', handler: (n: ConnectionUpEvent) => void): void;

    on(event: 'connectTimedOut', handler: (n: ConnectTimedOutEvent) => void): void;

    on(event: 'connectionError', handler: (n: ConnectionErrorEvent) => void): void;

    on(event: 'connectCanceled', handler: (n: ConnectCanceledEvent) => void): void;

    on(event: 'connectionSecurityRequest', handler: (n: ConnectionSecurityRequestEvent) => void): void;

    on(event: 'connectionSecurityParametersRequest', handler: (n: ConnectionSecurityParametersRequestEvent) => void): void;

    on(event: 'connectionAuthenticationStatus', handler: (n: ConnectionAuthenticationStatusEvent) => void): void;

    on(event: 'characteristicValueChanged', handler: (n: ConnectionCharacteristicValueChangedEvent) => void): void;

    on(event: 'descriptorValueChanged', handler: (n: ConnectionDescriptorValueChangedEvent) => void): void;

    on(event: 'errorEvent', handler: (n: ErrorEvent) => void): void;

    debug(): any;
}
