'use strict';

import * as api from './api';
import { BLEConnectionSecurityKeyDistributionConfig } from './api';

export interface Compare<T> {
    equals(other: T): boolean;
}

export class BLEAddress extends api.BLEAddress
    implements Compare<BLEAddress> {

    constructor() {
        super();
    }

    equals(other: BLEAddress): boolean {
        if (this.address !== other.address) {
            return false;
        }

        if (this.type !== other.type) {
            return false;
        }

        return true;
    }

    toString(): string {
        return `${this.address}/${this.type}`;
    }

    static copy(from: api.BLEAddress): BLEAddress {
        const retval = new BLEAddress();
        retval.address = from.address;
        retval.type = from.type;
        return retval;
    }

    static create(address: string, type: string) {
        const retval = new BLEAddress();
        retval.address = address;
        retval.type = type;
        return retval;
    }
}

export class BLECharacteristic extends api.BLECharacteristic {
}

export class BLECharacteristicProperties extends api.BLECharacteristicProperties {
}

export class BLECharacteristics extends api.BLECharacteristics {
}

export class BLEConnectionConnParams extends api.BLEConnectionConnParams
    implements Compare<BLEConnectionConnParams> {

    constructor() {
        super();
    }

    equals(other: BLEConnectionConnParams): boolean {
        if (this.connectionSupervisionTimeout !== other.connectionSupervisionTimeout) {
            return false;
        }
        if (this.maxConnInterval !== other.maxConnInterval) {
            return false;
        }
        if (this.minConnInterval !== other.minConnInterval) {
            return false;
        }
        if (this.slaveLatency !== other.slaveLatency) {
            return false;
        }
        return true;
    }

    static create(minConnInterval: number,
                  maxConnInterval: number,
                  slaveLatency: number,
                  connectionSupervisionTimeout: number): BLEConnectionConnParams {
        const retval = new BLEConnectionConnParams();

        retval.minConnInterval = minConnInterval;
        retval.maxConnInterval = maxConnInterval;
        retval.slaveLatency = slaveLatency;
        retval.connectionSupervisionTimeout = connectionSupervisionTimeout;

        return retval;
    }
}

export class BLEConnectionScanParams extends api.BLEConnectionScanParams
    implements Compare<BLEConnectionScanParams> {

    constructor() {
        super();
    }

    equals(other: BLEConnectionScanParams): boolean {
        if (this.active !== other.active) {
            return false;
        }
        if (this.interval !== other.interval) {
            return false;
        }
        if (this.timeout !== other.timeout) {
            return false;
        }
        if (this.window !== other.window) {
            return false;
        }
        return true;
    }

    static create(active: boolean, interval: number, window: number, timeout: number): BLEConnectionScanParams {
        const retval = new BLEConnectionScanParams();

        retval.active = active;
        retval.interval = interval;
        retval.window = window;
        retval.timeout = timeout;

        return retval;
    }
}

export class BLEConnectionOptions extends api.BLEConnectionOptions
    implements Compare<BLEConnectionOptions> {

    constructor() {
        super();
    }

    private isScanParamsEqual(other: BLEConnectionScanParams): boolean {
        if (this.scanParams == null && other == null) {
            return true;
        }
        if (this.scanParams == null) {
            return false;
        }
        return (<BLEConnectionScanParams>this.scanParams).equals(<BLEConnectionScanParams>other);
    }

    private isConnParamsEqual(other: BLEConnectionConnParams): boolean {
        if (this.connParams == null && other == null) {
            return true;
        }
        if (this.connParams == null) {
            return false;
        }
        return (<BLEConnectionConnParams>this.connParams).equals(other);
    }

    equals(other: BLEConnectionOptions): boolean {
        if (!other) {
            return false;
        }
        if (!this.isScanParamsEqual(<BLEConnectionScanParams>other.scanParams)) {
            return false;
        }
        if (!this.isConnParamsEqual(<BLEConnectionConnParams>other.connParams)) {
            return false;
        }
        return true;
    }

    static create(scanParams: BLEConnectionScanParams, connParams: BLEConnectionConnParams, security: BLEConnectionSecurity): BLEConnectionOptions {
        const retval = new BLEConnectionOptions();

        retval.scanParams = scanParams;
        retval.connParams = connParams;
        retval.security = security;

        return retval;
    }
}

export class BLEConnectionSecurity extends api.BLEConnectionSecurity implements Compare<BLEConnectionSecurity> {
    constructor() {
        super();
        this.autoAccept = true;
        this.initiate = false;
        this.securityParams = new BLEConnectionSecurityParams();
    }

    private isSecurityParamsEqual(other: BLEConnectionSecurityParams): boolean {
        if (this.securityParams == null && other == null) {
            return true;
        }
        if (this.securityParams == null) {
            return false;
        }
        return (<BLEConnectionSecurityParams>this.securityParams).equals(other);
    }

    equals(other: BLEConnectionSecurity): boolean {
        if (!other) {
            return false;
        }
        if (this.autoAccept !== other.autoAccept) {
            return false;
        }
        if (this.initiate !== other.initiate) {
            return false;
        }
        return this.isSecurityParamsEqual(<BLEConnectionSecurityParams>other.securityParams);
    }

    static copy(from: api.BLEConnectionSecurity): BLEConnectionSecurity {
        const retval = new BLEConnectionSecurity();
        retval.autoAccept = from.autoAccept;
        retval.initiate = from.initiate;
        retval.securityParams = BLEConnectionSecurityParams.copy(from.securityParams);

        return retval;
    }

    static create(initiate: boolean, autoAccept: boolean, securityParams: BLEConnectionSecurityParams): BLEConnectionSecurity {
        const retval = new BLEConnectionSecurity();
        retval.autoAccept = autoAccept;
        retval.initiate = initiate;
        retval.securityParams = securityParams;

        return retval;
    }
}

export class BLEConnectionSecurityParams extends api.BLEConnectionSecurityParams implements Compare<BLEConnectionSecurityParams> {
    kdistOwn: BLEConnectionSecurityKeyDistributionConfig;
    kdistPeer: BLEConnectionSecurityKeyDistributionConfig;

    constructor() {
        super();
        this.bond = true;
        this.ioCaps = 'none';
        this.lesc = false;
        this.mitm = false;
        this.keypress = false;
        this.minKeySize = 7;
        this.maxKeySize = 16;
        this.oob = false;
        this.kdistOwn = null;
        this.kdistPeer = null;
    }

    equals(other: BLEConnectionSecurityParams): boolean {
        if (!other) {
            return false;
        }
        if (this.bond !== other.bond) {
            return false;
        }
        if (this.ioCaps !== other.ioCaps) {
            return false;
        }
        if (this.keypress !== other.keypress) {
            return false;
        }
        if (this.lesc !== other.lesc) {
            return false;
        }
        if (this.mitm !== other.mitm) {
            return false;
        }
        if (this.minKeySize !== other.minKeySize) {
            return false;
        }
        if (this.maxKeySize !== other.maxKeySize) {
            return false;
        }
        if (this.oob !== other.oob) {
            return false;
        }
        return true;
    }

    static copy(from: api.BLEConnectionSecurityParams): BLEConnectionSecurityParams {
        const retval = new BLEConnectionSecurityParams();
        retval.bond = from.bond;
        retval.ioCaps = from.ioCaps;
        retval.keypress = from.keypress;
        retval.lesc = from.lesc;
        retval.mitm = from.mitm;
        retval.minKeySize = from.minKeySize;
        retval.maxKeySize = from.maxKeySize;
        retval.oob = from.oob;
        retval.kdistOwn = from.kdistOwn;
        retval.kdistPeer = from.kdistPeer;

        return retval;
    }

    static create(bond: boolean,
                  mitm: boolean,
                  lesc: boolean,
                  keypress: boolean,
                  ioCaps?: string,
                  minKeySize?: number,
                  maxKeySize?: number,
                  oob?: boolean,
                  kdistOwn?: BLEConnectionSecurityKeyDistributionConfig,
                  kdistPeer?: BLEConnectionSecurityKeyDistributionConfig): BLEConnectionSecurityParams {
        const retval = new BLEConnectionSecurityParams();

        retval.bond = bond;
        retval.mitm = mitm;
        retval.lesc = lesc;
        retval.keypress = keypress;

        // Attributes below are not used in security requests from peer
        retval.ioCaps = ioCaps;
        retval.minKeySize = minKeySize;
        retval.maxKeySize = maxKeySize;
        retval.oob = oob;

        retval.kdistOwn = kdistOwn ? kdistOwn : {
            enc: false,
            id: false,
            link: false,
            sign: false
        };

        retval.kdistPeer = kdistPeer ? kdistPeer : {
            enc: false,
            id: false,
            link: false,
            sign: false
        };

        return retval;
    }

    toString(): string {
        const args = new Array<String>();

        if (this.bond) {
            args.push(`bond:${this.bond}`);
        }
        if (this.mitm) {
            args.push(`mitm:${this.mitm}`);
        }
        if (this.lesc) {
            args.push(`lesc:${this.lesc}`);
        }
        if (this.keypress) {
            args.push(`keypress:${this.keypress}`);
        }
        if (this.oob) {
            args.push(`oob:${this.oob}`);
        }
        if (this.ioCaps) {
            args.push(`ioCaps:${this.ioCaps}`);
        }

        return args.join('/');
    }
}

export class BLEDescriptor extends api.BLEDescriptor {
}

export class BLEDescriptors extends api.BLEDescriptors {
}

export class BLEDevice extends api.BLEDevice {
    constructor() {
        super();
        this.deviceType = 'BLE';
    }
}

export class BLEDeviceConnectionDatabaseEntry extends api.BLEDeviceConnectionDatabaseEntry {
    constructor(id: string, address: BLEAddress, connectOptions: BLEConnectionOptions | null, raw = null) {
        super();
        this.id = id;
        this.address = address;
        this.connectOptions = connectOptions;
        this.statistics = new BLEDeviceConnectionStatistics();
        this.status = new BLEDeviceConnectionStatus();
        this.raw = raw;
    }
}

export class BLEDeviceConnectionError extends api.BLEDeviceConnectionError
    implements Compare<BLEDeviceConnectionError> {
    constructor() {
        super();
    }

    equals(other: BLEDeviceConnectionError): boolean {
        if (!other) {
            return false;
        }
        if (this.description !== other.description) {
            return false;
        }
        if (this.code !== other.code) {
            return false;
        }
        return true;
    }

    static copy(from: api.BLEDeviceConnectionError): BLEDeviceConnectionError {
        if (!from) {
            return null;
        }

        const retval = new BLEDeviceConnectionError();
        retval.code = from.code;
        retval.description = from.description;
        return retval;
    }
}

export class BLEDeviceConnectionStatistics extends api.BLEDeviceConnectionStatistics {
    constructor() {
        super();
        this.addedAt = new Date().toISOString();
        this.lastConnect = null;
        this.lastDisconnect = null;
        this.connectCount = 0;
        this.disconnectCount = 0;
    }
}

export class BLEDeviceConnectionStatus extends api.BLEDeviceConnectionStatus
    implements Compare<BLEDeviceConnectionStatus> {

    connecting: boolean;

    constructor() {
        super();
        this.connected = false;
        this.connectTimedOut = false;
        this.auth = undefined;
        this.error = undefined;
        this.connecting = false;
    }

    private isErrorEqual(other: BLEDeviceConnectionError) {
        if (this.error == null && other == null) {
            return true;
        }
        if (this.error == null) {
            return false;
        }

        return BLEDeviceConnectionError.copy(this.error).equals(other);
    }

    private isAuthEqual(other: BLEDeviceAuthStatus) {
        if (this.auth == null && other == null) {
            return true;
        }
        if (this.error == null) {
            return false;
        }

        return (<BLEDeviceAuthStatus>this.auth).equals(other);
    }

    equals(other: BLEDeviceConnectionStatus) {
        if (this.connected !== other.connected) {
            return false;
        }
        if (this.connectTimedOut !== other.connectTimedOut) {
            return false;
        }
        if (this.isErrorEqual(BLEDeviceConnectionError.copy(other.error))) {
            return false;
        }
        return this.isAuthEqual(<BLEDeviceAuthStatus>other.auth);
    }

    static copy(from: api.BLEDeviceConnectionStatus): BLEDeviceConnectionStatus {
        if (!from) {
            return null;
        }

        const retval = new BLEDeviceConnectionStatus();
        retval.auth = from.auth;
        retval.connected = from.connected;
        retval.connectTimedOut = from.connectTimedOut;
        retval.error = BLEDeviceConnectionError.copy(from.error);
        return retval;
    }
}

export class BLEService extends api.BLEService {
}

export class BLEServices extends api.BLEServices {
}

export class GatewayInfo extends api.GatewayInfo {
    constructor(platform: string, version: string) {
        super();
        this.platform = platform;
        this.version = version;

        this.connects = 0;
        this.disconnects = 0;
        this.connected = false;
        this.uptime = 0;

        this.name = '';
    }
}

export class Event extends api.Event {
    constructor(type: string, subType?: string) {
        super();
        this.timestamp = new Date().toISOString();
        this.type = type;
        this.subType = subType;
    }
}

export class G2CMessage extends api.G2CMessage {
    constructor(requestId: string, type: string, gatewayId: string) {
        super();
        this.requestId = requestId;
        this.type = type;
        this.gatewayId = gatewayId;
    }
}

export class CharacteristicValueChangedEvent extends api.CharacteristicValueChangedEvent {
    constructor(device: BLEDeviceConnectionDatabaseEntry, characteristic: BLECharacteristic) {
        super();
        this.type = 'device_characteristic_value_changed';
        this.timestamp = new Date().toISOString();
        this.device = device;
        this.characteristic = characteristic;
    }
}

export class CharacteristicValueReadEvent extends api.CharacteristicValueReadEvent {
    constructor(device: BLEDeviceConnectionDatabaseEntry, characteristic: BLECharacteristic) {
        super();
        this.type = 'device_characteristic_value_read_result';
        this.timestamp = new Date().toISOString();
        this.device = device;
        this.characteristic = characteristic;
    }
}

export class CharacteristicValueWriteEvent extends api.CharacteristicValueWriteEvent {
    constructor(device: BLEDeviceConnectionDatabaseEntry, characteristic: BLECharacteristic) {
        super();
        this.type = 'device_characteristic_value_write_result';
        this.timestamp = new Date().toISOString();
        this.device = device;
        this.characteristic = characteristic;
    }
}


export class DescriptorValueChangedEvent extends api.DescriptorValueChangedEvent {
    constructor(device: BLEDeviceConnectionDatabaseEntry, descriptor: BLEDescriptor) {
        super();
        this.type = 'device_descriptor_value_changed';
        this.timestamp = new Date().toISOString();
        this.device = device;
        this.descriptor = descriptor;
    }
}

export class DescriptorValueReadEvent extends api.DescriptorValueReadEvent {
    constructor(device: BLEDeviceConnectionDatabaseEntry, descriptor: BLEDescriptor) {
        super();
        this.type = 'device_descriptor_value_read_result';
        this.timestamp = new Date().toISOString();
        this.device = device;
        this.descriptor = descriptor;
    }
}

export class DescriptorValueWriteEvent extends api.DescriptorValueWriteEvent {
    constructor(device: BLEDeviceConnectionDatabaseEntry, descriptor: BLEDescriptor) {
        super();
        this.type = 'device_descriptor_value_write_result';
        this.timestamp = new Date().toISOString();
        this.device = device;
        this.descriptor = descriptor;
    }
}

export class DeviceConnectResultEvent extends api.DeviceConnectResultEvent {
    constructor(device: BLEDeviceConnectionDatabaseEntry) {
        super();
        this.type = 'device_connect_result';
        this.timestamp = new Date().toISOString();
        this.device = device;
    }
}

export class DeviceConnectionNeedPasskeyEvent extends api.DeviceConnectionNeedPasskeyEvent {
    constructor(device: BLEDeviceConnectionDatabaseEntry, keyType: string) {
        super();
        this.type = 'device_connection_need_passkey';
        this.timestamp = new Date().toISOString();
        this.device = device;
        this.keyType = keyType;
    }
}

export class DeviceDisconnectedEvent extends api.DeviceDisconnectedEvent {
    constructor(deviceConnection: BLEDeviceConnectionDatabaseEntry) {
        super();
        this.type = 'device_disconnect';
        this.timestamp = new Date().toISOString();
        this.device = deviceConnection;
    }
}

export class DeviceDiscoverEvent extends api.DeviceDiscoverEvent {
    constructor(deviceConnection: BLEDeviceConnectionDatabaseEntry, services: BLEServices) {
        super();
        this.type = 'device_discover_result';
        this.timestamp = new Date().toISOString();
        this.device = deviceConnection;
        this.services = services;
    }
}

export class BLEDeviceAuthStatus extends api.BLEDeviceAuthStatus {
    constructor(description: string, statusCode: number, source: string, bonded: boolean) {
        super();
        this.description = description;
        this.statusCode = statusCode;
        this.source = source;
        this.bonded = bonded;
    }

    equals(other: BLEDeviceAuthStatus): boolean {
        if (this.description !== other.description) {
            return false;
        }
        if (this.statusCode !== other.statusCode) {
            return false;
        }
        if (this.bonded !== other.bonded) {
            return false;
        }
        return true;
    }

    static copy(from: api.BLEDeviceAuthStatus): BLEDeviceAuthStatus {
        const retval = new BLEDeviceAuthStatus(
            from.description,
            from.statusCode,
            from.source,
            from.bonded);
        return retval;
    }
}

export class AuthStatusEvent extends api.AuthStatusEvent {
    constructor(deviceConnection: BLEDeviceConnectionDatabaseEntry, status: BLEDeviceAuthStatus) {
        super();
        this.type = 'auth_status';
        this.timestamp = new Date().toISOString();
        this.device = deviceConnection;
        this.status = status;
    }
}

export class G2CEvent extends api.G2CEvent {
    constructor(requestId: string, gatewayId: string, event: Event) {
        super();
        this.type = 'event';
        this.gatewayId = gatewayId;
        this.requestId = requestId;
        this.event = event;
    }
}

export class GatewayStatusEvent extends api.GatewayStatusEvent {
    constructor(connections: BLEDeviceConnectionDatabaseEntry[] | null, gatewayInfo: GatewayInfo) {
        super();
        this.type = 'get_gateway_status_result';
        this.timestamp = new Date().toISOString();
        this.connections = connections;
        this.gatewayInfo = gatewayInfo;
    }
}

export class ScanResultBatchEvent extends api.ScanResultBatchEvent {
    constructor(devices: Array<BLEDevice>) {
        super();
        this.type = 'scan_result';
        this.timestamp = new Date().toISOString();
        this.subType = 'batch';
        this.devices = devices;
    }
}

export class ScanResultInstantEvent extends api.ScanResultInstantEvent {
    constructor(devices: Array<BLEDevice>, timeout: boolean = false) {
        super();
        this.type = 'scan_result';
        this.subType = 'instant';
        this.timestamp = new Date().toISOString();
        this.devices = devices;
        this.timeout = timeout;
    }
}
