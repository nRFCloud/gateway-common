# @nrfcloud/gateway-common
Common module for JavaScript based gateways.

## Introduction
This module contains the gateway logic for communicating with the nRF Cloud platform and Bluetooth devices.

## Install
`npm i @nrfcloud/gateway-common`

## Setup

You'll need to provide a class that inherits from `bluetoothAdapter`. This will have to be specific for your system. See [`ExampleAdapter`](https://github.com/nRFCloud/gateway-raspberry-pi/blob/95e4681b935af6c5935cae4d9a6654e333287c9a/src/adapters/exampleAdapter.ts) for an example.

Create a gateway on your nRF Cloud account (make sure you have an account first!) using the following command:

`npx @nrfcloud/gateway-registration`

It will ask you for your login credentials. It will output three files in a `./result` directory. For MQTTS, you'll need the certificates and gateway ID. For WSS, you'll just need the gateway ID. WSS uses Cognito authentication to provide security.

## Use

In your code, create a new Gateway and pass in a configuration object.

It is suggested that you use environment variables and something like [`dotenv`](https://npmjs.com/packages/dotenv).

(Note that this example is in Typescript, but plain JS works as well.)

```typescript
import { Gateway, GatewayConfiguration, GatewayEvent } from 'gateway-common';
import { NobleAdapter } from './src/adapters/nobleAdapter';
const configuration: GatewayConfiguration = {
    keyPath: process.env.PRIVATE_KEY_PATH,
    certPath: process.env.CLIENT_CERT_PATH,
    caPath: process.env.CA_CERT_PATH,
    gatewayId: process.env.GATEWAY_ID,
    host: process.env.HOST,
    stage: process.env.ENVIRONMENT_STAGE,
    tenantId: process.env.TENANT_ID,
    bluetoothAdapter: new NobleAdapter(),
};
const gateway = new Gateway(configuration);
```

Upon instantiation, the gateway will try to connect to nRF Cloud.

## Events

The gateway will emit some events as things happen.

* `GATEWAY_DELETED`: The gateway has been deleted from nRF Cloud. You'll probably want to delete the certs since they're not useful any more
* `NAME_CHANGED`: Gateway name has been changed
* `DEVICE_REMOVED`: Device has been removed from the gateway
* `CONNECTIONS_CHANGED`: The device connections have changed

## Example

To see an implementation of this project, see the [Raspbery Pi gateway](https://github.com/nRFCloud/gateway-raspberry-pi).

