"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FotaAdapter = exports.UpdateStatus = void 0;
var UpdateStatus;
(function (UpdateStatus) {
    UpdateStatus["DeviceConnecting"] = "deviceConnecting";
    UpdateStatus["DeviceConnected"] = "deviceConnected";
    UpdateStatus["DfuProcessStarting"] = "dfuProcessStarting";
    UpdateStatus["DfuProcessStarted"] = "dfuProcessStarted";
    UpdateStatus["EnablingDfuMode"] = "enablingDfuMode";
    UpdateStatus["FirmwareValidating"] = "firmwareValidating";
    UpdateStatus["DeviceDisconnecting"] = "deviceDisconnecting";
    UpdateStatus["DeviceDisconnected"] = "deviceDisconnected";
    UpdateStatus["DfuCompleted"] = "dfuCompleted";
    UpdateStatus["DfuAborted"] = "dfuAborted";
    UpdateStatus["ProgressChanged"] = "progressChanged";
})(UpdateStatus = exports.UpdateStatus || (exports.UpdateStatus = {}));
var FotaAdapter = /** @class */ (function () {
    function FotaAdapter() {
    }
    return FotaAdapter;
}());
exports.FotaAdapter = FotaAdapter;
//# sourceMappingURL=fotaAdapter.js.map