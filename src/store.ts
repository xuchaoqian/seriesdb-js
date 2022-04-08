import { Db } from "./internal";

export class Store {
  private _name: string;
  private _db: Db;

  constructor(name: string, db: Db) {
    this._name = name;
    this._db = db;
  }

  openTransaction<T>(
    mode: IDBTransactionMode,
    operation: (
      resolve: (value: T) => void,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reject: (value: any) => void,
      rawStore: IDBObjectStore,
      transaction?: IDBTransaction
    ) => void
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // @ts-expect-error: Expected 1-2 arguments, but got 3
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tx = this._db.openTransaction(this._name, mode, {
        durability: "relaxed",
      });
      const rawStore = tx.objectStore(this._name);
      operation(resolve, reject, rawStore, tx);
    });
  }
}

export default Store;
