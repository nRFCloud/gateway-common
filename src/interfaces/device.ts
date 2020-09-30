export interface Address {
    //The address should be upper-cased. The adapter is responsible for converting it to upper-case.
    //It's also responsible for converting it back if necessary
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

