export declare class Descriptor {
    uuid: string;
    path: string;
    value: number[];
    constructor(uuid: string, characteristicUuid?: string, serviceUuid?: string);
}
export declare class CharacteristicProperties {
    broadcast: boolean;
    read: boolean;
    writeWithoutResponse: boolean;
    write: boolean;
    notify: boolean;
    indicate: boolean;
    authorizedSignedWrite: boolean;
}
export interface CharacteristicDescriptors {
    [key: string]: Descriptor;
}
export declare class Characteristic {
    uuid: string;
    path: string;
    value: number[];
    properties: CharacteristicProperties;
    descriptors: CharacteristicDescriptors;
    constructor(uuid: string, serviceUuid?: string);
}
export interface ServiceCharacteristics {
    [key: string]: Characteristic;
}
export declare class Service {
    uuid: string;
    characteristics: ServiceCharacteristics;
    constructor(uuid: string);
}
export interface Services {
    [key: string]: Service;
}
interface BLEAddress {
    address: string;
    type: string;
}
interface BLEDeviceConnectionStatus {
    connected: boolean;
}
export interface BLEDevice {
    id: string;
    address: BLEAddress;
    status: BLEDeviceConnectionStatus;
}
export {};
