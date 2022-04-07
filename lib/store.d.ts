import { Db } from "./internal";
export declare class Store {
    private _name;
    private _db;
    constructor(name: string, db: Db);
    openTransaction<T>(mode: IDBTransactionMode, operation: (resolve: (value: T) => void, reject: (value: any) => void, rawStore: IDBObjectStore, transaction?: IDBTransaction) => void): Promise<T>;
}
export default Store;
