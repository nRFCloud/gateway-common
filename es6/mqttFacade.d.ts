import * as awsIot from 'aws-iot-device-sdk';
import { ScanResult } from './interfaces/scanResult';
import { Characteristic, Descriptor, Services } from './interfaces/bluetooth';
export interface MqttFacadeOptions {
    mqttClient: awsIot.device;
    g2cTopic: string;
    shadowTopic: string;
    gatewayId: string;
    bleFotaTopic: string;
}
export declare class MqttFacade {
    private readonly mqttClient;
    private readonly g2cTopic;
    private readonly shadowTopic;
    private readonly gatewayId;
    private readonly bleFotaTopic;
    private messageId;
    constructor(options: MqttFacadeOptions);
    handleScanResult(result: ScanResult, timeout?: boolean): void;
    reportConnections(statusConnections: any): void;
    reportBLEFOTAAvailability(status: boolean): void;
    reportBLEFOTAStatus(data: (string | number)[]): void;
    reportConnectionUp(deviceId: string): void;
    reportConnectionDown(deviceId: string): void;
    private reportConnectionStatus;
    reportDiscover(deviceId: string, services: Services): void;
    reportError(err: any, id?: string, code?: number, deviceId?: string): void;
    reportCharacteristicRead(deviceId: string, characteristic: Characteristic): void;
    reportCharacteristicWrite(deviceId: string, characteristic: Characteristic): void;
    reportCharacteristicChanged(deviceId: string, characteristic: Characteristic): void;
    reportDescriptorRead(deviceId: string, descriptor: Descriptor): void;
    reportDescriptorWrite(deviceId: string, descriptor: Descriptor): void;
    reportDescriptorChanged(deviceId: string, descriptor: Descriptor): void;
    requestJobsForDevice(deviceId: string): void;
    private publishG2CEvent;
    private getG2CEvent;
    private publish;
    private buildDeviceObjectForEvent;
}
