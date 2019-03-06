import * as events from 'events';

import {
    IAdapterDriver
} from './AdapterDriver';

export interface IAdapter {
    id: string;
    port: string;

    getAdapterDriver(): IAdapterDriver;
}

export interface IAdapterDriverFactory extends events.EventEmitter {
    getAdapterByAdapterId(adapterId: string): Promise<IAdapter>;

    getAdapters(): Promise<string[]>;

    on(event: 'added', listener: (adapter: IAdapter) => void): this;

    on(event: 'removed', listener: (adapter: IAdapter) => void): this;

    on(event: 'error', listener: (error: any) => void): this;
}
