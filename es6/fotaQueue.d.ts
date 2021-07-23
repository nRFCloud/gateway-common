/// <reference types="node" />
import { EventEmitter } from 'events';
import { FotaAdapter } from './fotaAdapter';
export interface QueueItem {
    jobId: string;
    deviceId: string;
    uris: string[];
}
export declare enum FotaEvent {
    DownloadProgress = "downloadProgress",
    ErrorUpdating = "errorUpdating",
    DfuStatus = "dfuStatus"
}
export declare class FotaQueue extends EventEmitter {
    private queue;
    private hasStarted;
    private fileMap;
    private fotaAdapter;
    private _currentItem;
    get currentItem(): QueueItem;
    constructor();
    setFotaAdapter(adapter: FotaAdapter): void;
    add(newItem: QueueItem): void;
    start(): void;
    private doNextItem;
    private processItem;
}
export declare const FotaQ: FotaQueue;
