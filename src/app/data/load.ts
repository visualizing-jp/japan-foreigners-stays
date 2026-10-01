/**
 * 配信データの取得。一度しか取りに行かない。
 */

import type { StaysJson } from "../../lib/data/cube.ts";

let cache: Promise<StaysJson> | null = null;

export function loadStays(): Promise<StaysJson> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/stays.json`).then((r) => {
    if (!r.ok) throw new Error(`stays.json の取得に失敗しました (${r.status})`);
    return r.json() as Promise<StaysJson>;
  });
  return cache;
}
