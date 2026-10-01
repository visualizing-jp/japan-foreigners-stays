/**
 * 観光庁「宿泊旅行統計調査」の年の確定値。
 *
 * 都道府県別の外国人延べ宿泊者数の年計は、推移表（2025年12月以前）の1枚に 2011–2025 年が並ぶ。
 * 2010年4–6月調査から従業者9人以下の施設が対象に加わったため、全年で対象が揃う2011年から使う。
 * 2026年1月調査から層化の基準が従業者数から客室数に変わったので、2026年は入れない。
 *
 * 国籍別と施設タイプは、各年の集計結果の年計の表にある。
 */

export const PAGE_URL = "https://www.mlit.go.jp/kankocho/tokei_hakusyo/shukuhakutokei.html";

const ROOT = "https://www.mlit.go.jp";

export const TREND_URL = `${ROOT}/kankocho/content/002018997.xlsx`;

export interface AnnualDoc {
  year: number;
  /** サイトのルートからのパス。 */
  path: string;
}

export const ANNUALS: AnnualDoc[] = [
  { year: 2011, path: "/kankocho/content/000216576.xls" },
  { year: 2012, path: "/kankocho/content/001002144.xls" },
  { year: 2013, path: "/kankocho/content/001046404.xls" },
  { year: 2014, path: "/kankocho/content/001094684.xls" },
  { year: 2015, path: "/kankocho/tokei_hakusyo/content/001312940.xlsx" },
  { year: 2016, path: "/kankocho/content/001190399.xlsx" },
  { year: 2017, path: "/kankocho/content/001247521.xlsx" },
  { year: 2018, path: "/kankocho/content/001295984.xlsx" },
  { year: 2019, path: "/kankocho/tokei_hakusyo/content/001350484.xlsx" },
  { year: 2020, path: "/kankocho/tokei_hakusyo/content/001411547.xlsx" },
  { year: 2021, path: "/kankocho/tokei_hakusyo/content/001488438.xlsx" },
  { year: 2022, path: "/kankocho/tokei_hakusyo/content/001616676.xlsx" },
  { year: 2023, path: "/kankocho/content/001750679.xlsx" },
  { year: 2024, path: "/kankocho/content/001905499.xlsx" },
  { year: 2025, path: "/kankocho/content/002010340.xlsx" },
];

export function annualUrl(doc: AnnualDoc): string {
  return `${ROOT}${doc.path}`;
}
