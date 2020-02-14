import { AdvertisementPacket } from 'beacon-utilities';

import { Address } from './device';

export interface ScanResult {
	name?: string;
	rssi?: number;
	time?: string;
	advertisementType?: string;
	deviceType?: 'BLE';
	address?: Address;
	serviceUUIDs?: string[];
    //The advertisement data can be either a parsed packet (See beacon-utilities) or the raw byte array. The front end will handle both equally well
	advertisementData?: AdvertisementPacket | number[];
}
