"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MqttFacade = void 0;
var g2c_1 = require("./interfaces/g2c");
var FotaType;
(function (FotaType) {
    FotaType["App"] = "APP";
    FotaType["Boot"] = "BOOT";
    FotaType["Modem"] = "MODEM";
})(FotaType || (FotaType = {}));
var MqttFacade = /** @class */ (function () {
    function MqttFacade(mqttClient, g2cTopic, shadowTopic, gatewayId) {
        this.messageId = 0;
        this.g2cTopic = g2cTopic;
        this.mqttClient = mqttClient;
        this.shadowTopic = shadowTopic;
        this.gatewayId = gatewayId;
    }
    MqttFacade.prototype.handleScanResult = function (result, timeout) {
        if (timeout === void 0) { timeout = false; }
        var event = {
            type: g2c_1.EventType.ScanResult,
            subType: 'instant',
            devices: result ? [result] : [],
            timeout: timeout,
        };
        this.publishG2CEvent(event);
    };
    MqttFacade.prototype.reportConnections = function (statusConnections) {
        var shadowUpdate = {
            state: {
                reported: {
                    statusConnections: statusConnections,
                },
            },
        };
        this.publish(this.shadowTopic + "/update", shadowUpdate);
    };
    MqttFacade.prototype.reportBLEFOTAStatus = function (status) {
        var fotaV2 = status ? [FotaType.App, FotaType.Modem, FotaType.Boot] : null;
        var shadowUpdate = {
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
        this.publish(this.shadowTopic + "/update", shadowUpdate);
    };
    MqttFacade.prototype.reportConnectionUp = function (deviceId) {
        this.reportConnectionStatus(deviceId, g2c_1.EventType.DeviceConnected);
    };
    MqttFacade.prototype.reportConnectionDown = function (deviceId) {
        this.reportConnectionStatus(deviceId, g2c_1.EventType.DeviceDisconnected);
    };
    MqttFacade.prototype.reportConnectionStatus = function (deviceId, type) {
        var event = {
            type: type,
            device: this.buildDeviceObjectForEvent(deviceId, type === g2c_1.EventType.DeviceConnected),
        };
        this.publishG2CEvent(event);
    };
    MqttFacade.prototype.reportDiscover = function (deviceId, services) {
        var discoverEvent = {
            type: g2c_1.EventType.DeviceDiscover,
            device: this.buildDeviceObjectForEvent(deviceId, true),
            services: services,
        };
        this.publishG2CEvent(discoverEvent);
    };
    MqttFacade.prototype.reportError = function (err, id, code, deviceId) {
        code = typeof code !== 'undefined' ? code : -1;
        err = typeof err === 'object' && err !== null ? JSON.stringify(err) : err;
        var event = {
            type: g2c_1.EventType.Error,
            error: {
                description: err,
                code: code,
            },
            device: deviceId ? {
                deviceAddress: deviceId,
            } : undefined,
        };
        this.publishG2CEvent(event);
    };
    MqttFacade.prototype.reportCharacteristicRead = function (deviceId, characteristic) {
        var charEvent = {
            type: g2c_1.EventType.CharacteristicValueRead,
            characteristic: characteristic,
            device: this.buildDeviceObjectForEvent(deviceId, true),
        };
        this.publishG2CEvent(charEvent);
    };
    MqttFacade.prototype.reportCharacteristicWrite = function (deviceId, characteristic) {
        var event = {
            type: g2c_1.EventType.CharacteristicValueWrite,
            characteristic: characteristic,
            device: this.buildDeviceObjectForEvent(deviceId, true),
        };
        this.publishG2CEvent(event);
    };
    MqttFacade.prototype.reportCharacteristicChanged = function (deviceId, characteristic) {
        var event = {
            type: g2c_1.EventType.CharacteristicValueChanged,
            characteristic: characteristic,
            device: this.buildDeviceObjectForEvent(deviceId, true),
        };
        this.publishG2CEvent(event);
    };
    MqttFacade.prototype.reportDescriptorRead = function (deviceId, descriptor) {
        var event = {
            type: g2c_1.EventType.DescriptorValueRead,
            descriptor: descriptor,
            device: this.buildDeviceObjectForEvent(deviceId, true),
        };
        this.publishG2CEvent(event);
    };
    MqttFacade.prototype.reportDescriptorWrite = function (deviceId, descriptor) {
        var event = {
            type: g2c_1.EventType.DescriptorValueWrite,
            descriptor: descriptor,
            device: this.buildDeviceObjectForEvent(deviceId, true),
        };
        this.publishG2CEvent(event);
    };
    MqttFacade.prototype.reportDescriptorChanged = function (deviceId, descriptor) {
        var event = {
            type: g2c_1.EventType.DescriptorValueChanged,
            descriptor: descriptor,
            device: this.buildDeviceObjectForEvent(deviceId, true),
        };
        this.publishG2CEvent(event);
    };
    MqttFacade.prototype.publishG2CEvent = function (event) {
        var g2cEvent = this.getG2CEvent(event);
        this.publish(this.g2cTopic, g2cEvent);
    };
    MqttFacade.prototype.getG2CEvent = function (event) {
        if (!event.timestamp) {
            event.timestamp = new Date().toISOString();
        }
        return {
            type: 'event',
            gatewayId: this.gatewayId,
            event: event,
        };
    };
    MqttFacade.prototype.publish = function (topic, event) {
        event.messageId = this.messageId++;
        var message = JSON.stringify(event);
        this.mqttClient.publish(topic, message);
    };
    MqttFacade.prototype.buildDeviceObjectForEvent = function (deviceId, connected) {
        return {
            address: {
                address: deviceId,
                type: 'randomStatic',
            },
            id: deviceId,
            status: {
                connected: connected,
            },
        };
    };
    return MqttFacade;
}());
exports.MqttFacade = MqttFacade;
//# sourceMappingURL=mqttFacade.js.map