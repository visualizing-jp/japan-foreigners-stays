/**
 * 系列の色。地の紙に沈まない程度に彩度を落とした色。
 * 順位の色は上位の並びに固定して使い、年を変えても同じ都道府県・国籍が同じ色になるようにする。
 */

export const RANK_COLORS = [
  "#b0392a",
  "#2f5d8a",
  "#c9893a",
  "#4f7d5c",
  "#7a5a8c",
  "#3f8f8f",
  "#a0606a",
  "#7b7a3a",
];

/** 上位に入らないものをまとめた残り。 */
export const REST_COLOR = "#d9d4ca";

/** 一覧から選んだ、上位に入らないもの。 */
export const PICK_COLOR = "#16140f";

/** 宿泊施設のタイプ。タイプ不詳は残りと同じ薄い色。 */
export const FACILITY_COLORS: Record<string, string> = {
  旅館: "#c9893a",
  リゾートホテル: "#2f5d8a",
  ビジネスホテル: "#7b7a3a",
  シティホテル: "#b0392a",
  簡易宿所: "#4f7d5c",
  "会社・団体の宿泊所": "#8aa5c2",
  タイプ不詳: "#d9d4ca",
};
