export function shortenUUID(uuid) {
    return uuid.replace(/-/g, '').toUpperCase();
}
//This bit of code is to assert that an object is of a type
//From https://github.com/microsoft/TypeScript/issues/10421#issuecomment-518806979
export function assumeType(x) {
    return; // ¯\_(ツ)_/¯
}
//# sourceMappingURL=utils.js.map