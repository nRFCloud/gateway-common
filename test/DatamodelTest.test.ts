'use strict';

import { } from 'jest';

import {
    BLEAddress,
    BLEConnectionOptions,
    BLEConnectionConnParams,
    BLEConnectionScanParams
} from '../src/model/g2c';

it('shall support equality on BLEAddress', () => {
    const address = new BLEAddress();
    address.address = 'A1';
    address.type = 'T1';

    expect(address.equals(<BLEAddress>{
        address: 'A1',
        type: 'T1'
    })).toEqual(true);

    expect(address.equals(<BLEAddress>{
        address: 'A2',
        type: 'T1'
    })).toEqual(false);

    expect(address.equals(<BLEAddress>{
        address: 'A2',
        type: 'T2'
    })).toEqual(false);
});

it('shall support equality on BLEConnectionOptions', () => {
    // A
    const optionsA = new BLEConnectionOptions();

    const connParamsA = new BLEConnectionConnParams();
    connParamsA.connectionSupervisionTimeout = 1;
    connParamsA.maxConnInterval = 2;
    connParamsA.minConnInterval = 3;
    connParamsA.slaveLatency = 4;

    const scanParamsA = new BLEConnectionScanParams();
    scanParamsA.active = false;
    scanParamsA.interval = 1;
    scanParamsA.timeout = 3;
    scanParamsA.window = 10;

    optionsA.connParams = connParamsA;
    optionsA.scanParams = scanParamsA;

    // B
    const optionsB = new BLEConnectionOptions();

    const connParamsB = new BLEConnectionConnParams();
    connParamsB.connectionSupervisionTimeout = 1;
    connParamsB.maxConnInterval = 2;
    connParamsB.minConnInterval = 3;
    connParamsB.slaveLatency = 4;

    const scanParamsB = new BLEConnectionScanParams();
    scanParamsB.active = false;
    scanParamsB.interval = 1;
    scanParamsB.timeout = 3;
    scanParamsB.window = 10;

    optionsB.connParams = connParamsB;
    optionsB.scanParams = scanParamsB;

    expect(optionsA.equals(optionsB)).toBe(true);

    optionsB.connParams.connectionSupervisionTimeout = 2;
    expect(optionsA.equals(optionsB)).toBe(false);

    optionsB.connParams.connectionSupervisionTimeout = 1;
    optionsB.scanParams.interval = 1000;
    expect(optionsA.equals(optionsB)).toBe(false);
});


