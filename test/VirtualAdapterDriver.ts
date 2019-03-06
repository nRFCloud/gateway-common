'use strict';

import { EventEmitter } from 'events';

import {
    IAdapterDriver,
    AdapterState
} from '../src/AdapterDriver';

import {
    ConnectionDownEvent,
    ConnectionUpEvent,
    ConnectionErrorEvent,
    ConnectionOptions,
    ConnectionSecurityRequestEvent,
    ConnectionAuthenticationStatusEvent,
    Service,
    Characteristic,
    Descriptor,
    ConnectionAuthStatus,
    ConnectionSecurityParams,
    Address
} from '../src/AdapterDriverModel';

import {
    DUTs
} from './DUT';

const errorTimeout = 3;

let logger: any;

class VirtualConnection {
    address: Address;
    peerAuthInitiated: boolean;
    peerConnectionSecurityParams: ConnectionSecurityParams;
    ownConnectionSecurityParams: ConnectionSecurityParams;

    constructor(address: Address) {
        this.address = address;
    }
}

const CONNECTION_ERROR = 'connectionError';
const CONNECTION_UP = 'connectionUp';
const CONNECTION_DOWN = 'connectionDown';
const CONNECTION_SECURITY_REQUEST = 'connectionSecurityRequest';
const CONNECTION_AUTHENTICATION_STATUS = 'connectionAuthenticationStatus';
const DISCONNECT_ERROR = 'disconnectError';

export class VirtualAdapterDriver extends EventEmitter implements IAdapterDriver {
    async unwatchDevices(connections: string[]): Promise<string[]> {
        return connections;
    }

    async watchDevices(connections: string[]): Promise<string[]> {
        return connections;
    }

    connectFail: boolean;
    disconnectFail: boolean;
    defaultSecurityParameters: ConnectionSecurityParams | null;

    // Keep internal state of virtual connections
    private connections: Map<string, VirtualConnection>;

    constructor() {
        super();

        this.connectFail = false;
        this.disconnectFail = false;
        this.connections = new Map<string, VirtualConnection>();
    }

    open(): Promise<void> {
        return Promise.resolve();
    }

    close(): Promise<void> {
        return Promise.resolve();
    }

    reset(): Promise<void> {
        return Promise.resolve();
    }

    connect(connection: Address, _: ConnectionOptions): Promise<Address> {
        return new Promise<Address>((resolve, reject) => {
            const address: Address = connection;
            const alwaysTriggerConnectError = DUTs.get('alwaysTriggerConnectError');
            const peerInitiatedJustWorks = DUTs.get('autoAcceptJustWorksPairing');

            this.makeRandomWait(true).then(() => {
                if (connection.address === alwaysTriggerConnectError.address.address) {
                    this.emit(CONNECTION_ERROR, new ConnectionErrorEvent(address, `Intentionally returning an error since address is ${connection.address} with connection id ${connection.address}`, -1));

                    reject(
                        new Error(`Intentionally returning an error since address is ${connection.address} with connection id ${connection.address}`
                        ));
                } else {
                    const virtualConnection = new VirtualConnection(address);
                    this.connections.set(address.address, virtualConnection);

                    this.emit(CONNECTION_UP, new ConnectionUpEvent(address));

                    if (address.address === peerInitiatedJustWorks.address.address) {
                        // Simulate that device on the other end initiates authentication
                        virtualConnection.peerConnectionSecurityParams = peerInitiatedJustWorks.peerConnectionSecurityParams;

                        this.emit(CONNECTION_SECURITY_REQUEST, new ConnectionSecurityRequestEvent(address, virtualConnection.peerConnectionSecurityParams));
                        virtualConnection.peerAuthInitiated = true;
                    }

                    resolve(connection);
                }
            }).catch(error => {
                reject(error);
            });
        });
    }

    disconnect(address: Address): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.makeRandomWait(false).then(() => {
                const alwaysTriggerConnectError = DUTs.get('alwaysTriggerConnectError');
                if (address.address === alwaysTriggerConnectError.address.address) {
                    this.emit(DISCONNECT_ERROR, new ConnectionErrorEvent(address, `Intentionally returning an error since address is ${alwaysTriggerConnectError.address.address}`, 500));

                    reject({
                        code: 500,
                        description: `Intentionally returning an error since address is ${alwaysTriggerConnectError.address.address}`
                    });
                } else {
                    this.emit(CONNECTION_DOWN, new ConnectionDownEvent(address));
                    this.connections.delete(address.address);
                    resolve();
                }
            });
        });
    }

    async makeRandomWait(connect: boolean): Promise<void> {
        if (connect === true && this.connectFail) {
            return await new Promise<void>(resolve => { setTimeout(() => { resolve(); }, errorTimeout); });
        }

        if (connect === false && this.disconnectFail) {
            return await new Promise<void>(resolve => { setTimeout(() => { resolve(); }, errorTimeout); });

        }

        let waitTime = errorTimeout;

        while (waitTime === errorTimeout || waitTime === 0) {
            waitTime = Math.round(Math.random() * errorTimeout);
        }

        return await new Promise<void>(resolve => { setTimeout(() => { resolve(); }, waitTime); });
    }

    async authenticate(connection: Address, securityParameters: ConnectionSecurityParams): Promise<void> {
        if (this.connections.has(connection.address)) {
            await this.makeRandomWait(false);

            const virtualConnection = this.connections.get(connection.address);

            if (securityParameters) {
                virtualConnection.ownConnectionSecurityParams = securityParameters;
            }

            if (virtualConnection.peerAuthInitiated) {
                // FIXME: If we are replying back to a virtual security request, send a status telling the world everything is fine.
                const authStatus = new ConnectionAuthStatus('success', 0, '', false);
                const authStatusEvent = new ConnectionAuthenticationStatusEvent(connection, authStatus);
                this.emit(CONNECTION_AUTHENTICATION_STATUS, authStatusEvent);
            } else {
                const secParamsRequest = new ConnectionSecurityParams();
                const secParamsRequestEvent = new ConnectionSecurityRequestEvent(connection, secParamsRequest);
                this.emit(CONNECTION_SECURITY_REQUEST, secParamsRequestEvent);
            }
        } else {
            throw new Error(`Device connection ${connection.address} is not established.`);
        }
    }

    async securityParametersReply(connection: Address, status: string, securityParameters: ConnectionSecurityParams): Promise<void> {
        if (this.connections.has(connection.address)) {
            const virtualConnection = this.connections.get(connection.address);

            if (securityParameters) {
                virtualConnection.ownConnectionSecurityParams = securityParameters;
            }

            const deviceAuthStatus = new ConnectionAuthStatus(status, 0, '', false);
            this.emit(CONNECTION_AUTHENTICATION_STATUS, new ConnectionAuthenticationStatusEvent(connection, deviceAuthStatus));
        } else {
            throw new Error(`Unknown connection ${connection.address} to sent security parameters reply to.`);
        }
    }

    setDefaultSecurityParameters(securityParameters: ConnectionSecurityParams): void {
        this.defaultSecurityParameters = securityParameters;
    }

    async getAttributes(_: Address): Promise<Service[]> {
        return [];
    }

    async getServices(_: Address): Promise<Service[]> {
        return [];
    }

    async getCharacteristics(connection: Address, service: Service): Promise<Characteristic[]> {
        logger.debug(`getCharacteristics\n${JSON.stringify(connection)}\n${JSON.stringify(service)}`);
        return [];
    }

    async getDescriptors(connection: Address, characteristic: Characteristic): Promise<Descriptor[]> {
        logger.debug(`getDescriptors\n${JSON.stringify(connection)}\n${JSON.stringify(characteristic)}`);
        return [];
    }

    async writeCharacteristicValue(connection: Address, characteristic: Characteristic, characteristicValue: number[], ack: boolean): Promise<void> {
        logger.debug(`writeCharacteristicValue\n${JSON.stringify(connection)}\n${JSON.stringify(characteristic)}\n${JSON.stringify(characteristicValue)}\n${ack}`);
    }

    async writeDescriptorValue(connection: Address, descriptor: Descriptor, descriptorValue: number[], ack: boolean): Promise<void> {
        logger.debug(`writeDescriptorValue\n${JSON.stringify(connection)}\n${JSON.stringify(descriptor)}\n${JSON.stringify(descriptorValue)}\n${ack}`);
    }

    async readCharacteristicValue(connection: Address, characteristic: Characteristic): Promise<number[]> {
        logger.debug(`readCharacteristicValue\n${connection}\n${JSON.stringify(characteristic)} `);
        return Array<number>();
    }

    async readDescriptorValue(connection: Address, descriptor: Descriptor): Promise<number[]> {
        logger.debug(`readDescriptorValue\n${JSON.stringify(connection)}\n${JSON.stringify(descriptor)} `);
        return Array<number>();
    }

    async sendPasskey(connection: Address, keyType: string, key: string): Promise<void> {
        logger.debug(`sendPasskey\nconnection:${connection}\nkeyType:${keyType}\nkey:${key}`);
    }

    async startScan(active: boolean, interval: number, window: number, timeout?: number, batch?: boolean, rssi?: number, name?: string): Promise<void> {
        logger.debug(`startScan\nactive:${active}\ninterval:${interval}\nwindow:${window}\ntimeout:${timeout}\nbatch:${batch}\nrssi:${rssi}\nname:${name}`);
    }

    getState(): AdapterState {
        return <AdapterState>{
            advertising: false,
            available: false,
            connecting: false,
            scanning: false
        };
    }

    getImpl(): any {
        return null;
    }

    getConnections(): Array<Address> {
        return [];
    }

    cancelConnect(): Promise<void> {
        return undefined;
    }

    stopScan(): Promise<void> {
        return undefined;
    }

    debug(): string {
        return 'debug!';
    }
}
