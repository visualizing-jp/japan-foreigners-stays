/**
 * 推移表と各年の集計結果を data/raw/ に落とす。既にあるファイルは取り直さない。
 *
 *   npm run fetch
 *   npm run fetch -- --force
 */

import { mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ANNUALS, TREND_URL, annualUrl, type AnnualDoc } from "../src/lib/data/sources.ts";

const RAW_DIR = resolve(import.meta.dirname, "../data/raw");

const SIGNATURES = { xlsx: "504b0304", xls: "d0cf11e0" } as const;

export function annualPath(doc: AnnualDoc): string {
  return resolve(RAW_DIR, `${doc.year}${doc.path.endsWith(".xls") ? ".xls" : ".xlsx"}`);
}

export function trendPath(): string {
  return resolve(RAW_DIR, "trend.xlsx");
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function download(url: string, path: string): Promise<void> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const body = Buffer.from(await res.arrayBuffer());
  const head = body.subarray(0, 4).toString("hex");
  if (!Object.values(SIGNATURES).includes(head as (typeof SIGNATURES)[keyof typeof SIGNATURES])) {
    throw new Error(`Excel でない応答 ${url}`);
  }
  await writeFile(path, body);
  console.log(`  ${path.split("/").at(-1)}  ${url}`);
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  await mkdir(RAW_DIR, { recursive: true });
  const files = [{ url: TREND_URL, path: trendPath() }, ...ANNUALS.map((doc) => ({ url: annualUrl(doc), path: annualPath(doc) }))];
  for (const file of files) {
    if (!force && (await exists(file.path))) continue;
    await download(file.url, file.path);
  }
}

if (import.meta.main) await main();
