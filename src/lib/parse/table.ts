/**
 * 宿泊旅行統計の Excel を読む。
 * 推移表の年計から都道府県別の外国人延べ宿泊者数、各年の集計結果から施設タイプと国籍。
 */

import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import {
  FACILITIES,
  FACILITY_SINCE,
  NATION_ALIASES,
  NATIONS,
  PREFECTURES,
  TOTAL,
} from "../data/labels.ts";

type Cell = string | number | boolean | null | undefined;
type Row = Cell[];

export interface PlaceValues {
  [name: string]: number;
}

export interface YearTable {
  year: number;
  /** 全施設。全国と47都道府県。第4表の外国人延べ宿泊者数。 */
  nights: PlaceValues;
  /** 2015年以降。タイプ不詳を含む。 */
  facility: Record<string, PlaceValues> | null;
  /** 第3表の外国人実宿泊者数。シートがなければ null。 */
  guests: PlaceValues | null;
  /** 2015年以降の第5表。タイプ不詳を含む。第3表がなければ null。 */
  guestFacility: Record<string, PlaceValues> | null;
  /** その年の表にある国籍だけ。国籍不詳を含む。従業者10人以上。 */
  nations: Record<string, PlaceValues>;
}

/** 10人泊単位の丸めで、内訳の和が合計をこの範囲まで前後する。 */
const ROUNDING = 100;

const KNOWN_NATIONS = new Set<string>(NATIONS);
const NAMED_FACILITIES = FACILITIES.filter((name) => name !== "タイプ不詳");

function clean(cell: Cell): string {
  return String(cell ?? "").replace(/\s+/g, "");
}

function count(cell: Cell, where: string): number {
  if (typeof cell === "number") return cell;
  const text = clean(cell).replace(/[,*＊]/g, "");
  if (text === "" || text === "-" || text === "－" || text === "…") return 0;
  const n = Number(text);
  if (!Number.isFinite(n)) throw new Error(`${where}: 数値でない「${cell}」`);
  return n;
}

function rowsOf(path: string, sheet: string): Row[] {
  const book = XLSX.read(readFileSync(path));
  const found = book.Sheets[sheet];
  if (found === undefined) throw new Error(`${path}: シートがない「${sheet}」`);
  return XLSX.utils.sheet_to_json<Row>(found, { header: 1, defval: null, raw: false });
}

function sheetNamed(path: string, pattern: RegExp): string {
  const name = findSheet(path, pattern);
  if (name === undefined) throw new Error(`${path}: ${pattern} に合うシートがない`);
  return name;
}

function findSheet(path: string, pattern: RegExp): string | undefined {
  const book = XLSX.read(readFileSync(path), { bookSheets: true });
  return book.SheetNames.find((n) => pattern.test(n));
}

function placeOf(cell: Cell): string | null {
  const name = clean(cell).replace(/^\d+/, "");
  if (name === TOTAL) return TOTAL;
  if ((PREFECTURES as readonly string[]).includes(name)) return name;
  // 各年の集計結果は、全国の行が「令和7年 1～12月 計」のようになっている。
  if (name.includes("計") && name.includes("月")) return TOTAL;
  return null;
}

function places(rows: Row[], valueAt: (row: Row) => PlaceValues, where: string): Record<string, PlaceValues> {
  const out: Record<string, PlaceValues> = {};
  for (const row of rows) {
    const place = placeOf(row[0]);
    if (place === null || out[place] !== undefined) continue;
    out[place] = valueAt(row);
  }
  const missing = [TOTAL, ...PREFECTURES].filter((name) => out[name] === undefined);
  if (missing.length > 0) throw new Error(`${where}: 行がない ${missing.join("、")}`);
  return out;
}

/** 平成・令和の「◯年」を西暦にする。 */
export function yearOf(label: string): number {
  const matched = clean(label).match(/^(平成|令和)(元|\d+)年$/);
  if (matched === null) throw new Error(`年でない「${label}」`);
  const n = matched[2] === "元" ? 1 : Number(matched[2]);
  return (matched[1] === "平成" ? 1988 : 2018) + n;
}

/** 推移表の年計。年 → 全国と都道府県の外国人延べ宿泊者数。 */
export function readTrend(path: string): { years: number[]; nights: Record<number, PlaceValues> } {
  const rows = rowsOf(path, "旧3-1");
  const head = rows.findIndex((row) => row.some((cell) => clean(cell) === "平成23年"));
  if (head < 0) throw new Error(`${path}: 平成23年の列がない`);
  const yearCols = rows[head]!.flatMap((cell, c) => (c > 0 && clean(cell) !== "" ? [{ c, year: yearOf(clean(cell)) }] : []));
  const nights: Record<number, PlaceValues> = {};
  for (const { year } of yearCols) nights[year] = {};
  const found = places(
    rows,
    (row) => {
      const values: PlaceValues = {};
      for (const { c, year } of yearCols) values[String(year)] = count(row[c], `${path} ${clean(row[0])}`);
      return values;
    },
    path,
  );
  for (const [place, values] of Object.entries(found)) {
    for (const { year } of yearCols) nights[year]![place] = values[String(year)]!;
  }
  return { years: yearCols.map((col) => col.year), nights };
}

function nationOf(label: string, where: string): string {
  const name = NATION_ALIASES[label] ?? label;
  if (!KNOWN_NATIONS.has(name) || name === "国籍不詳") throw new Error(`${where}: 想定外の国籍「${label}」`);
  return name;
}

function foreignerCol(rows: Row[], where: string): number {
  for (const row of rows.slice(0, 8)) {
    const col = row.findIndex((cell, i) => i > 0 && clean(cell).includes("外国人") && !clean(cell).startsWith("第"));
    if (col >= 0) return col;
  }
  throw new Error(`${where}: 外国人の列がない`);
}

function facilityByType(rows: Row[], totals: PlaceValues, year: number, where: string): Record<string, PlaceValues> {
  const typeRow = rows.findIndex((row) => row.some((cell) => clean(cell) === "旅館"));
  if (typeRow < 1) throw new Error(`${year}: 施設タイプの見出しがない`);
  const totalCol = rows[typeRow - 1]!.findIndex((cell) => clean(cell).includes("外国人"));
  if (totalCol < 0) throw new Error(`${year}: ${where}の外国人の列がない`);
  const typeCols = rows[typeRow]!.flatMap((cell, c) => (c > totalCol && clean(cell) !== "" ? [{ c, name: clean(cell) }] : []));
  const names = typeCols.map((col) => col.name).join("、");
  if (names !== NAMED_FACILITIES.join("、")) throw new Error(`${year}: 施設タイプが想定と違う（${names}）`);
  return Object.fromEntries(
    [TOTAL, ...PREFECTURES].map((place) => {
      const row = rows.find((r) => placeOf(r[0]) === place)!;
      const values: PlaceValues = {};
      let sum = 0;
      for (const col of typeCols) {
        values[col.name] = count(row[col.c], `${year} ${place} ${col.name}`);
        sum += values[col.name]!;
      }
      const unknown = totals[place]! - sum;
      if (unknown < -ROUNDING) throw new Error(`${year} ${place}: ${where}の施設タイプの和が合計を ${-unknown} 超える`);
      values["タイプ不詳"] = Math.max(0, unknown);
      return [place, values];
    }),
  );
}

/** 各年の集計結果。第4表の外国人と、参考第1表の国籍。第3表・第5表があれば実宿泊者数も。 */
export function readAnnual(path: string, year: number): YearTable {
  const facilitySheet = sheetNamed(path, /第[4４]表\(年計\)/);
  const nationSheet = sheetNamed(path, /参考第[1１]表\(年計\)/);
  const facilityRows = rowsOf(path, facilitySheet);
  const nationRows = rowsOf(path, nationSheet);

  const typeRow = facilityRows.findIndex((row) => row.some((cell) => clean(cell) === "旅館"));
  if (typeRow < 1) throw new Error(`${year}: 施設タイプの見出しがない`);
  const totalCol = facilityRows[typeRow - 1]!.findIndex((cell) => clean(cell).includes("外国人"));
  if (totalCol < 0) throw new Error(`${year}: 外国人延べ宿泊者数の列がない`);
  const withFacility = year >= FACILITY_SINCE;

  const nights = Object.fromEntries(
    Object.entries(places(facilityRows, (row) => ({ [TOTAL]: count(row[totalCol], `${year} ${clean(row[0])}`) }), `${year} 第4表`)).map(
      ([place, v]) => [place, v[TOTAL]!],
    ),
  );
  const facility = withFacility ? facilityByType(facilityRows, nights, year, "延べ宿泊者数") : null;

  const guestSheet = findSheet(path, /第[3３]表\(年計\)/);
  const guestRows = guestSheet === undefined ? null : rowsOf(path, guestSheet);
  const guestCol = guestRows === null ? -1 : foreignerCol(guestRows, `${year} 第3表`);
  const guests =
    guestRows === null
      ? null
      : Object.fromEntries(
          Object.entries(
            places(
              guestRows.filter((row) => {
                const cell = row[guestCol];
                if (typeof cell === "number") return true;
                const text = clean(cell).replace(/[,*＊]/g, "");
                return text !== "" && text !== "-" && text !== "－" && Number.isFinite(Number(text));
              }),
              (row) => ({ [TOTAL]: count(row[guestCol], `${year} ${clean(row[0])} 実宿泊`) }),
              `${year} 第3表`,
            ),
          ).map(([place, v]) => [place, v[TOTAL]!]),
        );
  if (guests !== null) {
    for (const place of [TOTAL, ...PREFECTURES]) {
      if (guests[place]! > nights[place]!) {
        throw new Error(`${year} ${place}: 実宿泊者数 ${guests[place]} が延べ宿泊者数 ${nights[place]} を超える`);
      }
    }
  }
  const guestFacilitySheet = findSheet(path, /第[5５]表\(年計\)/);
  const guestFacility =
    guests !== null && withFacility && guestFacilitySheet !== undefined
      ? facilityByType(rowsOf(path, guestFacilitySheet), guests, year, "実宿泊者数")
      : null;

  const head = nationRows.findIndex((row) => row.some((cell) => clean(cell) === "韓国"));
  if (head < 0) throw new Error(`${year}: 国籍の見出しがない`);
  const nationCols = nationRows[head]!.flatMap((cell, c) => {
    const label = clean(cell);
    return label === "" ? [] : [{ c, name: nationOf(label, String(year)) }];
  });
  const seen = new Set<string>();
  for (const col of nationCols) {
    if (seen.has(col.name)) throw new Error(`${year}: 国籍が重なる「${col.name}」`);
    seen.add(col.name);
  }
  const coveredCol = nationCols[0]!.c - 1;
  const byPlace = places(
    nationRows,
    (row) => {
      const values: PlaceValues = { [TOTAL]: count(row[coveredCol], `${year} ${clean(row[0])} 合計`) };
      let sum = 0;
      for (const col of nationCols) {
        values[col.name] = count(row[col.c], `${year} ${clean(row[0])} ${col.name}`);
        sum += values[col.name]!;
      }
      const unknown = values[TOTAL]! - sum;
      if (unknown < -ROUNDING) throw new Error(`${year} ${clean(row[0])}: 国籍の和が合計を ${-unknown} 超える`);
      values["国籍不詳"] = Math.max(0, unknown);
      return values;
    },
    `${year} 参考第1表`,
  );
  const nations: Record<string, PlaceValues> = {};
  for (const col of [...nationCols, { name: "国籍不詳" }]) {
    nations[col.name] = Object.fromEntries([TOTAL, ...PREFECTURES].map((place) => [place, byPlace[place]![col.name]!]));
  }
  const totals = Object.fromEntries([TOTAL, ...PREFECTURES].map((place) => [place, byPlace[place]![TOTAL]!]));
  return { year, nights, facility, guests, guestFacility, nations: { ...nations, [TOTAL]: totals } };
}
