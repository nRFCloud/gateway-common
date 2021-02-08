import { EventType, } from './interfaces/g2c';
var FotaType;
(function (FotaType) {
    FotaType["App"] = "APP";
    FotaType["Boot"] = "BOOT";
    FotaType["Modem"] = "MODEM";
})(FotaType || (FotaType = {}));
export class MqttFacade {
    constructor(mqttClient, g2cTopic, shadowTopic, gatewayId) {
        this.messageId = 0;
        this.g2cTopic = g2cTopic;
        this.mqttClient = mqttClient;
        this.shadowTopic = shadowTopic;
        this.gatewayId = gatewayId;
    }
    handleScanResult(result, timeout = false) {
        const event = {
            type: EventType.ScanResult,
            subType: 'instant',
            devices: result ? [result] : [],
            timeout,
        };
        this.publishG2CEvent(event);
    }
    reportConnections(statusConnections) {
        const shadowUpdate = {
            state: {
                reported: {
                    statusConnections,
                },
            },
        };
        this.publish(`${this.shadowTopic}/update`, shadowUpdate);
    }
    reportBLEFOTAStatus(status) {
        const fotaV2 = status ? [FotaType.App, FotaType.Modem, FotaType.Boot] : null;
        const shadowUpdate = {
            state: {
                reported: {
                    device: {
                        serviceInfo: {
                            fota_v2: fotaV2,
                        },
                    },
                },
            },
        };
        this.publish(`${this.shadowTopic}/update`, shadowUpdate);
    }
    reportConnectionUp(deviceId) {
        this.reportConnectionStatus(deviceId, EventType.DeviceConnected);
    }
    reportConnectionDown(deviceId) {
        this.reportConnectionStatus(deviceId, EventType.DeviceDisconnected);
    }
    reportConnectionStatus(deviceId, type) {
        const event = {
            type,
            device: this.buildDeviceObjectForEvent(deviceId, type === EventType.DeviceConnected),
        };
        this.publishG2CEvent(event);
    }
    reportDiscover(deviceId, services) {
        const discoverEvent = {
            type: EventType.DeviceDiscover,
            device: this.buildDeviceObjectForEvent(deviceId, true),
            services: services,
        };
        this.publishG2CEvent(discoverEvent);
    }
    reportError(err, id, code, deviceId) {
        code = typeof code !== 'undefined' ? code : -1;
        err = typeof err === 'object' && err !== null ? JSON.stringify(err) : err;
        const event = {
            type: EventType.Error,
            error: {
                description: err,
                code,
            },
            device: deviceId ? {
                deviceAddress: deviceId,
            } : undefined,
        };
        this.publishG2CEvent(event);
    }
    reportCharacteristicRead(deviceId, characteristic) {
        const charEvent = {
            type: EventType.CharacteristicValueRead,
            characteristic,
            device: this.buildDeviceObjectForEvent(deviceId, true),
        };
        this.publishG2CEvent(charEvent);
    }
    reportCharacteristicWrite(deviceId, characteristic) {
        const event = {
            type: EventType.CharacteristicValueWrite,
            characteristic,
            device: this.buildDeviceObjectForEvent(deviceId, true),
        };
        this.publishG2CEvent(event);
    }
    reportCharacteristicChanged(deviceId, characteristic) {
        const event = {
            type: EventType.CharacteristicValueChanged,
            characteristic,
            device: this.buildDeviceObjectForEvent(deviceId, true),
        };
        this.publishG2CEvent(event);
    }
    reportDescriptorRead(deviceId, descriptor) {
        const event = {
            type: EventType.DescriptorValueRead,
            descriptor,
            device: this.buildDeviceObjectForEvent(deviceId, true),
        };
        this.publishG2CEvent(event);
    }
    reportDescriptorWrite(deviceId, descriptor) {
        const event = {
            type: EventType.DescriptorValueWrite,
            descriptor,
            device: this.buildDeviceObjectForEvent(deviceId, true),
        };
        this.publishG2CEvent(event);
    }
    reportDescriptorChanged(deviceId, descriptor) {
        const event = {
            type: EventType.DescriptorValueChanged,
            descriptor,
            device: this.buildDeviceObjectForEvent(deviceId, true),
        };
        this.publishG2CEvent(event);
    }
    publishG2CEvent(event) {
        const g2cEvent = this.getG2CEvent(event);
        this.publish(this.g2cTopic, g2cEvent);
    }
    getG2CEvent(event) {
        if (!event.timestamp) {
            event.timestamp = new Date().toISOString();
        }
        return {
            type: 'event',
            gatewayId: this.gatewayId,
            event,
        };
    }
    publish(topic, event) {
        event.messageId = this.messageId++;
        const message = JSON.stringify(event);
        this.mqttClient.publish(topic, message);
    }
    buildDeviceObjectForEvent(deviceId, connected) {
        return {
            address: {
                address: deviceId,
                type: 'randomStatic',
            },
            id: deviceId,
            status: {
                connected,
            },
        };
    }
}
//# sourceMappingURL=mqttFacade.js.map