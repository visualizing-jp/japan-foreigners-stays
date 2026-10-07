/**
 * 正規化 JSON を配信用の配列 public/data/stays.json にする。
 */

import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { StaysJson } from "../src/lib/data/cube.ts";
import { FACILITIES, NATIONS, PREFECTURES, TOTAL } from "../src/lib/data/labels.ts";
import type { YearTable } from "../src/lib/parse/table.ts";

const SRC = resolve(import.meta.dirname, "../data/normalized/tables.json");
const OUT = resolve(import.meta.dirname, "../public/data/stays.json");

interface Normalized {
  years: number[];
  tables: YearTable[];
}

async function main(): Promise<void> {
  const { years, tables } = JSON.parse(readFileSync(SRC, "utf8")) as Normalized;
  const byYear = new Map(tables.map((table) => [table.year, table]));
  const places = [TOTAL, ...PREFECTURES];
  const facilityYears = years.filter((year) => byYear.get(year)?.facility !== null);
  const guestFacilityYears = years.filter((year) => byYear.get(year)?.guestFacility !== null);

  const cube: StaysJson = {
    years,
    prefectures: places,
    nights: places.map((place) => years.map((year) => byYear.get(year)!.nights[place]!)),
    guests: places.map((place) => years.map((year) => byYear.get(year)!.guests?.[place] ?? null)),
    facilityYears,
    facilities: [...FACILITIES],
    facility: places.map((place) =>
      facilityYears.map((year) => FACILITIES.map((name) => byYear.get(year)!.facility![place]![name]!)),
    ),
    guestFacilityYears,
    guestFacility: places.map((place) =>
      guestFacilityYears.map((year) => FACILITIES.map((name) => byYear.get(year)!.guestFacility![place]![name]!)),
    ),
    nations: [...NATIONS],
    byNation: NATIONS.map((nation) =>
      places.map((place) => years.map((year) => byYear.get(year)!.nations[nation]?.[place] ?? null)),
    ),
  };

  await mkdir(resolve(OUT, ".."), { recursive: true });
  const json = JSON.stringify(cube);
  await writeFile(OUT, json);
  console.log(`  stays.json  ${(json.length / 1024).toFixed(1)}KB  ${years[0]}–${years.at(-1)}  ${PREFECTURES.length}都道府県`);
}

if (import.meta.main) await main();
