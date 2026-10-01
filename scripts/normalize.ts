/**
 * 推移表と各年の集計結果を読み、data/normalized/tables.json に書く。
 * 各年の第4表の外国人延べ宿泊者数が、推移表の同じ年・同じ都道府県と一致することも確かめる。
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PREFECTURES, TOTAL } from "../src/lib/data/labels.ts";
import { ANNUALS } from "../src/lib/data/sources.ts";
import { readAnnual, readTrend, type YearTable } from "../src/lib/parse/table.ts";
import { annualPath, trendPath } from "./fetch-data.ts";

const OUT = resolve(import.meta.dirname, "../data/normalized/tables.json");

async function main(): Promise<void> {
  const trend = readTrend(trendPath());
  const tables: YearTable[] = [];
  for (const doc of ANNUALS) {
    const table = readAnnual(annualPath(doc), doc.year);
    const fromTrend = trend.nights[doc.year];
    if (fromTrend === undefined) throw new Error(`${doc.year}: 推移表に年がない`);
    for (const place of [TOTAL, ...PREFECTURES]) {
      if (table.nights[place] !== fromTrend[place]) {
        throw new Error(`${doc.year} ${place}: 第4表 ${table.nights[place]} と推移表 ${fromTrend[place]} が違う`);
      }
    }
    tables.push(table);
    console.log(`  ${doc.year}  全国 ${table.nights[TOTAL]!.toLocaleString("ja-JP")}人泊`);
  }
  await mkdir(resolve(OUT, ".."), { recursive: true });
  await writeFile(OUT, JSON.stringify({ years: trend.years, tables }));
  console.log(`  ${tables.length}年`);
}

if (import.meta.main) await main();
