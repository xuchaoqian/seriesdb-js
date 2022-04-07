import { str as adler32 } from "adler-32";
import { Store, Table, Row, extractErrorMsg } from "./internal";

export class Db {
  private _name: string;
  private _storeCount: number;
  private _rawDb: IDBDatabase;
  private _shouldReopen: boolean;

  /** @internal */
  private constructor(name: string, storeCount: number, rawDb: IDBDatabase) {
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
    rawDb.onversionchange = (event: IDBVersionChangeEvent) => {
      console.log(
        `Version was changed: name: ${name}, old: ${event.oldVersion}, new: ${event.newVersion}`
      );
      rawDb.close();
      if (event.newVersion !== null && event.newVersion > this._rawDb.version) {
        this._tryReopenLater(200);
      }
    };
  }

  static open(name: string, storeCount = 64): Promise<Db> {
    return Db._open(name, storeCount).then((rawDb: IDBDatabase) => {
      return new Db(name, storeCount, rawDb);
    });
  }

  close(): void {
    this._shouldReopen = false;
    this._rawDb.close();
  }

  static destroy(name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onerror = (event: Event) => {
        const errorMsg = extractErrorMsg(event);
        console.error(`Failed to open db: name: ${name}, error: ${errorMsg}`);
        reject(new Error(errorMsg));
      };
      request.onblocked = (/*event: Event*/) => {
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

  openTable<R extends Row>(
    tableName: string,
    keyName: keyof R
  ): Promise<Table<R>> {
    return new Promise((resolve) => {
      const storeName = this._selectStoreName(tableName);
      resolve(new Table(tableName, keyName, new Store(storeName, this)));
    });
  }

  destroyTable(tableName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const storeName = this._selectStoreName(tableName);
      new Table(tableName, "", new Store(storeName, this))
        .clear()
        .then(() => resolve())
        .catch((reason) => reject(reason));
    });
  }

  /** @internal */
  openTransaction(storeName: string, mode: IDBTransactionMode): IDBTransaction {
    // @ts-expect-error: Expected 1-2 arguments, but got 3
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this._rawDb.transaction(storeName, mode, {
      durability: "relaxed",
    });
  }

  private static _open(name: string, storeCount = 64): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onerror = (event: Event) => {
        const errorMsg = extractErrorMsg(event);
        console.error(`Failed to open db: name: ${name}, error: ${errorMsg}`);
        reject(new Error(errorMsg));
      };
      request.onblocked = (/*event: Event*/) => {
        const reason = `Db was blocked when opening: name: ${name}`;
        console.error(reason);
        reject(new Error(reason));
      };
      request.onsuccess = (event: Event) => {
        const rawDb = (event.target as IDBRequest).result;
        console.log(
          `Open db successfully: name: ${name}, version: ${rawDb.version}`
        );
        resolve(rawDb);
      };
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const rawDb = (event.target as IDBRequest).result;
        for (let index = 0; index < storeCount; index++) {
          rawDb.createObjectStore(this._buildStoreName(name, index));
        }
      };
    });
  }

  private _tryReopenLater(ms: number) {
    if (!this._shouldReopen) {
      return;
    }
    setTimeout(() => {
      Db._open(this._name, this._storeCount)
        .then((rawDb) => {
          this._rawDb = rawDb;
        })
        .catch((reason) => {
          console.error(
            `Failed to open db: name: ${this._name}, reason: ${reason}, will try again...`
          );
          this._tryReopenLater(ms);
        });
    }, ms);
  }

  private _selectStoreName(tableName: string) {
    const index = Math.abs(adler32(tableName)) % this._storeCount;
    return Db._buildStoreName(this._name, index);
  }

  private static _buildStoreName(name: string, index: number) {
    return `${name}_${index}`;
  }
}

export default Db;
