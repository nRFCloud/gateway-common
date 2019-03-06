'use strict';

import { } from 'jest';

import {
    IAdapterDriver
} from '../src/AdapterDriver';

import {
    VirtualAdapterDriver
} from './VirtualAdapterDriver';

import { DUTs } from './DUT';

let adapterDriver: IAdapterDriver;

let changeListenerCount = 0;
let connectionUpCount = 0;
let connectionRemovedCount = 0;
let connectionDownCount = 0;
let connectionErrorCount = 0;
let connectionSecurityRequestCount = 0;

beforeAll(() => {
    adapterDriver = new VirtualAdapterDriver();

    adapterDriver.on('connectionUp', () => {
        connectionUpCount++;
    });

    adapterDriver.on('connectionDown', () => {
        connectionDownCount++;
    });

    adapterDriver.on('connectionError', () => {
        connectionErrorCount++;
    });

    adapterDriver.on('connectionSecurityRequest', () => {
        connectionSecurityRequestCount++;
    });
});

beforeEach(() => {
    changeListenerCount = 0;
    connectionUpCount = 0;
    connectionRemovedCount = 0;
    connectionDownCount = 0;
    connectionErrorCount = 0;
    connectionSecurityRequestCount = 0;
});

it('shall throw error on connection failure', async () => {
    const dut = DUTs.get('alwaysTriggerConnectError');
    let error = 0;

    try {
        await adapterDriver.connect(dut.address, dut.connectionOptions);
    } catch (e) {
        error = 1;
    }

    expect(error).toBe(1);
    expect(connectionUpCount).toBe(0);
    expect(connectionDownCount).toBe(0);
    expect(connectionRemovedCount).toBe(0);
    expect(connectionErrorCount).toBe(1);
});

it('shall emit security request event if peer initiates authentication', async () => {
    const dut = DUTs.get('autoAcceptJustWorksPairing');

    let connectionSecurityRequestReceived = false;
    let connectionAuthenticationStatusReceived = false;

    adapterDriver.on('connectionSecurityRequest', async connectionSecurityEvent => {
        connectionSecurityRequestReceived = true;
        await adapterDriver.securityParametersReply(connectionSecurityEvent.address, 'success', connectionSecurityEvent.securityParams);
    });

    adapterDriver.on('connectionAuthenticationStatus', authenticationStatus => {
        connectionAuthenticationStatusReceived = true;
        expect(authenticationStatus.address.address).toBe(dut.address.address);
        expect(authenticationStatus.status.statusCode).toBe(0);
        expect(authenticationStatus.status.description).toBe('success');
    });

    await adapterDriver.connect(dut.address, dut.connectionOptions);

    expect(connectionUpCount).toBe(1);
    expect(connectionDownCount).toBe(0);
    expect(connectionRemovedCount).toBe(0);
    expect(connectionErrorCount).toBe(0);
    expect(connectionSecurityRequestCount).toBe(1);
    expect(connectionSecurityRequestReceived).toBe(true);
    expect(connectionAuthenticationStatusReceived).toBe(true);
});
