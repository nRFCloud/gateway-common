"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gateway = exports.GatewayEvent = void 0;
var awsIot = __importStar(require("aws-iot-device-sdk"));
var events_1 = require("events");
var isEqual_1 = __importDefault(require("lodash/isEqual"));
var beacon_utilities_1 = require("beacon-utilities");
var bluetoothAdapter_1 = require("./bluetoothAdapter");
var mqttFacade_1 = require("./mqttFacade");
var bluetooth_1 = require("./interfaces/bluetooth");
var c2g_1 = require("./interfaces/c2g");
var utils_1 = require("./utils");
var CLIENT_CHARACTERISTIC_CONFIGURATION = '2902';
var GatewayEvent;
(function (GatewayEvent) {
    GatewayEvent["NameChanged"] = "NAME_CHANGED";
    GatewayEvent["Deleted"] = "GATEWAY_DELETED";
    GatewayEvent["DeviceRemoved"] = "DEVICE_REMOVED";
    GatewayEvent["ConnectionsChanged"] = "CONNECTIONS_CHANGED";
    GatewayEvent["StatusChanged"] = "STATUS_CHANGED";
    GatewayEvent["DeviceUpdate"] = "DEVICE_UPDATE";
    GatewayEvent["BeaconUpdate"] = "BEACON_UPDATE";
})(GatewayEvent = exports.GatewayEvent || (exports.GatewayEvent = {}));
var Gateway = /** @class */ (function (_super) {
    __extends(Gateway, _super);
    function Gateway(config) {
        var _a;
        var _this = _super.call(this) || this;
        _this.deviceConnections = {};
        _this.deviceConnectionIntervalHolder = null;
        _this.lastTriedAddress = null;
        _this._name = '';
        _this.discoveryCache = {};
        _this.watchList = [];
        _this.gatewayId = config.gatewayId;
        _this.stage = config.stage || 'prod';
        _this.tenantId = config.tenantId;
        _this.bluetoothAdapter = config.bluetoothAdapter;
        _this.watchInterval = config.watchInterval || 60;
        _this.watchDuration = config.watchDuration || 2;
        _this.supportsBLEFOTA = (_a = config.supportsBLEFOTA) !== null && _a !== void 0 ? _a : false;
        _this.state = {
            isTryingConnection: false,
            scanning: false,
            connected: false,
        };
        _this.bluetoothAdapter.on(bluetoothAdapter_1.AdapterEvent.DeviceConnected, function (deviceId) {
            _this.deviceConnections[deviceId] = true;
            _this.reportConnectionUp(deviceId);
        });
        _this.bluetoothAdapter.on(bluetoothAdapter_1.AdapterEvent.DeviceDisconnected, function (deviceId) {
            if (typeof _this.deviceConnections[deviceId] !== 'undefined') {
                _this.deviceConnections[deviceId] = false;
                _this.reportConnectionDown(deviceId);
            }
        });
        //A Gateway is just an AWS IoT device, here's where it's started and connected
        _this.gatewayDevice = new awsIot.device({
            keyPath: config.keyPath,
            certPath: config.certPath,
            caPath: config.caPath,
            clientId: _this.gatewayId,
            host: config.host,
            protocol: config.protocol || (config.accessKeyId ? 'wss' : 'mqtts'),
            accessKeyId: config.accessKeyId,
            secretKey: config.secretKey,
            sessionToken: config.sessionToken,
            debug: !!config.debug,
        });
        _this.gatewayDevice.on('connect', function () {
            console.log('connect');
            //To finish the connection, an empty string must be published to the shadowGet topic
            _this.gatewayDevice.publish(_this.shadowGetTopic, '');
            _this.mqttFacade.reportBLEFOTAStatus(_this.supportsBLEFOTA);
            _this.updateState({ connected: true });
        });
        _this.gatewayDevice.on('message', function (topic, payload) {
            _this.handleMessage(topic, payload);
        });
        _this.gatewayDevice.on('error', _this.handleError);
        _this.gatewayDevice.on('close', function () {
            _this.updateState({ connected: false });
        });
        /*
        The gateway needs to listen to three topics:
        c2g: this is the primary way that the cloud talks to the gateway (cloud2gateway). Operations are sent over this topic like "start scanning"
        shadowGet/accepted:
        shadowUpdate: Both of these deal with the device's shadow. This is how bluetooth devices are "added" to a gateway as well as beacons. They're for different things, but can be handled the same
         */
        _this.gatewayDevice.subscribe(_this.c2gTopic);
        _this.gatewayDevice.subscribe(_this.shadowGetTopic + "/accepted");
        _this.gatewayDevice.subscribe(_this.shadowUpdateTopic);
        _this.mqttFacade = new mqttFacade_1.MqttFacade(_this.gatewayDevice, _this.g2cTopic, _this.shadowTopic, _this.gatewayId);
        _this.watcherHolder = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.performWatches()];
                    case 1:
                        _a.sent();
                        this.performRSSIs();
                        return [2 /*return*/];
                }
            });
        }); }, _this.watchInterval * 1000);
        return _this;
    }
    Object.defineProperty(Gateway.prototype, "c2gTopic", {
        get: function () {
            return this.stage + "/" + this.tenantId + "/gateways/" + this.gatewayId + "/c2g";
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Gateway.prototype, "g2cTopic", {
        get: function () {
            return this.stage + "/" + this.tenantId + "/gateways/" + this.gatewayId + "/g2c";
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Gateway.prototype, "beacons", {
        get: function () {
            return this.watchList;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Gateway.prototype, "connections", {
        get: function () {
            return this.deviceConnections;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Gateway.prototype, "name", {
        get: function () {
            return this._name;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Gateway.prototype, "shadowGetTopic", {
        get: function () {
            return this.shadowTopic + "/get";
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Gateway.prototype, "shadowUpdateTopic", {
        get: function () {
            return this.shadowTopic + "/update/delta";
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Gateway.prototype, "shadowTopic", {
        get: function () {
            return this.stage + "/" + this.tenantId + "/" + this.gatewayId + "/shadow";
        },
        enumerable: false,
        configurable: true
    });
    Gateway.prototype.handleMessage = function (topic, payload) {
        var message = JSON.parse(payload);
        if (topic === this.c2gTopic) {
            this.handleC2GMessage(message);
        }
        if (topic.startsWith(this.shadowTopic)) {
            this.handleShadowMessage(message);
        }
    };
    //The cloud is telling us to perform a task (operation)
    Gateway.prototype.handleC2GMessage = function (message) {
        console.log('got g2c message', message);
        if (!message || !message.type || !message.id || message.type !== 'operation' || !message.operation || !message.operation.type) {
            throw new Error('Unknown message ' + JSON.stringify(message));
        }
        var op = message.operation;
        switch (op.type) {
            case c2g_1.C2GEventType.Scan: //Do a bluetooth scan
                utils_1.assumeType(op);
                this.startScan(op);
                break;
            case c2g_1.C2GEventType.PerformDiscover: //Do a discover AND full value read
                utils_1.assumeType(op);
                if (op.deviceAddress) {
                    this.doDiscover(op.deviceAddress);
                }
                break;
            case c2g_1.C2GEventType.CharacteristicValueRead: //Read a characteristic
                utils_1.assumeType(op);
                if (op.deviceAddress && op.serviceUUID && op.characteristicUUID) {
                    this.doCharacteristicRead(op);
                }
                break;
            case c2g_1.C2GEventType.CharacteristicValueWrite: //Write value to a characteristic
                utils_1.assumeType(op);
                if (op.deviceAddress &&
                    op.serviceUUID &&
                    op.characteristicUUID &&
                    op.characteristicValue) {
                    this.doCharacteristicWrite(op);
                }
                break;
            case c2g_1.C2GEventType.DescriptorValueRead: //Read a descriptor
                utils_1.assumeType(op);
                if (op.deviceAddress &&
                    op.characteristicUUID &&
                    op.serviceUUID &&
                    op.descriptorUUID) {
                    this.doDescriptorRead(op);
                }
                break;
            case c2g_1.C2GEventType.DescriptoValueWrite: //Write value to a descriptor
                utils_1.assumeType(op);
                if (op.deviceAddress &&
                    op.characteristicUUID &&
                    op.serviceUUID &&
                    op.descriptorUUID &&
                    op.descriptorValue) {
                    this.doDescriptorWrite(op);
                }
                break;
            case c2g_1.C2GEventType.GatewayStatus: //Get information about the gateway
                //This is probably not used for anything
                break;
            case c2g_1.C2GEventType.DeleteYourself: //User has deleted this gateway from their account
                console.log('Gateway has been deleted');
                this.emit(GatewayEvent.Deleted);
                break;
        }
    };
    //The gateway's shadow has changed, we need to react to the change
    Gateway.prototype.handleShadowMessage = function (message) {
        var _a;
        if (!message.state) {
            return;
        }
        var newState = message.state.desired || message.state;
        if (!newState) {
            return;
        }
        //state.desiredConnections is the list of bluetooth connections we should be worried about
        if (newState.desiredConnections) {
            if (!((_a = newState.desiredConnections) === null || _a === void 0 ? void 0 : _a.length)) {
                this.updateDeviceConnections([]);
                return;
            }
            if (typeof newState.desiredConnections[0] === 'string') {
                this.updateDeviceConnections(newState.desiredConnections);
            }
            else if (typeof newState.desiredConnections[0].id !== 'undefined') {
                this.updateDeviceConnections(newState.desiredConnections.map(function (conn) { return conn.id; }));
            }
        }
        //state.name is the name of the gateway
        if (newState.name) {
            this.emit(GatewayEvent.NameChanged, newState.name);
        }
        //state.beacons is a list of beacons we should watch
        if (newState.beacons) {
            this.handleBeaconState(newState.beacons);
        }
    };
    //Beacons are just a flat list of ids
    Gateway.prototype.handleBeaconState = function (beacons) {
        this.watchList = beacons;
    };
    //On a timer, we should report the RSSIs of the devices
    //The way to report about the devices is to send a "scan result" message with the updated information
    Gateway.prototype.performRSSIs = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, deviceId, result, updatedDeviceObj, err_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _i = 0, _a = Object.keys(this.deviceConnections);
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        deviceId = _a[_i];
                        if (!this.deviceConnections[deviceId]) {
                            //Device isn't connected, don't bother trying to get the rssi
                            return [3 /*break*/, 5];
                        }
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.bluetoothAdapter.getRSSI(deviceId)];
                    case 3:
                        result = _b.sent();
                        updatedDeviceObj = Object.assign({}, result, {
                            rssi: result.rssi,
                            address: {
                                address: deviceId,
                                type: '',
                            },
                            name: result.name,
                        });
                        this.emit(GatewayEvent.DeviceUpdate, updatedDeviceObj);
                        this.mqttFacade.handleScanResult(updatedDeviceObj, false);
                        return [3 /*break*/, 5];
                    case 4:
                        err_1 = _b.sent();
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    //On a timer, we should report about any beacons
    //Like RSSIs, we just send the information as a "scan result"
    Gateway.prototype.performWatches = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (!this.watchList || this.watchList.length < 1) {
                    return [2 /*return*/];
                }
                //Skip if we're already scanning
                if (this.state.scanning) {
                    return [2 /*return*/];
                }
                this.updateState({ scanning: true });
                //The way to track beacons is to just scan for them
                return [2 /*return*/, new Promise(function (resolve) {
                        _this.bluetoothAdapter.startScan(function (result) {
                            if (_this.watchList.includes(result.address.address)) {
                                _this.emit(GatewayEvent.BeaconUpdate, result);
                                _this.mqttFacade.handleScanResult(result, false);
                            }
                        });
                        setTimeout(function () {
                            _this.bluetoothAdapter.stopScan();
                            _this.updateState({ scanning: false });
                            resolve();
                        }, _this.watchDuration * 1000);
                    })];
            });
        });
    };
    Gateway.prototype.handleError = function (error) {
        console.error('Error from MQTT', error);
    };
    //Do a "discover" operation on a device, this will do a standard bluetooth discover AS WELL AS grabs the current value for each characteristic and descriptor
    Gateway.prototype.doDiscover = function (deviceAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!(typeof this.discoveryCache[deviceAddress] === 'undefined')) return [3 /*break*/, 2];
                        _a = this.discoveryCache;
                        _b = deviceAddress;
                        return [4 /*yield*/, this.bluetoothAdapter.discover(deviceAddress)];
                    case 1:
                        _a[_b] = _c.sent();
                        _c.label = 2;
                    case 2:
                        this.mqttFacade.reportDiscover(deviceAddress, this.discoveryCache[deviceAddress]);
                        return [2 /*return*/];
                }
            });
        });
    };
    //Do a characteristic read operation
    Gateway.prototype.doCharacteristicRead = function (op) {
        return __awaiter(this, void 0, void 0, function () {
            var char, _a, err_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        char = new bluetooth_1.Characteristic(op.characteristicUUID, op.serviceUUID);
                        _a = char;
                        return [4 /*yield*/, this.bluetoothAdapter.readCharacteristicValue(op.deviceAddress, char)];
                    case 1:
                        _a.value = _b.sent();
                        this.mqttFacade.reportCharacteristicRead(op.deviceAddress, char);
                        return [3 /*break*/, 3];
                    case 2:
                        err_2 = _b.sent();
                        this.mqttFacade.reportError(err_2);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    //Do a characteristic write operation, note that we don't care about write without response
    Gateway.prototype.doCharacteristicWrite = function (op) {
        return __awaiter(this, void 0, void 0, function () {
            var char, err_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        char = new bluetooth_1.Characteristic(op.characteristicUUID, op.serviceUUID);
                        char.value = op.characteristicValue;
                        return [4 /*yield*/, this.bluetoothAdapter.writeCharacteristicValue(op.deviceAddress, char)];
                    case 1:
                        _a.sent();
                        this.mqttFacade.reportCharacteristicWrite(op.deviceAddress, char);
                        this.mqttFacade.reportCharacteristicChanged(op.deviceAddress, char);
                        return [3 /*break*/, 3];
                    case 2:
                        err_3 = _a.sent();
                        this.mqttFacade.reportError(err_3);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    //Do a descriptor read operation
    Gateway.prototype.doDescriptorRead = function (op) {
        return __awaiter(this, void 0, void 0, function () {
            var descriptor, _a, err_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        descriptor = new bluetooth_1.Descriptor(op.descriptorUUID, op.characteristicUUID, op.serviceUUID);
                        _a = descriptor;
                        return [4 /*yield*/, this.bluetoothAdapter.readDescriptorValue(op.deviceAddress, descriptor)];
                    case 1:
                        _a.value = _b.sent();
                        this.mqttFacade.reportDescriptorRead(op.deviceAddress, descriptor);
                        return [3 /*break*/, 3];
                    case 2:
                        err_4 = _b.sent();
                        this.mqttFacade.reportError(err_4);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    //Do a descriptor write operation
    //intercept "subscribe" events (writing to 2902) and instead setup/tear down a subscription
    Gateway.prototype.doDescriptorWrite = function (op) {
        return __awaiter(this, void 0, void 0, function () {
            var descriptor, characteristic, err_5;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 9]);
                        descriptor = new bluetooth_1.Descriptor(op.descriptorUUID, op.characteristicUUID, op.serviceUUID);
                        descriptor.value = op.descriptorValue;
                        if (!(descriptor.uuid === CLIENT_CHARACTERISTIC_CONFIGURATION)) return [3 /*break*/, 5];
                        characteristic = new bluetooth_1.Characteristic(op.characteristicUUID, op.serviceUUID);
                        if (!(descriptor.value.length > 0 && descriptor.value[0])) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.bluetoothAdapter.subscribe(op.deviceAddress, characteristic, function (characteristic) {
                                _this.mqttFacade.reportCharacteristicChanged(op.deviceAddress, characteristic);
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.bluetoothAdapter.unsubscribe(op.deviceAddress, characteristic)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [3 /*break*/, 7];
                    case 5: return [4 /*yield*/, this.bluetoothAdapter.writeDescriptorValue(op.deviceAddress, descriptor)];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7:
                        this.mqttFacade.reportDescriptorChanged(op.deviceAddress, descriptor);
                        this.mqttFacade.reportDescriptorWrite(op.deviceAddress, descriptor);
                        return [3 /*break*/, 9];
                    case 8:
                        err_5 = _a.sent();
                        this.mqttFacade.reportError(err_5);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    //Filter out results that don't match the sent operation
    Gateway.prototype.shouldIncludeResult = function (op, result) {
        if (op.scanType === c2g_1.ScanType.Beacon && !beacon_utilities_1.isBeacon(result.advertisementData)) {
            return false;
        }
        if (op.filter) {
            if (op.filter.name && result.name.indexOf(op.filter.name) < 0) {
                return false;
            }
            if (op.filter.rssi && result.rssi < op.filter.rssi) {
                return false;
            }
        }
        return true;
    };
    //Do a scanning operation
    Gateway.prototype.startScan = function (op) {
        var _this = this;
        if (this.state.scanning) {
            return;
        }
        this.updateState({ scanning: true });
        this.bluetoothAdapter.startScan(function (result) {
            if (_this.shouldIncludeResult(op, result)) {
                _this.mqttFacade.handleScanResult(result, false);
            }
        });
        setTimeout(function () {
            _this.bluetoothAdapter.stopScan();
            _this.mqttFacade.handleScanResult(null, true);
            _this.updateState({ scanning: false });
        }, op.scanTimeout * 1000);
    };
    //Given the desired connections from the shadow, update our list of connections
    Gateway.prototype.updateDeviceConnections = function (connections) {
        return __awaiter(this, void 0, void 0, function () {
            var existingConnections, deviceIds, connectionsToAdd, connectionsToRemove, _i, connectionsToRemove_1, connectionToRemove, error_1, _a, connectionsToAdd_1, connectionToAdd;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        existingConnections = __assign({}, this.deviceConnections);
                        deviceIds = Object.keys(existingConnections);
                        connectionsToAdd = connections.filter(function (id) { return deviceIds.indexOf(id) < 0; });
                        connectionsToRemove = deviceIds.filter(function (id) { return connections.indexOf(id) < 0; });
                        _i = 0, connectionsToRemove_1 = connectionsToRemove;
                        _b.label = 1;
                    case 1:
                        if (!(_i < connectionsToRemove_1.length)) return [3 /*break*/, 7];
                        connectionToRemove = connectionsToRemove_1[_i];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, 5, 6]);
                        return [4 /*yield*/, this.bluetoothAdapter.disconnect(connectionToRemove)];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        error_1 = _b.sent();
                        console.error('error', "Error removing connection to device " + (error_1 instanceof Object ? JSON.stringify(error_1) : error_1));
                        return [3 /*break*/, 6];
                    case 5:
                        if (typeof this.deviceConnections[connectionToRemove] !== 'undefined') {
                            delete this.deviceConnections[connectionToRemove];
                            this.emit(GatewayEvent.DeviceRemoved, connectionToRemove);
                        }
                        return [7 /*endfinally*/];
                    case 6:
                        _i++;
                        return [3 /*break*/, 1];
                    case 7:
                        for (_a = 0, connectionsToAdd_1 = connectionsToAdd; _a < connectionsToAdd_1.length; _a++) {
                            connectionToAdd = connectionsToAdd_1[_a];
                            if (deviceIds.indexOf(connectionToAdd) < 0) {
                                this.deviceConnections[connectionToAdd] = false;
                            }
                        }
                        this.startDeviceConnections();
                        if (!isEqual_1.default(this.deviceConnections, existingConnections)) {
                            //If there was a difference, report the current connections
                            this.reportConnections();
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    //Report the current connections
    Gateway.prototype.reportConnections = function () {
        var statusConnections = this.getStatusConnections();
        this.mqttFacade.reportConnections(statusConnections);
        this.emit(GatewayEvent.ConnectionsChanged, statusConnections);
    };
    //Convert our list of connections to what the cloud is expecting
    Gateway.prototype.getStatusConnections = function () {
        var statusConnections = {};
        for (var _i = 0, _a = Object.keys(this.deviceConnections); _i < _a.length; _i++) {
            var connection = _a[_i];
            statusConnections[connection] = {
                id: connection,
                status: {
                    connected: this.deviceConnections[connection],
                },
            };
        }
        return statusConnections;
    };
    //On an interval, try to initiate connections. This is started only when we have connections to initiate
    Gateway.prototype.startDeviceConnections = function () {
        var _this = this;
        if (this.deviceConnectionIntervalHolder === null) {
            this.deviceConnectionIntervalHolder = setInterval(function () { return _this.initiateNextConnection(); }, 1000);
        }
    };
    //Try to initiate the next connection on the list
    //Will go through the list one at a time to connect (so it won't be stuck trying to connect to only the first one in the list)
    Gateway.prototype.initiateNextConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var connections, nextAddressToTry, indexOf, error_2;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.state.isTryingConnection) {
                            return [2 /*return*/];
                        }
                        connections = Object.keys(this.deviceConnections).filter(function (deviceId) { return !_this.deviceConnections[deviceId]; });
                        if (connections.length < 1) { //everything is already connected
                            return [2 /*return*/];
                        }
                        if (!this.lastTriedAddress || connections.indexOf(this.lastTriedAddress) < 0) {
                            nextAddressToTry = connections[0];
                        }
                        else {
                            indexOf = connections.indexOf(this.lastTriedAddress);
                            if (indexOf + 1 >= connections.length) {
                                nextAddressToTry = connections[0];
                            }
                            else {
                                nextAddressToTry = connections[indexOf + 1];
                            }
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        this.updateState({ isTryingConnection: true });
                        return [4 /*yield*/, this.bluetoothAdapter.connect(nextAddressToTry)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        error_2 = _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        this.lastTriedAddress = nextAddressToTry;
                        this.updateState({ isTryingConnection: false });
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    Gateway.prototype.stopDeviceConnections = function () {
        clearInterval(this.deviceConnectionIntervalHolder);
        this.deviceConnectionIntervalHolder = null;
    };
    //Whenever a device is connected or dissconnected, we need to report it with two messages
    Gateway.prototype.reportConnectionUp = function (deviceId) {
        this.reportConnections();
        this.mqttFacade.reportConnectionUp(deviceId);
    };
    Gateway.prototype.reportConnectionDown = function (deviceId) {
        this.reportConnections();
        this.mqttFacade.reportConnectionDown(deviceId);
    };
    Gateway.prototype.updateState = function (newState) {
        this.state = Object.assign({}, this.state, newState);
        this.emit(GatewayEvent.StatusChanged, this.state);
    };
    return Gateway;
}(events_1.EventEmitter));
exports.Gateway = Gateway;
//# sourceMappingURL=gateway.js.map