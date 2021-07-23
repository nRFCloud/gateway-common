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
exports.FotaQ = exports.FotaQueue = exports.FotaEvent = void 0;
var events_1 = require("events");
var jszip_1 = __importDefault(require("jszip"));
var fotaAdapter_1 = require("./fotaAdapter");
var utils_1 = require("./utils");
var FotaEvent;
(function (FotaEvent) {
    FotaEvent["DownloadProgress"] = "downloadProgress";
    FotaEvent["ErrorUpdating"] = "errorUpdating";
    FotaEvent["DfuStatus"] = "dfuStatus";
})(FotaEvent = exports.FotaEvent || (exports.FotaEvent = {}));
var FotaQueue = /** @class */ (function (_super) {
    __extends(FotaQueue, _super);
    function FotaQueue() {
        var _this = _super.call(this) || this;
        _this.queue = [];
        _this.hasStarted = false;
        _this.fileMap = {};
        _this._currentItem = null;
        _this.on(FotaEvent.DfuStatus, function (_item, update) {
            switch (update.status) {
                case fotaAdapter_1.UpdateStatus.DfuAborted:
                case fotaAdapter_1.UpdateStatus.DfuCompleted:
                    _this.doNextItem();
                    break;
            }
        });
        _this.on(FotaEvent.ErrorUpdating, function () { _this.doNextItem(); });
        return _this;
    }
    Object.defineProperty(FotaQueue.prototype, "currentItem", {
        get: function () {
            return this._currentItem;
        },
        enumerable: false,
        configurable: true
    });
    FotaQueue.prototype.setFotaAdapter = function (adapter) {
        this.fotaAdapter = adapter;
    };
    FotaQueue.prototype.add = function (newItem) {
        //only enqueue items that aren't already enqueued
        if (!this.queue.find(function (item) { return item.deviceId === newItem.deviceId && item.jobId === newItem.jobId; })) {
            this.queue.push(newItem);
        }
        this.start();
    };
    FotaQueue.prototype.start = function () {
        if (this.fotaAdapter && this.queue.length && !this.hasStarted) {
            this.hasStarted = true;
            this.doNextItem();
        }
    };
    FotaQueue.prototype.doNextItem = function () {
        var _this = this;
        this._currentItem = null;
        if (this.queue.length < 1) {
            this.hasStarted = false;
            return;
        }
        var nextItem = this.queue.shift();
        setTimeout(function () { return _this.processItem(nextItem); }); //pull of out sync into next tick
    };
    FotaQueue.prototype.processItem = function (item) {
        return __awaiter(this, void 0, void 0, function () {
            var filePromises, _loop_1, this_1, _i, _a, uri, zip, application, _b, _c, uri, fileName, manifest, blob;
            var _this = this;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        this._currentItem = item;
                        filePromises = [];
                        _loop_1 = function (uri) {
                            if (typeof this_1.fileMap[uri] === 'undefined') {
                                filePromises.push(utils_1.downloadFile(uri, function (percentage) {
                                    _this.emit(FotaEvent.DownloadProgress, item, percentage);
                                }).then(function (blob) { return _this.fileMap[uri] = blob; }));
                            }
                        };
                        this_1 = this;
                        for (_i = 0, _a = item.uris; _i < _a.length; _i++) {
                            uri = _a[_i];
                            _loop_1(uri);
                        }
                        return [4 /*yield*/, Promise.all(filePromises)];
                    case 1:
                        _d.sent();
                        zip = new jszip_1.default();
                        application = {
                            bin_file: '',
                            dat_file: '',
                        };
                        for (_b = 0, _c = item.uris; _b < _c.length; _b++) {
                            uri = _c[_b];
                            if (typeof this.fileMap[uri] === 'undefined') {
                                // return this.processItem(item);
                                throw new Error("File with " + uri + " not downloaded");
                            }
                            fileName = uri.substring(uri.lastIndexOf('/') + 1);
                            zip.file(fileName, this.fileMap[uri]);
                            if (fileName.indexOf('.bin') > -1) {
                                application.bin_file = fileName;
                            }
                            else {
                                application.dat_file = fileName;
                            }
                        }
                        manifest = {
                            manifest: {
                                application: application,
                            },
                        };
                        zip.file('manifest.json', JSON.stringify(manifest));
                        return [4 /*yield*/, zip.generateAsync({ type: 'blob' })];
                    case 2:
                        blob = _d.sent();
                        this.fotaAdapter.startUpdate(blob, item.deviceId, function (update) {
                            if (update.error) {
                                _this.emit(FotaEvent.ErrorUpdating, item, update);
                                return;
                            }
                            _this.emit(FotaEvent.DfuStatus, item, update);
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    return FotaQueue;
}(events_1.EventEmitter));
exports.FotaQueue = FotaQueue;
exports.FotaQ = new FotaQueue();
//# sourceMappingURL=fotaQueue.js.map