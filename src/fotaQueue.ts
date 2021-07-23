import { EventEmitter } from 'events';
import JSZip from 'jszip';

import { FotaAdapter, UpdateStatus } from './fotaAdapter';
import { downloadFile } from './utils';

export interface QueueItem {
	jobId: string;
	deviceId: string;
	uris: string[];
}

export enum FotaEvent {
	DownloadProgress = 'downloadProgress',
	ErrorUpdating = 'errorUpdating',
	DfuStatus = 'dfuStatus',
}

export class FotaQueue extends EventEmitter {
	private queue: QueueItem[] = [];
	private hasStarted = false;
	private fileMap: { [key: string]: Blob } = {};
	private fotaAdapter: FotaAdapter;
	private _currentItem: QueueItem = null;
	public get currentItem(): QueueItem {
		return this._currentItem;
	}

	constructor() {
		super();
		this.on(FotaEvent.DfuStatus, (_item, update) => {
			switch (update.status) {

				case UpdateStatus.DfuAborted:
				case UpdateStatus.DfuCompleted:
					this.doNextItem();
					break;
			}
		});
		this.on(FotaEvent.ErrorUpdating, () => { this.doNextItem() });
	}

	setFotaAdapter(adapter: FotaAdapter) {
		this.fotaAdapter = adapter;
	}

	add(newItem: QueueItem) {
		//only enqueue items that aren't already enqueued
		if (!this.queue.find((item) => item.deviceId === newItem.deviceId && item.jobId === newItem.jobId)) {
			this.queue.push(newItem);
		}
		this.start();
	}

	start() {
		if (this.fotaAdapter && this.queue.length && !this.hasStarted) {
			this.hasStarted = true;
			this.doNextItem();
		}
	}

	private doNextItem() {
		this._currentItem = null;
		if (this.queue.length < 1) {
			this.hasStarted = false;
			return;
		}
		const nextItem = this.queue.shift();
		setTimeout(() => this.processItem(nextItem));//pull of out sync into next tick
	}

	private async processItem(item: QueueItem) {
		this._currentItem = item;
		const filePromises = [];

		for (const uri of item.uris) {
			if (typeof this.fileMap[uri] === 'undefined') {
				filePromises.push(downloadFile(uri, (percentage) => {
					this.emit(FotaEvent.DownloadProgress, item, percentage);
				}).then((blob) => this.fileMap[uri] = blob));
			}
		}

		await Promise.all(filePromises);

		const zip = new JSZip();
		const application = {
			bin_file: '',
			dat_file: '',
		};

		for (const uri of item.uris) {
			if (typeof this.fileMap[uri] === 'undefined') {
				// return this.processItem(item);
				throw new Error(`File with ${uri} not downloaded`);
			}
			const fileName = uri.substring(uri.lastIndexOf('/') + 1);
			zip.file(fileName, this.fileMap[uri]);
			if (fileName.indexOf('.bin') > -1) {
				application.bin_file = fileName;
			} else {
				application.dat_file = fileName;
			}
		}

		const manifest = {
			manifest: {
				application,
			},
		};

		zip.file('manifest.json', JSON.stringify(manifest));
		const blob = await zip.generateAsync({ type: 'blob' });

		this.fotaAdapter.startUpdate(blob, item.deviceId, (update) => {
			if (update.error) {
				this.emit(FotaEvent.ErrorUpdating, item, update);
				return;
			}

			this.emit(FotaEvent.DfuStatus, item, update);
		});


	}
}

export const FotaQ = new FotaQueue();
