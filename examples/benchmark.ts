import Dexie from "dexie";
import { Db, Table, Row } from "../src/internal";

(async function benchmark() {
  const seriesdbTable = await prepareSeriesdbTable();
  const dexieTable = await prepareDexieTable();

  await new Promise((resolve) => setTimeout(resolve, 10));
  await testSeriesdbCount(seriesdbTable);
  await new Promise((resolve) => setTimeout(resolve, 10));
  await testSeriesdbSave(seriesdbTable);
  await new Promise((resolve) => setTimeout(resolve, 10));
  await testDexieBulkPut(dexieTable);
  await new Promise((resolve) => setTimeout(resolve, 10));
  await testSeriesdbSaveForeach(seriesdbTable);
  await new Promise((resolve) => setTimeout(resolve, 10));
  await testDexieBulkPutForeach(dexieTable);
  await new Promise((resolve) => setTimeout(resolve, 10));
  await testSeriesdbGetSince(seriesdbTable);
  await new Promise((resolve) => setTimeout(resolve, 10));
  await testSeriesdbGetUntil(seriesdbTable);
  await new Promise((resolve) => setTimeout(resolve, 10));
  await testSeriesdbGetBetween(seriesdbTable);
  await testDexieGetWhere(dexieTable);
})().then(() => {
  console.log("Benchmark done.");
});

async function testSeriesdbCount(table: Table<Candle>) {
  const start = now();
  await table.count();
  console.log(`testSeriesdbCount spent: ${now() - start} ms`);
}

async function testSeriesdbSave(table: Table<Candle>) {
  const count = 10000;
  const rows = buildSeriesdbRows(count);
  const start = now();
  await table.put(rows);
  console.log(`testSeriesdbSave count: ${count}, spent: ${now() - start} ms`);
}

async function testSeriesdbSaveForeach(table: Table<Candle>) {
  const count = 1000;
  const rows = buildSeriesdbRows(count);
  const start = now();
  for (const row of rows) {
    await table.put([row]);
  }
  console.log(
    `testSeriesdbSaveForeach count: ${count}, spent: ${now() - start} ms`
  );
}

async function testDexieBulkPut(table: Dexie.Table) {
  const count = 10000;
  const rows = buildDexieRows(count);
  const start = now();
  await table.bulkPut(rows);
  console.log(`testDexieBulkPut count: ${count}, spent: ${now() - start} ms`);
}

async function testDexieBulkPutForeach(table: Dexie.Table) {
  const count = 1000;
  const rows = buildDexieRows(count);
  const start = now();
  for (const row of rows) {
    await table.bulkPut([row]);
  }
  console.log(
    `testDexieBulkPutForeach count: ${count}, spent: ${now() - start} ms`
  );
}

async function testSeriesdbGetSince(table: Table<Candle>) {
  const start = now();
  const rows = await table.getSince(1626815160, 3000);
  console.log(
    `testSeriesdbGetSince count: ${rows.length}, spent: ${now() - start} ms`
  );
}

async function testSeriesdbGetUntil(table: Table<Candle>) {
  const start = now();
  const rows = await table.getUntil(1627114980, 3000);
  console.log(
    `testSeriesdbGetUntil count: ${rows.length}, spent: ${now() - start} ms`
  );
}

async function testSeriesdbGetBetween(table: Table<Candle>) {
  const start = now();
  const rows = await table.getBetween(1626815160, 1627114980, 3000);
  console.log(
    `testSeriesdbGetBetween count: ${rows.length}, spent: ${now() - start} ms`
  );
}

async function testDexieGetWhere(table: Dexie.Table) {
  const start = now();
  const topic = "HUOBI:btcusdt.1m";
  const result = await table
    .where("[topic+ts]")
    .between([topic, 0], [topic, 1626995160])
    .limit(3000)
    .reverse();
  const candlesArray = await result.toArray();
  console.log(
    `testDexieGetWhere count: ${candlesArray.length}, spent: ${
      now() - start
    } ms`
  );
}

async function prepareSeriesdbTable(): Promise<Table<Candle>> {
  await Db.destroy("seriesdb_0");
  const db = await Db.open("seriesdb_0");
  const table = await db.openTable<Candle>("HUOBI:btcusdt.1min", "ts");
  const rows = buildSeriesdbRows(10000);
  await table.put(rows);
  return table;
}

async function prepareDexieTable(): Promise<Dexie.Table> {
  await Dexie.delete("dexie_0");
  const db = new Dexie("dexie_0");
  db.version(1).stores({
    candle: "_id, [topic+ts], topic, ts",
  });
  await db.open();
  const rows = buildDexieRows(10000);
  const table = db.table("candle");
  await table.bulkPut(rows);
  return table;
}

interface Candle {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
  amt: number;
}

function buildSeriesdbRows(count: number): Candle[] {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      ts: 1626814980 + i * 60,
      open: 29834.95,
      high: 29841.14,
      low: 29834.94,
      close: 29841.14,
      vol: 1.1082200203821357,
      amt: 33064.18452545,
    });
  }
  return rows;
}

function buildDexieRows(count: number): Row[] {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      _id: `dexie_0${1626814980 + i * 60}`,
      topic: "HUOBI:btcusdt.1m",
      ts: 1626814980 + i * 60,
      open: 29834.95,
      high: 29841.14,
      low: 29834.94,
      close: 29841.14,
      vol: 1.1082200203821357,
      amt: 33064.18452545,
    });
  }
  return rows;
}

function now(): number {
  const dt = new Date();
  return dt.getTime();
}
