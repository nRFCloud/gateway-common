/// <reference types="node" />
import * as awsIot from 'aws-iot-device-sdk';
import { EventEmitter } from 'events';
import { BluetoothAdapter } from './bluetoothAdapter';
import { MqttFacade } from './mqttFacade';
import { FotaAdapter } from './fotaAdapter';
import { FotaQueue } from './fotaQueue';
export declare enum GatewayEvent {
    NameChanged = "NAME_CHANGED",
    Deleted = "GATEWAY_DELETED",
    DeviceRemoved = "DEVICE_REMOVED",
    ConnectionsChanged = "CONNECTIONS_CHANGED",
    StatusChanged = "STATUS_CHANGED",
    DeviceUpdate = "DEVICE_UPDATE",
    BeaconUpdate = "BEACON_UPDATE"
}
export declare type GatewayConfiguration = {
    keyPath?: string;
    certPath?: string;
    caPath?: string;
    gatewayId: string;
    host: string;
    stage?: string;
    tenantId: string;
    bluetoothAdapter: BluetoothAdapter;
    fotaAdapter?: FotaAdapter;
    protocol?: 'mqtts' | 'wss';
    accessKeyId?: string;
    secretKey?: string;
    sessionToken?: string;
    debug?: boolean;
    watchInterval?: number;
    watchDuration?: number;
};
export interface GatewayState {
    scanning: boolean;
    isTryingConnection: boolean;
    connected: boolean;
}
export interface DeviceConnections {
    [deviceId: string]: boolean;
}
export declare class Gateway extends EventEmitter {
    readonly gatewayId: string;
    readonly stage: string;
    readonly tenantId: string;
    readonly gatewayDevice: awsIot.device;
    readonly bluetoothAdapter: BluetoothAdapter;
    readonly mqttFacade: MqttFacade;
    readonly watchInterval: number;
    readonly watchDuration: number;
    readonly fotaAdapter: FotaAdapter;
    readonly fotaQueue: FotaQueue;
    private deviceConnections;
    private deviceConnectionIntervalHolder;
    private lastTriedAddress;
    private _name;
    private discoveryCache;
    private watchList;
    private watcherHolder;
    private fotaMap;
    private state;
    get c2gTopic(): string;
    get g2cTopic(): string;
    get beacons(): string[];
    get connections(): DeviceConnections;
    get name(): string;
    private get topicPrefix();
    private get shadowGetTopic();
    private get shadowUpdateTopic();
    private get shadowTopic();
    private get fotaTopicPrefix();
    private get bleFotaRcvTopic();
    constructor(config: GatewayConfiguration);
    private handleMessage;
    private handleC2GMessage;
    private handleShadowMessage;
    private handleBeaconState;
    private handleFotaMessage;
    private performRSSIs;
    private performWatches;
    private handleError;
    private doDiscover;
    private doCharacteristicRead;
    private doCharacteristicWrite;
    private doDescriptorRead;
    private doDescriptorWrite;
    private shouldIncludeResult;
    private startScan;
    private updateDeviceConnections;
    private reportConnections;
    private getStatusConnections;
    private startDeviceConnections;
    private initiateNextConnection;
    stopDeviceConnections(): void;
    private reportConnectionUp;
    private reportConnectionDown;
    private updateState;
    private dfuErrorListener;
    private dfuDownloadListener;
    private dfuStatusListener;
}
