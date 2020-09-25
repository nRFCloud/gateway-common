import { EventEmitter } from 'events';
export var AdapterEvent;
(function (AdapterEvent) {
    AdapterEvent["DeviceDisconnected"] = "DEVICE_DISCONNECTED";
    AdapterEvent["DeviceConnected"] = "DEVICE_CONNECTED";
})(AdapterEvent || (AdapterEvent = {}));
export class BluetoothAdapter extends EventEmitter {
}
//# sourceMappingURL=bluetoothAdapter.js.map