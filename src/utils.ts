import fetch from 'cross-fetch';
//nRF Cloud expects uuids to be upper case with no dashes
import { Characteristic, Descriptor, Service } from './interfaces/bluetooth';

export function shortenUUID(uuid: string) {
	return uuid.replace(/-/g, '').toUpperCase();
}

//This bit of code is to assert that an object is of a type
//From https://github.com/microsoft/TypeScript/issues/10421#issuecomment-518806979
export function assumeType<T>(x: unknown): asserts x is T {
	return; // ¯\_(ツ)_/¯
}


export async function downloadFile(fileUrl: string, statusCallback?: (percentage: number) => void): Promise<Blob> {
	const response = await fetch(fileUrl);
	if (!response.ok) {
		throw new Error(`Response was not ok: ${response.status} ${response.statusText}`);
	}
	if (typeof response.body?.getReader === 'function') {
		const reader = response.body.getReader();
		const contentLength = +response.headers.get('Content-Length');
		let receivedLength = 0;
		const chunks = [];

		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}
			chunks.push(value);
			receivedLength += value.length;
			//report download progress
			const percentage = Math.round(receivedLength / contentLength * 100);
			if (typeof statusCallback === 'function') {
				statusCallback(percentage);
			}
		}

		return new Blob(chunks);
	} else {
		//Can't do incremental download, just get the blob
		return response.blob();
	}
}
