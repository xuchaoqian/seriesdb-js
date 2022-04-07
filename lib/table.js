"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Table = void 0;
const msgpack_1 = require("@msgpack/msgpack");
const internal_1 = require("./internal");
class Table {
    constructor(name, keyName, store) {
        this._name = name;
        this._keyName = keyName;
        this._store = store;
        this._firstPrevId = this._buildFirstPrevId();
        this._lastNextId = this._buildLastNextId();
    }
    put(rows) {
        return this._store.openTransaction("readwrite", (resolve, reject, rawStore) => {
            let errorCount = 0;
            const errorHandler = (event) => {
                errorCount++;
                if (event.stopPropagation) {
                    event.stopPropagation();
                }
                if (event.preventDefault) {
                    event.preventDefault();
                }
            };
            let request;
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const id = this._buildId(row[this._keyName]);
                request = rawStore.put(row, id);
                request.onerror = errorHandler;
            }
            if (typeof request === "undefined") {
                resolve();
                return;
            }
            request.onerror = (event) => {
                reject(new Error(`Failed to put: error: ${(0, internal_1.extractErrorMsg)(event)}`));
            };
            request.onsuccess = () => {
                if (errorCount > 0) {
                    reject(new Error(`Error occured: count: ${errorCount}`));
                }
                else {
                    resolve();
                }
            };
        });
    }
    deleteSince(startKey) {
        return this._deleteRange(IDBKeyRange.bound(this._buildId(startKey), this._lastNextId, false, true));
    }
    deleteUntil(endKey) {
        return this._deleteRange(IDBKeyRange.bound(this._firstPrevId, this._buildId(endKey), true, false));
    }
    deleteBetween(startKey, endKey) {
        return this._deleteRange(IDBKeyRange.bound(this._buildId(startKey), this._buildId(endKey), false, false));
    }
    clear() {
        return this._deleteRange(IDBKeyRange.bound(this._firstPrevId, this._lastNextId, true, true));
    }
    get(key) {
        return this._store.openTransaction("readonly", (resolve, reject, rawStore) => {
            const request = rawStore.get(this._buildId(key));
            request.onerror = (event) => {
                reject(new Error(`Failed to get: error: ${(0, internal_1.extractErrorMsg)(event)}`));
            };
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        });
    }
    getAll() {
        return this._store.openTransaction("readonly", (resolve, reject, rawStore) => {
            const request = rawStore.getAll(IDBKeyRange.bound(this._firstPrevId, this._lastNextId, true, true));
            request.onerror = (event) => {
                reject(new Error(`Failed to getAll: error: ${(0, internal_1.extractErrorMsg)(event)}`));
            };
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        });
    }
    getSince(startKey, limit) {
        return this._getRange(IDBKeyRange.bound(this._buildId(startKey), this._lastNextId, false, true), limit);
    }
    getSinceFirst(limit) {
        return this._getRange(IDBKeyRange.bound(this._firstPrevId, this._lastNextId, true, true), limit);
    }
    getUntil(endKey, limit) {
        return this._getRightRange(IDBKeyRange.bound(this._firstPrevId, this._buildId(endKey), true, false), limit);
    }
    getUntilLast(limit) {
        return this._getRightRange(IDBKeyRange.bound(this._firstPrevId, this._lastNextId, true, true), limit);
    }
    getBetween(startKey, endKey, limit) {
        return this._getRange(IDBKeyRange.bound(this._buildId(startKey), this._buildId(endKey), false, false), limit);
    }
    getFirstRow() {
        return this._store.openTransaction("readonly", (resolve, reject, rawStore) => {
            const request = rawStore.openCursor(IDBKeyRange.bound(this._firstPrevId, this._lastNextId, true, true), "next");
            request.onerror = (event) => {
                reject(new Error(`Failed to openCursor: error: ${(0, internal_1.extractErrorMsg)(event)}`));
            };
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    resolve(cursor.value);
                }
                else {
                    resolve(undefined);
                }
            };
        });
    }
    getLastRow() {
        return this._store.openTransaction("readonly", (resolve, reject, rawStore) => {
            const request = rawStore.openCursor(IDBKeyRange.bound(this._firstPrevId, this._lastNextId, true, true), "prev");
            request.onerror = (event) => {
                reject(new Error(`Failed to openCursor: error: ${(0, internal_1.extractErrorMsg)(event)}`));
            };
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    resolve(cursor.value);
                }
                else {
                    resolve(undefined);
                }
            };
        });
    }
    count() {
        return this._store.openTransaction("readonly", (resolve, reject, rawStore) => {
            const request = rawStore.count(IDBKeyRange.bound(this._firstPrevId, this._lastNextId, true, true));
            request.onerror = (event) => {
                reject(new Error(`Failed to count: error: ${(0, internal_1.extractErrorMsg)(event)}`));
            };
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        });
    }
    _deleteRange(range) {
        return this._store.openTransaction("readwrite", (resolve, reject, rawStore) => {
            const request = rawStore.delete(range);
            request.onerror = (event) => {
                reject(new Error(`Failed to delete: error: ${(0, internal_1.extractErrorMsg)(event)}`));
            };
            request.onsuccess = () => {
                resolve();
            };
        });
    }
    _getRange(range, limit) {
        return this._store.openTransaction("readonly", (resolve, reject, rawStore) => {
            const request = rawStore.getAll(range, limit);
            request.onerror = (event) => {
                reject(new Error(`Failed to getAll: error: ${(0, internal_1.extractErrorMsg)(event)}`));
            };
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        });
    }
    _getRightRange(range, limit) {
        return this._store.openTransaction("readonly", (resolve, reject, rawStore) => {
            const request = rawStore.openCursor(range, "prev");
            request.onerror = (event) => {
                reject(new Error(`Failed to openCursor: error: ${(0, internal_1.extractErrorMsg)(event)}`));
            };
            let lastId = undefined;
            const getAll = (range) => {
                const request = rawStore.getAll(range, limit);
                request.onerror = (event) => {
                    reject(new Error(`Failed to getAll: error: ${(0, internal_1.extractErrorMsg)(event)}`));
                };
                request.onsuccess = (event) => {
                    resolve(event.target.result);
                };
            };
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (typeof lastId === "undefined") {
                        lastId = this._buildId(cursor.value[this._keyName]);
                        const count = limit - 1;
                        if (count < 0) {
                            resolve([]);
                        }
                        else if (count === 0) {
                            resolve([cursor.value]);
                        }
                        else {
                            cursor.advance(count);
                        }
                    }
                    else {
                        getAll(IDBKeyRange.bound(this._buildId(cursor.value[this._keyName]), lastId, false, false));
                    }
                }
                else {
                    if (typeof lastId === "undefined") {
                        resolve([]);
                    }
                    else {
                        getAll(IDBKeyRange.bound(this._firstPrevId, lastId, true, false));
                    }
                }
            };
        });
    }
    _buildFirstPrevId() {
        return (0, msgpack_1.encode)([this._name, 0, 0]);
    }
    _buildLastNextId() {
        return (0, msgpack_1.encode)([this._name, 2, 0]);
    }
    _buildId(key) {
        return (0, msgpack_1.encode)([this._name, 1, key]);
    }
}
exports.Table = Table;
exports.default = Table;
//# sourceMappingURL=table.js.map