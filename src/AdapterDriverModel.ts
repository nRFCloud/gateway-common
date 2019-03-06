/**
 * Events and datamodels the AdapterDriver uses
 */
import { AdvertisementData } from './model/api';

export interface Address {
    address: string;
    type: string;
}

export class Device {
    address: Address;
    role: string;
    connected: boolean;
    minConnectionInterval: number;
    maxConnectionInterval: number;
    connectionSupervisionTimeout: number;
}

export class DeviceDiscovered extends Device {
    name: string;
    services: any;
    flags: any;
    scanResponse: any;
    time: Date;
    txPower: number;
    advertisementType: string;
    rssi: number;
    rssiLevel: number;
    advertisementData: AdvertisementData;
}

export class ConnectionEvent {
    timestamp: string;
    address: Address;

    constructor(address: Address) {
        this.timestamp = new Date().toISOString();
        this.address = address;
    }
}

export class ConnectionDownEvent extends ConnectionEvent {
    constructor(address: Address) {
        super(address);
    }
}

export class ConnectionUpEvent extends ConnectionEvent {
    constructor(address: Address) {
        super(address);
    }
}

export class ConnectCanceledEvent extends ConnectionEvent {
    constructor(address: Address) {
        super(address);
    }
}

export class ConnectTimedOutEvent extends ConnectionEvent {
    constructor(address: Address) {
        super(address);
    }
}

export class ConnectionErrorEvent extends ConnectionEvent {
    code?: number;
    description: string;

    constructor(address: Address, description: string, code?: number) {
        super(address);
        this.description = description;
        this.code = code;
    }
}

export class ConnectionCharacteristicValueChangedEvent extends ConnectionEvent {
    characteristic: Characteristic;

    constructor(connection: Address, characteristic: Characteristic) {
        super(connection);
        this.characteristic = characteristic;
    }
}

export class ConnectionDescriptorValueChangedEvent extends ConnectionEvent {
    descriptor: Descriptor;

    constructor(connection: Address, descriptor: Descriptor) {
        super(connection);
        this.descriptor = descriptor;
    }
}

export class ConnectionSecurityRequestEvent extends ConnectionEvent {
    securityParams: ConnectionSecurityParams;

    constructor(connection: Address, securityParams: ConnectionSecurityParams) {
        super(connection);
        this.securityParams = securityParams;
    }

    toString(): string {
        return this.securityParams.toString();
    }
}

export class ConnectionSecurityParametersRequestEvent extends ConnectionEvent {
    securityParams: ConnectionSecurityParams;

    constructor(connection: Address, securityParams: ConnectionSecurityParams) {
        super(connection);
        this.securityParams = securityParams;
    }
}

export class ConnectionScanParams {
    active: boolean;
    interval: number;
    window: number;
    timeout: number;
}

export class ConnectionConnParams {
    minConnInterval: number;
    maxConnInterval: number;
    slaveLatency: number;
    connectionSupervisionTimeout: number;
}

export class ConnectionSecurity {
    initiate: boolean;
    autoAccept: boolean;
    securityParams: ConnectionSecurityParams;
}

export class ConnectionOptions {
    scanParams: ConnectionScanParams;
    connParams: ConnectionConnParams;
    security: ConnectionSecurity;
}

export class ConnectionAuthStatus {
    description: string;
    statusCode: number;
    source: string;
    bonded: boolean;

    constructor(description: string, statusCode: number, source: string, bonded: boolean) {
        this.description = description;
        this.statusCode = statusCode;
        this.source = source;
        this.bonded = bonded;
    }
}

export class ConnectionAuthenticationStatusEvent extends ConnectionEvent {
    status: ConnectionAuthStatus;

    constructor(connection: Address, status: ConnectionAuthStatus) {
        super(connection);
        this.status = status;
    }
}

export class ConnectionSecurityKeyDistributionConfig {
    enc: boolean;
    id: boolean;
    sign: boolean;
    link: boolean;

    constructor(enc: boolean, id: boolean, sign: boolean, link: boolean) {
        this.enc = enc;
        this.id = id;
        this.sign = sign;
        this.link = link;
    }
}

export class ConnectionSecurityParams {
    bond: boolean;
    mitm: boolean;
    lesc: boolean;
    keypress: boolean;
    ioCaps: string;
    minKeySize: number;
    maxKeySize: number;
    oob: boolean;
    kdistOwn: ConnectionSecurityKeyDistributionConfig;
    kdistPeer: ConnectionSecurityKeyDistributionConfig;

    constructor() {
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
}

export class ErrorEvent {
    error: string;

    constructor(error: string) {
        this.error = error;
    }
}

export class Descriptor {
    uuid: string;
    value: Array<number>;
    handle: number;
    path: string;

    constructor(uuid: string) {
        this.uuid = uuid;
    }
}

export class CharacteristicProperties {
    broadcast: boolean;
    read: boolean;
    write_wo_resp: boolean;
    write: boolean;
    notify: boolean;
    indicate: boolean;
    auth_signed_wr: boolean;
}

export class Characteristic {
    uuid: string;
    value: Array<number>;
    descriptors?: Array<Descriptor>;
    declarationHandle: number;
    valueHandle: number;
    properties: CharacteristicProperties;
    path: string;

    constructor(uuid: string) {
        this.uuid = uuid;
    }
}

export class Service {
    characteristics: Array<Characteristic>;
    uuid: string;
    startHandle: number;
    endHandle: number;
    path: string;

    constructor(uuid: string) {
        this.uuid = uuid;
    }
}

export class AdapterError {
    error: string;

    constructor(error: string) {
        this.error = error;
    }
}

export class AdapterWarning {
    message: string;

    constructor(message: string) {
        this.message = message;
    }
}
