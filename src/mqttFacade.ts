import * as awsIot from 'aws-iot-device-sdk';
import { ScanResult } from './interfaces/scanResult';
import { BLEDevice, Characteristic, Descriptor, Services } from './interfaces/bluetooth';
import {
	CharacteristicEvent,
	DescriptorEvent,
	DeviceConnectedEvent,
	DeviceDisconnectedEvent,
	DeviceDiscoverEvent,
	ErrorEvent,
	EventType,
	G2CEvent,
} from './interfaces/g2c';


enum FotaType {
	App = 'APP',
	Boot = 'BOOT',
	Modem = 'MODEM',
}

export class MqttFacade {
	private readonly mqttClient: awsIot.device;
	private readonly g2cTopic: string;
	private readonly shadowTopic: string;
	private readonly gatewayId: string;

	private messageId = 0;

	constructor(mqttClient: awsIot.device, g2cTopic: string, shadowTopic: string, gatewayId: string) {
		this.g2cTopic = g2cTopic;
		this.mqttClient = mqttClient;
		this.shadowTopic = shadowTopic;
		this.gatewayId = gatewayId;
	}

	handleScanResult(result: ScanResult, timeout: boolean = false) {
		const event = {
			type: EventType.ScanResult,
			subType: 'instant',
			devices: result ? [result] : [],
			timeout,
		};
		this.publishG2CEvent(event);
	}

	reportConnections(statusConnections) {
		const shadowUpdate = {
			state: {
				reported: {
					statusConnections,
				},
			},
		};
		this.publish(`${this.shadowTopic}/update`, shadowUpdate);
	}

	reportBLEFOTAStatus(status: boolean) {
		const fotaV2 = status ? [FotaType.App, FotaType.Modem, FotaType.Boot] : null;

		const shadowUpdate = {
			state: {
				reported: {
					device: {
						serviceInfo: {
							fota_v2: fotaV2,
						},
					},
				},
			},
		};
		this.publish(`${this.shadowTopic}/update`, shadowUpdate);
	}

	reportConnectionUp(deviceId: string) {
		this.reportConnectionStatus(deviceId, EventType.DeviceConnected);
	}

	reportConnectionDown(deviceId: string) {
		this.reportConnectionStatus(deviceId, EventType.DeviceDisconnected);
	}

	private reportConnectionStatus(deviceId: string, type: EventType.DeviceConnected | EventType.DeviceDisconnected) {
		const event: DeviceConnectedEvent | DeviceDisconnectedEvent = {
			type,
			device: this.buildDeviceObjectForEvent(deviceId, type === EventType.DeviceConnected),
		};
		this.publishG2CEvent(event);
	}

	reportDiscover(deviceId: string, services: Services) {
		const discoverEvent: DeviceDiscoverEvent = {
			type: EventType.DeviceDiscover,
			device: this.buildDeviceObjectForEvent(deviceId, true),
			services: services,
		};
		this.publishG2CEvent(discoverEvent);
	}

	reportError(err: any, id?: string, code?: number, deviceId?: string) {
		code = typeof code !== 'undefined' ? code : -1;
		err = typeof err === 'object' && err !== null ? JSON.stringify(err) : err;
		const event: ErrorEvent = {
			type: EventType.Error,
			error: {
				description: err,
				code,
			},
			device: deviceId ? {
				deviceAddress: deviceId,
			} : undefined,
		};
		this.publishG2CEvent(event);
	}

	reportCharacteristicRead(deviceId: string, characteristic: Characteristic) {
		const charEvent: CharacteristicEvent = {
			type: EventType.CharacteristicValueRead,
			characteristic,
			device: this.buildDeviceObjectForEvent(deviceId, true),
		};
		this.publishG2CEvent(charEvent);
	}


	reportCharacteristicWrite(deviceId: string, characteristic: Characteristic) {
		const event: CharacteristicEvent = {
			type: EventType.CharacteristicValueWrite,
			characteristic,
			device: this.buildDeviceObjectForEvent(deviceId, true),
		};
		this.publishG2CEvent(event);
	}

	reportCharacteristicChanged(deviceId: string, characteristic: Characteristic) {
		const event: CharacteristicEvent = {
			type: EventType.CharacteristicValueChanged,
			characteristic,
			device: this.buildDeviceObjectForEvent(deviceId, true),
		};
		this.publishG2CEvent(event);
	}

	reportDescriptorRead(deviceId: string, descriptor: Descriptor) {
		const event: DescriptorEvent = {
			type: EventType.DescriptorValueRead,
			descriptor,
			device: this.buildDeviceObjectForEvent(deviceId, true),
		};
		this.publishG2CEvent(event);
	}

	reportDescriptorWrite(deviceId: string, descriptor: Descriptor) {
		const event: DescriptorEvent = {
			type: EventType.DescriptorValueWrite,
			descriptor,
			device: this.buildDeviceObjectForEvent(deviceId, true),
		};
		this.publishG2CEvent(event);
	}

	reportDescriptorChanged(deviceId: string, descriptor: Descriptor) {
		const event: DescriptorEvent = {
			type: EventType.DescriptorValueChanged,
			descriptor,
			device: this.buildDeviceObjectForEvent(deviceId, true),
		};
		this.publishG2CEvent(event);
	}

	private publishG2CEvent(event: G2CEvent) {
		const g2cEvent = this.getG2CEvent(event);
		this.publish(this.g2cTopic, g2cEvent);
	}


	private getG2CEvent(event) {
		if (!event.timestamp) {
			event.timestamp = new Date().toISOString();
		}
		return {
			type: 'event',
			gatewayId: this.gatewayId,
			event,
		};
	}


	private publish(topic: string, event) {
		event.messageId = this.messageId++;
		const message = JSON.stringify(event);

		this.mqttClient.publish(topic, message);
	}

	private buildDeviceObjectForEvent(deviceId: string, connected: boolean): BLEDevice {
		return {
			address: {
				address: deviceId,
				type: 'randomStatic',
			},
			id: deviceId,
			status: {
				connected,
			},
		};
	}


}
