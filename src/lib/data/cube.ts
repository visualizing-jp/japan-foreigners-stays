/**
 * 配信用の配列。行はラベルの並び、列は年の並び。
 * 国籍のセルは、その年の表に列がなければ null（0 とその他に含まれている年を区別する）。
 */

export interface StaysJson {
  /** 2011–2025。全施設の外国人延べ宿泊者数。 */
  years: number[];
  /** 0 は全国、以降は都道府県。 */
  prefectures: string[];
  /** prefectures × years。公表の全国値。 */
  nights: number[][];
  /** prefectures × years。第3表がなければその年は null。 */
  guests: (number | null)[][];
  /** 施設タイプを分けて読む最初の年以降。全施設。 */
  facilityYears: number[];
  facilities: string[];
  /** prefectures × facilityYears × facilities。 */
  facility: number[][][];
  /** 実宿泊者数の施設タイプがある年。 */
  guestFacilityYears: number[];
  /** prefectures × guestFacilityYears × facilities。 */
  guestFacility: number[][][];
  nations: string[];
  /**
   * nations × prefectures × years。従業者10人以上の施設。
   * 国籍不詳は合計から国籍の列を引いた残りで、どの年もある。
   */
  byNation: (number | null)[][][];
}
