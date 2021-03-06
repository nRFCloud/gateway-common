/// <reference types="node" />
import * as awsIot from 'aws-iot-device-sdk';
import { EventEmitter } from 'events';
import { BluetoothAdapter } from './bluetoothAdapter';
import { MqttFacade } from './mqttFacade';
export declare enum GatewayEvent {
    NameChanged = "NAME_CHANGED",
    Deleted = "GATEWAY_DELTED",
    DeviceRemoved = "DEVICE_REMOVED",
    ConnectionsChanged = "CONNECTIONS_CHANGED"
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
    protocol?: 'mqtts' | 'wss';
    accessKeyId?: string;
    secretKey?: string;
    sessionToken?: string;
    debug?: boolean;
    watchInterval?: number;
    watchDuration?: number;
};
export declare class Gateway extends EventEmitter {
    readonly gatewayId: string;
    readonly stage: string;
    readonly tenantId: string;
    readonly gatewayDevice: awsIot.device;
    readonly bluetoothAdapter: BluetoothAdapter;
    readonly mqttFacade: MqttFacade;
    readonly watchInterval: number;
    readonly watchDuration: number;
    private deviceConnections;
    private deviceConnectionIntervalHolder;
    private lastTriedAddress;
    private discoveryCache;
    private watchList;
    private watcherHolder;
    private state;
    get c2gTopic(): string;
    get g2cTopic(): string;
    private get shadowGetTopic();
    private get shadowUpdateTopic();
    private get shadowTopic();
    constructor(config: GatewayConfiguration);
    private handleMessage;
    private handleC2GMessage;
    private handleShadowMessage;
    private handleBeaconState;
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
}
