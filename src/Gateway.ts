'use strict';

import {
    GatewayInfo,
    BLEDeviceConnectionDatabaseEntry
} from './model/g2c';

import {
    IAdapterDriverFactory,
} from './AdapterDriverFactory';

import { EventEmitter } from 'events';

export interface GatewayConfig {
    platform: string;
    version: string;
    gatewayId: string;
    tenantId: string;
    clientCert: string;
    caCert: string;
    privateKey: string;
    adapterId: string;
    eventBatchSize: number | null;
}

export class State {
    scanReportingMode: string;
    scanRequestId: string | null;
    deviceDiscoverRequestId: string | null;
    characteristicValueReadRequestId: string | null;
    characteristicValueWriteRequestId: string | null;
    descriptorValueReadRequestId: string | null;
    descriptorValueWriteRequestId: string | null;
    foundAttributes: any;
    devicesFound: any;
    gateway: GatewayInfo;
    adapter: {
        advertising: boolean,
        scanning: boolean,
        connecting: boolean,
        available: boolean,
        bleEnabled: boolean,
    };
    messages: {
        sent: number,
        received: number,
        errorsSent: number
    };
    filter: {
        rssi: number | null,
        name: string | null,
    };

    constructor(platform: string, version: string) {
        this.gateway = new GatewayInfo(platform, version);
        this.devicesFound = {};
        this.scanReportingMode = 'batch';
        this.messages = {
            sent: 0,
            received: 0,
            errorsSent: 0
        };
        this.adapter = {
            connecting: false,
            scanning: false,
            available: false,
            advertising: false,
            bleEnabled: false,
        };
        this.filter = {
            rssi: null,
            name: null
        };
    }
}

export interface IGateway extends EventEmitter {
    /**
     * Check if gateway is regitered with the cloud
     */
    isRegistered(): boolean;

    /**
     * Set BLE adapter to use
     */
    setAdapter(adapterId: string): Promise<void>;

    getAdapter(): string;

    /**
     * Set the adapterDriver driver factory
     */
    setAdapterDriverFactory(adapterDriverFactory: IAdapterDriverFactory): void;

    /**
     * Set credentials to use to connect to cloud
     */
    setCredentials(tenantId: string, gatewayId: string, clientCert: string, privateKey: string, caCert: string): Promise<void>;

    start(): Promise<void>;

    stop(): Promise<void>;

    isStarted(): boolean;

    /**
     * Add listener for listening to device connection database changes
     */
    on(event: 'connectionDatabaseChange', handler: (connections: BLEDeviceConnectionDatabaseEntry[]) => void): void;

    /**
     * Reset statistical counters in gateway
     */
    resetCounters(): void;

    on(event: 'statusUpdate', listener: (status: State) => void): this;

    on(event: 'deletedmyself', listener: () => void): this;

    debug(): string;
}
