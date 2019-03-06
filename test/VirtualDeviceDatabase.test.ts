'use strict';

import { } from 'jest';

import {
    DeviceConnectionDatabase
} from '../src/DeviceConnectionDatabase';

import {
    IAdapterDriver
} from '../src/AdapterDriver';

import {
    BLEDeviceConnectionDatabaseEntry
} from '../src/model/g2c';

import {
    VirtualAdapterDriver
} from './VirtualAdapterDriver';

import {
    DUTs
} from './DUT';

let driverAdapter: IAdapterDriver;
let database: DeviceConnectionDatabase;

beforeAll(() => {
    driverAdapter = new VirtualAdapterDriver();
    database = new DeviceConnectionDatabase(driverAdapter, 0);

    database.on('databaseChange', () => {
        changeListenerCount++;
    });

    database.on('connectionDown', () => {
        connectionDownCount++;
    });

    database.on('connectionUp', () => {
        connectionUpCount++;
    });

    database.on('connectionRemoved', () => {
        connectionRemovedCount++;
    });
});

let changeListenerCount = 0;
let connectionUpCount = 0;
let connectionRemovedCount = 0;
let connectionDownCount = 0;

beforeEach(() => {
    changeListenerCount = 0;
    connectionUpCount = 0;
    connectionRemovedCount = 0;
    connectionDownCount = 0;
});

it('shall emit events if connection fails.', async () => {
    const dut1 = DUTs.get('alwaysTriggerConnectError');

    const databaseEntryA = new BLEDeviceConnectionDatabaseEntry(
        dut1.address.address,
        dut1.address,
        dut1.connectionOptions
    );

    const connections: BLEDeviceConnectionDatabaseEntry[] = [
        databaseEntryA
    ];

    await database.updateDeviceConnections(connections);

    expect(connectionUpCount).toBe(0);
    expect(connectionDownCount).toBe(0);
    expect(connectionRemovedCount).toBe(0);

    let currentConnections = database.getDeviceConnections();

    expect(currentConnections.length).toBe(1);
    const connection = currentConnections[0];

    expect(connection.address.address).toBe(dut1.address.address);
    expect(connection.connectOptions).toBeDefined();
});

it('shall emit no events if device already exists in database.', async () => {
    const dut1 = DUTs.get('alwaysTriggerConnectError');

    let newConnections: BLEDeviceConnectionDatabaseEntry[] = [
        new BLEDeviceConnectionDatabaseEntry(
            dut1.address.address,
            dut1.address,
            dut1.connectionOptions)
    ];

    await database.updateDeviceConnections(newConnections);

    let currentConnections = database.getDeviceConnections();
    expect(changeListenerCount).toBe(0);
    expect(connectionUpCount).toBe(0);
    expect(connectionDownCount).toBe(0);
    expect(connectionRemovedCount).toBe(0);

    expect(Object.keys(currentConnections).length).toBe(1);
    expect(currentConnections[0].status.error).toBeDefined();
    expect(currentConnections[0].status.error).toBeDefined();
});

it('shall emit events when new devices are added to database.', async () => {
    const dut1 = DUTs.get('alwaysTriggerConnectError');
    const dut2 = DUTs.get('virtual #1');
    const dut3 = DUTs.get('virtual #2');

    let newConnections = [
        new BLEDeviceConnectionDatabaseEntry(dut1.address.address, dut1.address, dut1.connectionOptions),
        new BLEDeviceConnectionDatabaseEntry(dut2.address.address, dut2.address, dut2.connectionOptions),
        new BLEDeviceConnectionDatabaseEntry(dut3.address.address, dut3.address, dut3.connectionOptions)
    ];

    changeListenerCount = 0;

    await database.updateDeviceConnections(newConnections);

    expect(connectionUpCount).toBe(2);
    expect(connectionDownCount).toBe(0);
    expect(connectionRemovedCount).toBe(0);

    let currentConnections = database.getDeviceConnections();

    expect(currentConnections.length).toBe(3);
    expect(currentConnections[0].address.address).toBe(dut1.address.address);
    expect(currentConnections[0].status.error).toBeDefined();

    expect(currentConnections[1].address.address).toBe(dut2.address.address);
    expect(currentConnections[1].status.error).toBeNull();

    expect(currentConnections[2].address.address).toBe(dut3.address.address);
    expect(currentConnections[2].status.error).toBe(null);
});

it('shall emit change events if a device is removed from the database.', async () => {
    // Connection F -- start --
    const dut1 = DUTs.get('alwaysTriggerConnectError');
    const dut2 = DUTs.get('virtual #2');

    let newConnections = [
        new BLEDeviceConnectionDatabaseEntry(dut1.address.address, dut1.address, dut1.connectionOptions),
        new BLEDeviceConnectionDatabaseEntry(dut2.address.address, dut2.address, dut2.connectionOptions)
    ];

    await database.updateDeviceConnections(newConnections);

    expect(connectionUpCount).toBe(0);
    expect(connectionDownCount).toBe(1);
    expect(connectionRemovedCount).toBe(1);

    let currentConnections = database.getDeviceConnections();
    expect(currentConnections.length).toBe(2);
    expect(currentConnections[0].address.address).toBe(dut1.address.address);
    expect(currentConnections[0].status.error).toBeDefined();
    expect(currentConnections[1].address.address).toBe(dut2.address.address);
    expect(currentConnections[1].status.error).toBe(null);
});

it('shall automatically establish a secure connection when "Just Works" pairing is received from peer.', async () => {
    const dut = DUTs.get('autoAcceptJustWorksPairing');

    let newConnections = [
        new BLEDeviceConnectionDatabaseEntry(dut.address.address, dut.address, dut.connectionOptions),
    ];

    await database.updateDeviceConnections(newConnections);
    await new Promise((resolve, _) => {
        setTimeout(() => {
            resolve();
        }, 10);
    });

    const connection = database.getDeviceConnection(dut.address.address);
    expect(connection.status.auth.bonded).toBe(true);
});