/**
 * 正規化 JSON を確かめる。
 * 全国と都道府県の差は、観光庁が10人泊単位で丸めるために数十人泊まで生じる。
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FACILITIES, NATIONS, PREFECTURES, TOTAL } from "../src/lib/data/labels.ts";
import { ANNUALS } from "../src/lib/data/sources.ts";
import type { YearTable } from "../src/lib/parse/table.ts";

const SRC = resolve(import.meta.dirname, "../data/normalized/tables.json");
const ROUNDING = 100;
/** 47都道府県を足すと、10人泊単位の丸めが積み重なる。行の欠落は別の検査で止まる。 */
const SUM_ROUNDING = 1_000;

interface Normalized {
  years: number[];
  tables: YearTable[];
}

function gap(label: string, total: number, parts: number[], tolerance: number): void {
  const diff = total - parts.reduce((a, b) => a + b, 0);
  if (Math.abs(diff) > tolerance) throw new Error(`${label}: 合計との差 ${diff}`);
  checks += 1;
}

let checks = 0;

function main(): void {
  const { years, tables } = JSON.parse(readFileSync(SRC, "utf8")) as Normalized;
  if (years.join() !== ANNUALS.map((doc) => doc.year).join()) throw new Error(`年が想定と違う: ${years.join(",")}`);
  if (tables.map((table) => table.year).join() !== years.join()) throw new Error("表の年が推移と違う");
  checks += 1;

  for (const table of tables) {
    gap(`${table.year} 都道府県`, table.nights[TOTAL]!, PREFECTURES.map((name) => table.nights[name]!), SUM_ROUNDING);
    if (table.facility !== null) {
      for (const place of [TOTAL, ...PREFECTURES]) {
        const values = table.facility[place]!;
        const names = Object.keys(values);
        if (names.join() !== FACILITIES.join()) throw new Error(`${table.year} ${place}: 施設タイプが足りない`);
        gap(`${table.year} ${place} 施設`, table.nights[place]!, FACILITIES.map((name) => values[name]!), ROUNDING);
      }
      for (const name of FACILITIES) {
        gap(
          `${table.year} ${name}`,
          table.facility[TOTAL]![name]!,
          PREFECTURES.map((place) => table.facility![place]![name]!),
          SUM_ROUNDING,
        );
      }
    }
    const covered = table.nations[TOTAL];
    if (covered === undefined) throw new Error(`${table.year}: 国籍別の合計がない`);
    for (const place of [TOTAL, ...PREFECTURES]) {
      const parts = NATIONS.flatMap((name) => {
        const value = table.nations[name]?.[place];
        return value === undefined ? [] : [value];
      });
      gap(`${table.year} ${place} 国籍`, covered[place]!, parts, ROUNDING);
    }
    gap(`${table.year} 国籍の全国`, covered[TOTAL]!, PREFECTURES.map((name) => covered[name]!), SUM_ROUNDING);
    for (const nation of Object.keys(table.nations)) {
      if (nation === TOTAL) continue;
      gap(
        `${table.year} ${nation}`,
        table.nations[nation]![TOTAL]!,
        PREFECTURES.map((name) => table.nations[nation]![name]!),
        SUM_ROUNDING,
      );
    }
  }

  for (const nation of NATIONS) {
    if (nation === "国籍不詳") continue;
    const present = tables.filter((table) => table.nations[nation] !== undefined).map((table) => table.year);
    if (present.length === 0) throw new Error(`${nation}: どの年にもない`);
    checks += 1;
    console.log(`  ${nation}  ${present[0]}–${present.at(-1)}`);
  }
  console.log(`  ✓ ${checks} 件の検算がすべて一致`);
}

main();
