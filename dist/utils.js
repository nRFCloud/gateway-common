"use strict";
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
exports.downloadFile = exports.assumeType = exports.shortenUUID = void 0;
var cross_fetch_1 = __importDefault(require("cross-fetch"));
function shortenUUID(uuid) {
    return uuid.replace(/-/g, '').toUpperCase();
}
exports.shortenUUID = shortenUUID;
//This bit of code is to assert that an object is of a type
//From https://github.com/microsoft/TypeScript/issues/10421#issuecomment-518806979
function assumeType(x) {
    return; // ¯\_(ツ)_/¯
}
exports.assumeType = assumeType;
function downloadFile(fileUrl, statusCallback) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var response, reader, contentLength, receivedLength, chunks, _b, done, value, percentage;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, cross_fetch_1.default(fileUrl)];
                case 1:
                    response = _c.sent();
                    if (!response.ok) {
                        throw new Error("Response was not ok: " + response.status + " " + response.statusText);
                    }
                    if (!(typeof ((_a = response.body) === null || _a === void 0 ? void 0 : _a.getReader) === 'function')) return [3 /*break*/, 5];
                    reader = response.body.getReader();
                    contentLength = +response.headers.get('Content-Length');
                    receivedLength = 0;
                    chunks = [];
                    _c.label = 2;
                case 2:
                    if (!true) return [3 /*break*/, 4];
                    return [4 /*yield*/, reader.read()];
                case 3:
                    _b = _c.sent(), done = _b.done, value = _b.value;
                    if (done) {
                        return [3 /*break*/, 4];
                    }
                    chunks.push(value);
                    receivedLength += value.length;
                    percentage = Math.round(receivedLength / contentLength * 100);
                    if (typeof statusCallback === 'function') {
                        statusCallback(percentage);
                    }
                    return [3 /*break*/, 2];
                case 4: return [2 /*return*/, new Blob(chunks)];
                case 5: 
                //Can't do incremental download, just get the blob
                return [2 /*return*/, response.blob()];
            }
        });
    });
}
exports.downloadFile = downloadFile;
//# sourceMappingURL=utils.js.map