"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobExecutionStatus = void 0;
var JobExecutionStatus;
(function (JobExecutionStatus) {
    JobExecutionStatus[JobExecutionStatus["Queued"] = 0] = "Queued";
    JobExecutionStatus[JobExecutionStatus["InProgress"] = 1] = "InProgress";
    JobExecutionStatus[JobExecutionStatus["Failed"] = 2] = "Failed";
    JobExecutionStatus[JobExecutionStatus["Succeeded"] = 3] = "Succeeded";
    JobExecutionStatus[JobExecutionStatus["TimedOut"] = 4] = "TimedOut";
    JobExecutionStatus[JobExecutionStatus["Cancelled"] = 5] = "Cancelled";
    JobExecutionStatus[JobExecutionStatus["Rejected"] = 6] = "Rejected";
    JobExecutionStatus[JobExecutionStatus["Downloading"] = 7] = "Downloading";
})(JobExecutionStatus = exports.JobExecutionStatus || (exports.JobExecutionStatus = {}));
//# sourceMappingURL=fota.js.map