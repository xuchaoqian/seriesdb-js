import { Table, Row } from "./internal";
export declare class Db {
    private _name;
    private _storeCount;
    private _rawDb;
    private _shouldReopen;
    private constructor();
    static open(name: string, storeCount?: number): Promise<Db>;
    close(): void;
    static destroy(name: string): Promise<void>;
    openTable<R extends Row>(tableName: string, keyName: keyof R): Promise<Table<R>>;
    destroyTable(tableName: string): Promise<void>;
    openTransaction(storeName: string, mode: IDBTransactionMode): IDBTransaction;
    private static _open;
    private _tryReopenLater;
    private _selectStoreName;
    private static _buildStoreName;
}
export default Db;
