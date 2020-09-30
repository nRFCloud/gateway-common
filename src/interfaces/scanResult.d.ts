import { AdvertisementPacket } from 'beacon-utilities';
import { Address } from './device';
export declare class DeviceScanResult {
    name: string;
    rssi: number;
    time: string;
    advertisementType: string;
    deviceType: string;
    address: Address;
    serviceUUIDs: string[];
    advertisementData: AdvertisementPacket;
}
