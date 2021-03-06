export var C2GEventType;
(function (C2GEventType) {
    C2GEventType["DeleteYourself"] = "delete_yourself";
    C2GEventType["GatewayStatus"] = "get_gateway_status";
    C2GEventType["DescriptoValueWrite"] = "device_descriptor_value_write";
    C2GEventType["DescriptorValueRead"] = "device_descriptor_value_read";
    C2GEventType["CharacteristicValueRead"] = "device_characteristic_value_read";
    C2GEventType["Scan"] = "scan";
    C2GEventType["PerformDiscover"] = "device_discover";
    C2GEventType["CharacteristicValueWrite"] = "device_characteristic_value_write";
})(C2GEventType || (C2GEventType = {}));
export var ScanType;
(function (ScanType) {
    ScanType[ScanType["Regular"] = 0] = "Regular";
    ScanType[ScanType["Beacon"] = 1] = "Beacon";
})(ScanType || (ScanType = {}));
export var ScanReporting;
(function (ScanReporting) {
    ScanReporting["Instant"] = "instant";
    ScanReporting["Batch"] = "batch";
})(ScanReporting || (ScanReporting = {}));
//# sourceMappingURL=c2g.js.map