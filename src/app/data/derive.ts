/**
 * 配信データから人泊を引く。0 行目・0 番は全国。
 */

import type { StaysJson } from "../../lib/data/cube.ts";

export function nightsAt(d: StaysJson, place: number, year: number): number {
  return d.nights[place]![year]!;
}

/** 実宿泊者数。第3表がなければ null。 */
export function guestsAt(d: StaysJson, place: number, year: number): number | null {
  return d.guests[place]![year] ?? null;
}

export type StayUnit = "nights" | "guests";

export function stayAt(d: StaysJson, place: number, year: number, unit: StayUnit): number | null {
  return unit === "nights" ? nightsAt(d, place, year) : guestsAt(d, place, year);
}

/** その年の表に列がなければ null。 */
export function nationAt(d: StaysJson, nation: number, place: number, year: number): number | null {
  return d.byNation[nation]![place]![year] ?? null;
}

/** 従業者10人以上の施設の合計。国籍の列がない年は 0 として足す。 */
export function coveredAt(d: StaysJson, place: number, year: number): number {
  return d.byNation.reduce((sum, row) => sum + (row[place]![year] ?? 0), 0);
}

export function firstNationYear(d: StaysJson, nation: number): number | undefined {
  const k = d.byNation[nation]![0]!.findIndex((v) => v !== null);
  return k < 0 ? undefined : d.years[k];
}
