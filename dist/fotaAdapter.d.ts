export declare enum UpdateStatus {
    DeviceConnecting = "deviceConnecting",
    DeviceConnected = "deviceConnected",
    DfuProcessStarting = "dfuProcessStarting",
    DfuProcessStarted = "dfuProcessStarted",
    EnablingDfuMode = "enablingDfuMode",
    FirmwareValidating = "firmwareValidating",
    DeviceDisconnecting = "deviceDisconnecting",
    DeviceDisconnected = "deviceDisconnected",
    DfuCompleted = "dfuCompleted",
    DfuAborted = "dfuAborted",
    ProgressChanged = "progressChanged"
}
export interface UpdateInformation {
    id: string;
    status: UpdateStatus;
    error?: number;
    errorType?: number;
    message?: string;
    progress?: {
        percent: number;
        speed: number;
        avgSpeed: number;
        currentPart: number;
        partsTotal: number;
    };
}
export declare abstract class FotaAdapter {
    abstract startUpdate(file: Blob, deviceId: string, callback: (status: UpdateInformation) => void): void;
}
