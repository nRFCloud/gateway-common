import * as awsIot from 'aws-iot-device-sdk';
import { ScanResult } from './interfaces/scanResult';
import { Characteristic, Descriptor, Services } from './interfaces/bluetooth';
export declare class MqttFacade {
    private readonly mqttClient;
    private readonly g2cTopic;
    private readonly shadowTopic;
    private messageId;
    constructor(mqttClient: awsIot.device, g2cTopic: string, shadowTopic: string);
    handleScanResult(result: ScanResult, timeout?: boolean): void;
    reportConnections(statusConnections: any): void;
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
    private publishG2CEvent;
    private getG2CEvent;
    private publish;
    private buildDeviceObjectForEvent;
}
