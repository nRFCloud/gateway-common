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
	advertisementData?: AdvertisementPacket;
}
