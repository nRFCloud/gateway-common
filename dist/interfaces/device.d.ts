export interface Address {
    address: string;
    type: string;
}
export interface Device {
    address: Address;
    role: string;
    connected: boolean;
    minConnectionInterval: number;
    maxConnectionInterval: number;
    connectionSupervisionTimeout: number;
}
