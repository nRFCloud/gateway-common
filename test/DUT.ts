'use strict';

import {
    BLEAddress,
    BLEConnectionOptions,
    BLEConnectionScanParams,
    BLEConnectionConnParams,
    BLEConnectionSecurity,
    BLEConnectionSecurityParams
} from '../src/model/g2c';

export class DUT {
    address: BLEAddress;
    connectionOptions: BLEConnectionOptions;

    peerConnectionSecurityParams: BLEConnectionSecurityParams; // Contains the peer requested security params
}

function createVirtualPeripheral(randomStaticAddress: string): DUT {
    const address = new BLEAddress();
    address.address = randomStaticAddress;
    address.type = 'randomStatic';

    const connParams = new BLEConnectionConnParams();
    connParams.connectionSupervisionTimeout = 4000;
    connParams.maxConnInterval = 7.5;
    connParams.minConnInterval = 7.5;
    connParams.slaveLatency = 0;

    const scanParams = new BLEConnectionScanParams();
    scanParams.active = true;
    scanParams.interval = 100;
    scanParams.timeout = 20;
    scanParams.window = 50;

    const connectionOptions = new BLEConnectionOptions();
    connectionOptions.connParams = connParams;
    connectionOptions.scanParams = scanParams;

    const peerSecurityParams = new BLEConnectionSecurityParams();
    peerSecurityParams.bond = false;
    peerSecurityParams.ioCaps = '';
    peerSecurityParams.keypress = false;
    peerSecurityParams.lesc = false;
    peerSecurityParams.mitm = false;

    const security = new BLEConnectionSecurity();
    const ownSecurityParams = new BLEConnectionSecurityParams();
    ownSecurityParams.bond = false;
    ownSecurityParams.ioCaps = '';
    ownSecurityParams.keypress = false;
    ownSecurityParams.lesc = false;
    ownSecurityParams.mitm = false;

    security.securityParams = ownSecurityParams;

    connectionOptions.security = security;

    const dut = new DUT();
    dut.address = address;
    dut.connectionOptions = connectionOptions;
    dut.peerConnectionSecurityParams = peerSecurityParams;

    return dut;
}

export class DUTs {
    static get(description: string): DUT {
        switch (description) {
            case 'nRF52 DK 682222640':
                return createVirtualPeripheral('E9:22:81:60:80:70');
            case 'virtual #1':
                return createVirtualPeripheral('CC:AA:BE:EF:F0:00');
            case 'virtual #2':
                return createVirtualPeripheral('DD:AA:BE:EF:F0:00');
            case 'alwaysTriggerConnectError':
                return createVirtualPeripheral('DE:AD:BE:EF:F0:00');
            case 'autoAcceptJustWorksPairing':
                return createVirtualPeripheral('DD:DD:FF:FF:FF:FF');
        }
    }
}
