import type Blob from 'cross-fetch';

export enum UpdateStatus {
	DeviceConnecting = 'deviceConnecting',
	DeviceConnected = 'deviceConnected',
	DfuProcessStarting = 'dfuProcessStarting',
	DfuProcessStarted = 'dfuProcessStarted',
	EnablingDfuMode = 'enablingDfuMode',
	FirmwareValidating = 'firmwareValidating',
	DeviceDisconnecting = 'deviceDisconnecting',
	DeviceDisconnected = 'deviceDisconnected',
	DfuCompleted = 'dfuCompleted',
	DfuAborted = 'dfuAborted',
	ProgressChanged = 'progressChanged',
}

//This interface is based on the values from cordova-plugin-nordic-update. We can change these if we feel we need to in the future. The implementation would have to do a conversion
export interface UpdateInformation {
	id: string; //device id
	status: UpdateStatus; //status of the update
	error?: number;
	errorType?: number;
	message?: string;
	progress?: {
		percent: number;
		speed: number;
		avgSpeed: number;
		currentPart: number;
		partsTotal: number;
	};
}

export abstract class FotaAdapter {

	//Given a file blob, the implementation should initiate the update. The update status will be sent using the callback. At the very least, the implementation needs to call the callback with a "DfuCompleted" status
	//The blob will be a zip file containing the information and files from the update message
	abstract startUpdate(file: Blob, deviceId: string, callback: (status: UpdateInformation) => void): void;
}
