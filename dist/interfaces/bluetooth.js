"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Service = exports.Characteristic = exports.Descriptor = void 0;
var Descriptor = /** @class */ (function () {
    function Descriptor(uuid, characteristicUuid, serviceUuid) {
        if (characteristicUuid === void 0) { characteristicUuid = null; }
        if (serviceUuid === void 0) { serviceUuid = null; }
        this.uuid = uuid;
        if (characteristicUuid && serviceUuid) {
            this.path = serviceUuid + "/" + characteristicUuid + "/" + uuid;
        }
    }
    return Descriptor;
}());
exports.Descriptor = Descriptor;
var Characteristic = /** @class */ (function () {
    function Characteristic(uuid, serviceUuid) {
        if (serviceUuid === void 0) { serviceUuid = null; }
        this.uuid = uuid;
        if (serviceUuid) {
            this.path = serviceUuid + "/" + uuid;
        }
    }
    return Characteristic;
}());
exports.Characteristic = Characteristic;
var Service = /** @class */ (function () {
    function Service(uuid) {
        this.uuid = uuid;
    }
    return Service;
}());
exports.Service = Service;
//# sourceMappingURL=bluetooth.js.map