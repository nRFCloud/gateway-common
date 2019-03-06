export declare interface Address {
    address: string;
    type: string;
}

export declare interface ScanParameters {
    active: boolean;
    interval: number;
    window: number;
    timeout: number;
}

export declare interface ConnectionParameters {
    minConnectionInterval?: number;
    min_conn_interval?: number; // FIXME: https://github.com/NordicSemiconductor/pc-ble-driver-js/issues/76
    maxConnectionInterval?: number;
    max_conn_interval?: number; // FIXME: https://github.com/NordicSemiconductor/pc-ble-driver-js/issues/76
    slaveLatency?: number;
    slave_latency?: number; // FIXME: https://github.com/NordicSemiconductor/pc-ble-driver-js/issues/76
    connectionSupervisionTimeout?: number;
    conn_sup_timeout?: number; // FIXME: https://github.com/NordicSemiconductor/pc-ble-driver-js/issues/76
}

export declare interface ConnectionOptions {
    scanParams: ScanParameters;
    connParams: ConnectionParameters;
}

import {
    BLEConnectionOptions,
    BLEAddress,
    BLEDescriptors,
    BLECharacteristic,
    BLECharacteristics,
    BLECharacteristicProperties,
    BLEService,
    BLEServices,
    BLEConnectionConnParams,
    BLEConnectionScanParams,
    BLEDescriptor,
    BLEDevice
} from './model/g2c';

import {
    Service,
    Characteristic,
    Descriptor,
    DeviceDiscovered
} from './AdapterDriverModel';

export function findAttributeByPath(attributes: any, path: string): any {
    const [serviceUUID, characteristicUUID, descriptorUUID] = path.split('/');

    if (serviceUUID == null) {
        return null;
    }

    if (!attributes) {
        return null;
    }

    for (let i in attributes) {
        const service: any = attributes[i];

        if (service.uuid === serviceUUID) {
            if (characteristicUUID == null) {
                return service;
            }

            for (let j in service.characteristics) {
                const characteristic: any = service.characteristics[j];

                if (characteristic.uuid === characteristicUUID) {
                    if (descriptorUUID == null) {
                        return characteristic;
                    }

                    for (let k in characteristic.descriptors) {
                        const descriptor: any = characteristic.descriptors[k];

                        if (descriptor.uuid === descriptorUUID) {
                            return descriptor;
                        }
                    }
                }
            }
        }
    }

    return null;
}

export interface IInstanceIds {
    address: string;
    device?: string;
    service?: string;
    characteristic?: string;
    descriptor?: string;
}

export function getInstanceIds(instanceId: string): IInstanceIds {
    const instanceIds: IInstanceIds = {
        address: null,
        device: null,
        service: null,
        characteristic: null,
        descriptor: null,
    };

    if (!instanceId) {
        return instanceIds;
    }

    const idArray = instanceId.split('.');

    if (idArray.length > 0) {
        instanceIds.address = idArray[0];
    }

    if (idArray.length > 1) {
        instanceIds.device = idArray.slice(0, 2).join('.');
    }

    if (idArray.length > 2) {
        instanceIds.service = idArray.slice(0, 3).join('.');
    }

    if (idArray.length > 3) {
        instanceIds.characteristic = idArray.slice(0, 4).join('.');
    }

    if (idArray.length > 4) {
        instanceIds.descriptor = idArray.slice(0, 5).join('.');
    }

    return instanceIds;
}



export namespace AdapterDriverToBLEModel {
    export function convertDescriptors(characteristicPath: string, descriptors: Array<Descriptor>): BLEDescriptors {
        const retval: BLEDescriptors = {};

        for (const descriptorKey in descriptors) {
            if (descriptorKey !== null) {
                const descriptor = descriptors[descriptorKey];
                retval[descriptor.uuid] = convertDescriptor(characteristicPath, descriptor);
            }
        }

        return retval;
    }

    export function convertDescriptor(characteristicPath: string, descriptor: Descriptor): BLEDescriptor {
        const retval: BLEDescriptor = {
            uuid: descriptor.uuid,
            value: descriptor.value,
            path: `${characteristicPath}/${descriptor.uuid}`
        };

        return retval;
    }

    export function convertCharacteristic(servicePath: string, characteristic: Characteristic): BLECharacteristic {
        const characteristicPath = `${servicePath}/${characteristic.uuid}`;

        const properties = <BLECharacteristicProperties>{
            broadcast: characteristic.properties.broadcast,
            read: characteristic.properties.read,
            writeWithoutResponse: characteristic.properties.write_wo_resp,
            write: characteristic.properties.write,
            notify: characteristic.properties.notify,
            indicate: characteristic.properties.indicate,
            authorizedSignedWrite: characteristic.properties.auth_signed_wr
        };

        const retval: BLECharacteristic = {
            uuid: characteristic.uuid,
            path: characteristicPath,
            value: characteristic.value,
            properties,
            descriptors: convertDescriptors(characteristicPath, characteristic.descriptors)
        };

        return retval;
    }

    export function convertCharacteristics(servicePath: string, characteristics: Array<Characteristic>): BLECharacteristics {
        let retval: BLECharacteristics = null;

        if (characteristics) {
            retval = new BLECharacteristics();
            characteristics.forEach(c => {
                retval[c.uuid] = convertCharacteristic(servicePath, c);
            });
        }

        return retval;
    }

    export function convertService(service: Service): BLEService {
        const characteristics = convertCharacteristics(service.uuid, service.characteristics);

        const retval: BLEService = {
            uuid: service.uuid,
            characteristics
        };

        return retval;
    }

    export function convertServices(services: Array<Service>): BLEServices {
        const retval: BLEServices = {};


        if (services) {
            services.forEach(service => {
                retval[service.uuid] = convertService(service);
            });
        }

        return retval;
    }

    export function convertAddress(address: Address): BLEAddress {
        const retval = new BLEAddress();

        retval.address = address.address;
        retval.type = address.type;

        return retval;
    }

    export function convertConnectOptions(options: ConnectionOptions): BLEConnectionOptions {
        return BLEConnectionOptions.create(
            BLEConnectionScanParams.create(
                options.scanParams.active,
                options.scanParams.interval,
                options.scanParams.window,
                options.scanParams.timeout),
            BLEConnectionConnParams.create(
                options.connParams.minConnectionInterval,
                options.connParams.maxConnectionInterval,
                options.connParams.slaveLatency,
                options.connParams.connectionSupervisionTimeout),
            null);
    }

    export function convertDeviceDiscovered(deviceDiscovered: DeviceDiscovered): BLEDevice {
        if (!deviceDiscovered) { return null; }

        const retval = new BLEDevice();
        retval.address = convertAddress(deviceDiscovered.address);
        retval.advertisementType = deviceDiscovered.advertisementType;
        retval.deviceType = 'BLE';
        retval.name = deviceDiscovered.name;
        retval.rssi = deviceDiscovered.rssi;
        retval.serviceUUIDs = deviceDiscovered.services;
        retval.time = deviceDiscovered.time ? deviceDiscovered.time.toISOString() : null;
        retval.advertisementData = deviceDiscovered.advertisementData || null;

        return retval;
    }
}

export namespace BLEModelToAdapterDriver {
    export function convertAddress(address: BLEAddress): Address {
        return <Address>{
            address: address.address,
            type: address.type
        };
    }
}

/**
 * Delete all null or undefined properties from an object.
 * Set 'recurse' to true if you also want to delete properties in nested objects.
 */
export function deleteNullProperties(test, recurse) {
    for (const i in test) {
        if (test[i] === null) {
            delete test[i];
        } else if (Array.isArray(test[i]) && test[i].length === 0) {
            delete test[i];
        } else if (typeof test[i] === 'string' && test[i].length === 0) {
            delete test[i];
        } else if (recurse && typeof test[i] === 'object') {
            deleteNullProperties(test[i], recurse);
        }
    }
}

export function deepCloneObject(internal: any): any {
    return JSON.parse(JSON.stringify(internal));
}
