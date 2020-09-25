"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assumeType = exports.shortenUUID = void 0;
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
//# sourceMappingURL=utils.js.map