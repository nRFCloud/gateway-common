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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BluetoothAdapter = exports.AdapterEvent = void 0;
var events_1 = require("events");
var AdapterEvent;
(function (AdapterEvent) {
    AdapterEvent["DeviceDisconnected"] = "DEVICE_DISCONNECTED";
    AdapterEvent["DeviceConnected"] = "DEVICE_CONNECTED";
})(AdapterEvent = exports.AdapterEvent || (exports.AdapterEvent = {}));
var BluetoothAdapter = /** @class */ (function (_super) {
    __extends(BluetoothAdapter, _super);
    function BluetoothAdapter() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return BluetoothAdapter;
}(events_1.EventEmitter));
exports.BluetoothAdapter = BluetoothAdapter;
//# sourceMappingURL=bluetoothAdapter.js.map