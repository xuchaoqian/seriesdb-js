"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Store = void 0;
class Store {
    constructor(name, db) {
        this._name = name;
        this._db = db;
    }
    openTransaction(mode, operation) {
        return new Promise((resolve, reject) => {
            const tx = this._db.openTransaction(this._name, mode);
            const rawStore = tx.objectStore(this._name);
            operation(resolve, reject, rawStore, tx);
        });
    }
}
exports.Store = Store;
exports.default = Store;
//# sourceMappingURL=store.js.map