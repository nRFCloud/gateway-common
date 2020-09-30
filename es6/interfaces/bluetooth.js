export class Descriptor {
    constructor(uuid, characteristicUuid = null, serviceUuid = null) {
        this.uuid = uuid;
        if (characteristicUuid && serviceUuid) {
            this.path = `${serviceUuid}/${characteristicUuid}/${uuid}`;
        }
    }
}
export class Characteristic {
    constructor(uuid, serviceUuid = null) {
        this.uuid = uuid;
        if (serviceUuid) {
            this.path = `${serviceUuid}/${uuid}`;
        }
    }
}
export class Service {
    constructor(uuid) {
        this.uuid = uuid;
    }
}
//# sourceMappingURL=bluetooth.js.map