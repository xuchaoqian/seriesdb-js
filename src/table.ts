import { encode } from "@msgpack/msgpack";
import { Store, extractErrorMsg } from "./internal";

export type Row = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export type NonArrayKey = number | Date | string | ArrayBuffer | Uint8Array;
export type Key = NonArrayKey | Array<NonArrayKey>;

export class Table<R extends Row = Row> {
  private _name: string;
  private _keyName: keyof R;
  private _store: Store;
  private _firstPrevId: Uint8Array;
  private _lastNextId: Uint8Array;

  /** @internal */
  constructor(name: string, keyName: keyof R, store: Store) {
    this._name = name;
    this._keyName = keyName;
    this._store = store;
    this._firstPrevId = this._buildFirstPrevId();
    this._lastNextId = this._buildLastNextId();
  }

  put(rows: R[]): Promise<void> {
    return this._store.openTransaction(
      "readwrite",
      (resolve, reject, rawStore: IDBObjectStore) => {
        let errorCount = 0;

        const errorHandler = (event: Event) => {
          errorCount++;
          if (event.stopPropagation) {
            // IndexedDBShim doesnt support this on Safari 8 and below.
            event.stopPropagation();
          }
          if (event.preventDefault) {
            // IndexedDBShim doesnt support this on Safari 8 and below.
            event.preventDefault();
          }
        };

        let request: IDBRequest | undefined;
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

        /**Set event handler for last request.*/
        request.onerror = (event: Event) => {
          reject(new Error(`Failed to put: error: ${extractErrorMsg(event)}`));
        };
        request.onsuccess = () => {
          if (errorCount > 0) {
            reject(new Error(`Error occured: count: ${errorCount}`));
          } else {
            resolve();
          }
        };
      }
    );
  }

  deleteSince(startKey: Key): Promise<void> {
    return this._deleteRange(
      IDBKeyRange.bound(this._buildId(startKey), this._lastNextId, false, true)
    );
  }

  deleteUntil(endKey: Key): Promise<void> {
    return this._deleteRange(
      IDBKeyRange.bound(this._firstPrevId, this._buildId(endKey), true, false)
    );
  }

  deleteBetween(startKey: Key, endKey: Key): Promise<void> {
    return this._deleteRange(
      IDBKeyRange.bound(
        this._buildId(startKey),
        this._buildId(endKey),
        false,
        false
      )
    );
  }

  clear(): Promise<void> {
    return this._deleteRange(
      IDBKeyRange.bound(this._firstPrevId, this._lastNextId, true, true)
    );
  }

  get(key: Key): Promise<R> {
    return this._store.openTransaction(
      "readonly",
      (resolve, reject, rawStore: IDBObjectStore) => {
        const request = rawStore.get(this._buildId(key));
        request.onerror = (event: Event) => {
          reject(new Error(`Failed to get: error: ${extractErrorMsg(event)}`));
        };
        request.onsuccess = (event: Event) => {
          resolve((event.target as IDBRequest).result);
        };
      }
    );
  }

  getAll(): Promise<R[]> {
    return this._store.openTransaction(
      "readonly",
      (resolve, reject, rawStore: IDBObjectStore) => {
        const request = rawStore.getAll(
          IDBKeyRange.bound(this._firstPrevId, this._lastNextId, true, true)
        );
        request.onerror = (event: Event) => {
          reject(
            new Error(`Failed to getAll: error: ${extractErrorMsg(event)}`)
          );
        };
        request.onsuccess = (event: Event) => {
          resolve((event.target as IDBRequest).result);
        };
      }
    );
  }

  getSince(startKey: Key, limit: number): Promise<R[]> {
    return this._getRange(
      IDBKeyRange.bound(this._buildId(startKey), this._lastNextId, false, true),
      limit
    );
  }

  getSinceFirst(limit: number): Promise<R[]> {
    return this._getRange(
      IDBKeyRange.bound(this._firstPrevId, this._lastNextId, true, true),
      limit
    );
  }

  getUntil(endKey: Key, limit: number): Promise<R[]> {
    return this._getRightRange(
      IDBKeyRange.bound(this._firstPrevId, this._buildId(endKey), true, false),
      limit
    );
  }

  getUntilLast(limit: number): Promise<R[]> {
    return this._getRightRange(
      IDBKeyRange.bound(this._firstPrevId, this._lastNextId, true, true),
      limit
    );
  }

  getBetween(startKey: Key, endKey: Key, limit: number): Promise<R[]> {
    return this._getRange(
      IDBKeyRange.bound(
        this._buildId(startKey),
        this._buildId(endKey),
        false,
        false
      ),
      limit
    );
  }

  getFirstRow(): Promise<R | undefined> {
    return this._store.openTransaction(
      "readonly",
      (resolve, reject, rawStore: IDBObjectStore) => {
        const request = rawStore.openCursor(
          IDBKeyRange.bound(this._firstPrevId, this._lastNextId, true, true),
          "next"
        );
        request.onerror = (event: Event) => {
          reject(
            new Error(`Failed to openCursor: error: ${extractErrorMsg(event)}`)
          );
        };
        request.onsuccess = (event: Event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            resolve(cursor.value);
          } else {
            resolve(undefined);
          }
        };
      }
    );
  }

  getLastRow(): Promise<R | undefined> {
    return this._store.openTransaction(
      "readonly",
      (resolve, reject, rawStore: IDBObjectStore) => {
        const request = rawStore.openCursor(
          IDBKeyRange.bound(this._firstPrevId, this._lastNextId, true, true),
          "prev"
        );
        request.onerror = (event: Event) => {
          reject(
            new Error(`Failed to openCursor: error: ${extractErrorMsg(event)}`)
          );
        };
        request.onsuccess = (event: Event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            resolve(cursor.value);
          } else {
            resolve(undefined);
          }
        };
      }
    );
  }

  count(): Promise<number> {
    return this._store.openTransaction(
      "readonly",
      (resolve, reject, rawStore: IDBObjectStore) => {
        const request = rawStore.count(
          IDBKeyRange.bound(this._firstPrevId, this._lastNextId, true, true)
        );
        request.onerror = (event: Event) => {
          reject(
            new Error(`Failed to count: error: ${extractErrorMsg(event)}`)
          );
        };
        request.onsuccess = (event: Event) => {
          resolve((event.target as IDBRequest).result);
        };
      }
    );
  }

  private _deleteRange(range: IDBKeyRange): Promise<void> {
    return this._store.openTransaction(
      "readwrite",
      (resolve, reject, rawStore: IDBObjectStore) => {
        const request = rawStore.delete(range);
        request.onerror = (event: Event) => {
          reject(
            new Error(`Failed to delete: error: ${extractErrorMsg(event)}`)
          );
        };
        request.onsuccess = () => {
          resolve();
        };
      }
    );
  }

  private _getRange(range: IDBKeyRange, limit: number): Promise<R[]> {
    return this._store.openTransaction(
      "readonly",
      (resolve, reject, rawStore: IDBObjectStore) => {
        const request = rawStore.getAll(range, limit);
        request.onerror = (event: Event) => {
          reject(
            new Error(`Failed to getAll: error: ${extractErrorMsg(event)}`)
          );
        };
        request.onsuccess = (event: Event) => {
          resolve((event.target as IDBRequest).result);
        };
      }
    );
  }

  private _getRightRange(range: IDBKeyRange, limit: number): Promise<R[]> {
    return this._store.openTransaction(
      "readonly",
      (resolve, reject, rawStore: IDBObjectStore) => {
        const request = rawStore.openCursor(range, "prev");
        request.onerror = (event: Event) => {
          reject(
            new Error(`Failed to openCursor: error: ${extractErrorMsg(event)}`)
          );
        };
        let lastId: Uint8Array | undefined = undefined;
        const getAll = (range: IDBKeyRange) => {
          const request = rawStore.getAll(range, limit);
          request.onerror = (event: Event) => {
            reject(
              new Error(`Failed to getAll: error: ${extractErrorMsg(event)}`)
            );
          };
          request.onsuccess = (event: Event) => {
            resolve((event.target as IDBRequest).result);
          };
        };
        request.onsuccess = (event: Event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            if (typeof lastId === "undefined") {
              lastId = this._buildId(cursor.value[this._keyName]);
              const count = limit - 1;
              if (count < 0) {
                resolve([]);
              } else if (count === 0) {
                resolve([cursor.value]);
              } else {
                cursor.advance(count);
              }
            } else {
              getAll(
                IDBKeyRange.bound(
                  this._buildId(cursor.value[this._keyName]),
                  lastId,
                  false,
                  false
                )
              );
            }
          } else {
            if (typeof lastId === "undefined") {
              // Don't get any match record.
              resolve([]);
            } else {
              // Beyond the first record.
              getAll(IDBKeyRange.bound(this._firstPrevId, lastId, true, false));
            }
          }
        };
      }
    );
  }

  private _buildFirstPrevId(): Uint8Array {
    return encode([this._name, 0, 0]);
  }

  private _buildLastNextId(): Uint8Array {
    return encode([this._name, 2, 0]);
  }

  private _buildId(key: Key): Uint8Array {
    return encode([this._name, 1, key]);
  }
}

export default Table;
