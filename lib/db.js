"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Db = void 0;
const adler_32_1 = require("adler-32");
const internal_1 = require("./internal");
class Db {
    constructor(name, storeCount, rawDb) {
        this._name = name;
        this._storeCount = storeCount;
        this._rawDb = rawDb;
        this._shouldReopen = true;
        rawDb.onclose = () => {
            console.log(`Db was closed: name: ${name}`);
            rawDb.close();
            this._tryReopenLater(200);
        };
        rawDb.onabort = () => {
            console.log(`Db was aborted: name: ${name}`);
            rawDb.close();
            this._tryReopenLater(200);
        };
        rawDb.onerror = () => {
            console.log(`Error occured: name: ${name}`);
            rawDb.close();
            this._tryReopenLater(200);
        };
        rawDb.onversionchange = (event) => {
            console.log(`Version was changed: name: ${name}, old: ${event.oldVersion}, new: ${event.newVersion}`);
            rawDb.close();
            if (event.newVersion !== null && event.newVersion > this._rawDb.version) {
                this._tryReopenLater(200);
            }
        };
    }
    static open(name, storeCount = 64) {
        return Db._open(name, storeCount).then((rawDb) => {
            return new Db(name, storeCount, rawDb);
        });
    }
    close() {
        this._shouldReopen = false;
        this._rawDb.close();
    }
    static destroy(name) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(name);
            request.onerror = (event) => {
                const errorMsg = (0, internal_1.extractErrorMsg)(event);
                console.error(`Failed to open db: name: ${name}, error: ${errorMsg}`);
                reject(new Error(errorMsg));
            };
            request.onblocked = () => {
                const reason = `Db was blocked when destroying: name: ${name}`;
                console.error(reason);
                reject(new Error(reason));
            };
            request.onsuccess = () => {
                console.log(`Db was destroyed: name: ${name}`);
                resolve();
            };
        });
    }
    openTable(tableName, keyName) {
        return new Promise((resolve) => {
            const storeName = this._selectStoreName(tableName);
            resolve(new internal_1.Table(tableName, keyName, new internal_1.Store(storeName, this)));
        });
    }
    destroyTable(tableName) {
        return new Promise((resolve, reject) => {
            const storeName = this._selectStoreName(tableName);
            new internal_1.Table(tableName, "", new internal_1.Store(storeName, this))
                .clear()
                .then(() => resolve())
                .catch((reason) => reject(reason));
        });
    }
    openTransaction(storeName, mode) {
        return this._rawDb.transaction(storeName, mode, {
            durability: "relaxed",
        });
    }
    static _open(name, storeCount = 64) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(name);
            request.onerror = (event) => {
                const errorMsg = (0, internal_1.extractErrorMsg)(event);
                console.error(`Failed to open db: name: ${name}, error: ${errorMsg}`);
                reject(new Error(errorMsg));
            };
            request.onblocked = () => {
                const reason = `Db was blocked when opening: name: ${name}`;
                console.error(reason);
                reject(new Error(reason));
            };
            request.onsuccess = (event) => {
                const rawDb = event.target.result;
                console.log(`Open db successfully: name: ${name}, version: ${rawDb.version}`);
                resolve(rawDb);
            };
            request.onupgradeneeded = (event) => {
                const rawDb = event.target.result;
                for (let index = 0; index < storeCount; index++) {
                    rawDb.createObjectStore(this._buildStoreName(name, index));
                }
            };
        });
    }
    _tryReopenLater(ms) {
        if (!this._shouldReopen) {
            return;
        }
        setTimeout(() => {
            Db._open(this._name, this._storeCount)
                .then((rawDb) => {
                this._rawDb = rawDb;
            })
                .catch((reason) => {
                console.error(`Failed to open db: name: ${this._name}, reason: ${reason}, will try again...`);
                this._tryReopenLater(ms);
            });
        }, ms);
    }
    _selectStoreName(tableName) {
        const index = Math.abs((0, adler_32_1.str)(tableName)) % this._storeCount;
        return Db._buildStoreName(this._name, index);
    }
    static _buildStoreName(name, index) {
        return `${name}_${index}`;
    }
}
exports.Db = Db;
exports.default = Db;
//# sourceMappingURL=db.js.map