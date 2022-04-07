import fs from "fs";
import path from "path";
import setGlobalVars from "indexeddbshim";
import { Db } from "../src/internal";

const dir = path.resolve(__dirname, "..", "data");
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

global.shimNS = true;
setGlobalVars(global);
global.shimIndexedDB.__useShim();
global.shimIndexedDB.__setConfig({
  checkOrigin: false,
  sysDatabaseBasePath: dir,
  databaseBasePath: dir,
});

jest.setTimeout(30000);

let db;
let table;
let table2;
let table3;
const count = 1000;
const firstTs = 1626814980;
const lastTs = firstTs + 60 * (count - 1);

beforeAll(async () => {
  db = await Db.open("db", 1);
  table = await db.openTable("table", "ts");
  table2 = await db.openTable("table2", "ts");
  table3 = await db.openTable("table3", "ts");
});

afterAll(async () => {
  await db.destroyTable("table");
  await db.destroyTable("table2");
  await db.destroyTable("table3");
  db.close();
  await Db.destroy("db");
});

beforeEach(async () => {
  await table.clear();
  await table.put(buildRowsSince(firstTs, count));
  await table2.clear();
  await table2.put(buildRowsSince(firstTs, count));
  await table3.clear();
  await table3.put(buildRowsSince(firstTs, count));
});

// eslint-disable-next-line jest/expect-expect
test("table.put", async () => {
  await table.put([]);
});

test("table.deleteSince", async () => {
  await table.deleteSince(firstTs);
  expect(await table.count()).toStrictEqual(0);
});

test("table.deleteUntil", async () => {
  await table.deleteUntil(firstTs);
  expect(await table.count()).toStrictEqual(count - 1);
});

test("table.getAll", async () => {
  const result = await table.getAll();
  expect(result).toStrictEqual(buildRowsSince(firstTs, count));
});

test("table.getSinceXxx", async () => {
  const result = await table.getSince(firstTs - step(5), 3);
  expect(result).toStrictEqual(buildRowsSince(firstTs, 3));

  const result2 = await table.getSince(firstTs, 3);
  expect(result2).toStrictEqual(buildRowsSince(firstTs, 3));

  const result3 = await table.getSince(lastTs, 3);
  expect(result3).toStrictEqual(buildRowsSince(lastTs, 1));

  const result4 = await table.getSince(lastTs - step(1), 3);
  expect(result4).toStrictEqual(buildRowsSince(lastTs - step(1), 2));

  const result5 = await table.getSince(lastTs + step(1), 3);
  expect(result5).toStrictEqual([]);

  const result20 = await table.getSinceFirst(3);
  expect(result20).toStrictEqual(buildRowsSince(firstTs, 3));
});

test("table.getUntilXxx", async () => {
  const result6 = await table.getUntil(firstTs - step(5), 3);
  expect(result6).toStrictEqual([]);

  const result7 = await table.getUntil(firstTs, 3);
  expect(result7).toStrictEqual(buildRowsUntil(firstTs, 1));

  const result8 = await table.getUntil(firstTs, 1);
  expect(result8).toStrictEqual(buildRowsUntil(firstTs, 1));

  const result9 = await table.getUntil(lastTs, 3);
  expect(result9).toStrictEqual(buildRowsUntil(lastTs, 3));

  const result10 = await table.getUntil(lastTs + step(3), 3);
  expect(result10).toStrictEqual(buildRowsUntil(lastTs, 3));

  const result17 = await table.getUntilLast(10);
  expect(result17).toStrictEqual(buildRowsUntil(lastTs, 10));
});

test("table.getBetween", async () => {
  const result11 = await table.getBetween(
    firstTs - step(3),
    firstTs - step(1),
    3
  );
  expect(result11).toStrictEqual([]);

  const result12 = await table.getBetween(firstTs - step(2), firstTs, 3);
  expect(result12).toStrictEqual(buildRowsSince(firstTs, 1));

  const result13 = await table.getBetween(
    firstTs + step(1),
    firstTs + step(5),
    3
  );
  expect(result13).toStrictEqual(buildRowsSince(firstTs + step(1), 3));

  const result14 = await table.getBetween(
    firstTs + step(1),
    firstTs + step(5),
    10
  );
  expect(result14).toStrictEqual(buildRowsSince(firstTs + step(1), 5));

  const result15 = await table.getBetween(lastTs, lastTs + step(5), 10);
  expect(result15).toStrictEqual(buildRowsSince(lastTs, 1));

  const result16 = await table.getBetween(
    lastTs + step(1),
    lastTs + step(5),
    10
  );
  expect(result16).toStrictEqual([]);
});

test("table.getXxxRow", async () => {
  const result18 = await table.getFirstRow();
  expect(result18).toStrictEqual(buildRowsSince(firstTs, 1)[0]);

  const result19 = await table.getLastRow();
  expect(result19).toStrictEqual(buildRowsUntil(lastTs, 1)[0]);
});

interface Candle {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
  amt: number;
}

function buildRowsSince(startTs: number, n: number): Candle[] {
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      ts: startTs + i * 60,
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

function buildRowsUntil(endTs: number, n: number): Candle[] {
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.unshift({
      ts: endTs - i * 60,
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

function step(n) {
  return 60 * n;
}
