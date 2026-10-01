/**
 * 時代ビュー。都道府県別の外国人延べ宿泊者数を積み上げ、2015年からは施設タイプも分ける。
 */

import { use, useMemo } from "react";
import { loadStays } from "../data/load.ts";
import { FACILITY_COLORS, RANK_COLORS, REST_COLOR } from "../data/colors.ts";
import { nightsAt } from "../data/derive.ts";
import { change, exact, pct } from "../data/format.ts";
import { Segmented } from "../components/Segmented.tsx";
import { StackedYears, type Column, type Measure } from "../components/StackedYears.tsx";
import { CHARTS, Streamgraph, type Chart } from "../components/Streamgraph.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";

const TOP = 8;
const REST = "そのほか";
const MEASURES = [
  { value: "count", label: "人泊" },
  { value: "share", label: "構成比" },
] as const;

export function EraView() {
  const d = use(loadStays());
  const last = d.years.length - 1;
  const [yearParam, setYearParam] = useUrlState<string>("y", String(d.years[last]), (v) => d.years.includes(Number(v)));
  const year = Number(yearParam);
  const yi = d.years.indexOf(year);
  const [measure, setMeasure] = useUrlState<Measure>("measure", "count", (v) => v === "count" || v === "share");
  const [chart, setChart] = useUrlState<Chart>("chart", "bars", (v) => CHARTS.some((c) => c.value === v));
  const [picked, setPicked] = useUrlState<string>("p", "", (v) => d.prefectures.includes(v));
  const [facility, setFacility] = useUrlState<string>("f", "", (v) => d.facilities.includes(v));
  const Years = chart === "stream" ? Streamgraph : StackedYears;

  const top = useMemo(
    () =>
      d.prefectures
        .map((name, i) => ({ name, v: i === 0 ? -1 : nightsAt(d, i, last) }))
        .filter((r) => r.v >= 0)
        .sort((a, b) => b.v - a.v)
        .slice(0, TOP)
        .map((r) => r.name),
    [d, last],
  );

  const columns = useMemo((): Column[] => {
    return d.years.map((yr, k) => {
      const total = nightsAt(d, 0, k);
      const shown = top.map((name, r) => ({
        key: name,
        value: nightsAt(d, d.prefectures.indexOf(name), k),
        color: RANK_COLORS[r]!,
      }));
      const rest = total - shown.reduce((a, s) => a + s.value, 0);
      return { year: yr, total, segments: [...shown, { key: REST, value: rest, color: REST_COLOR }] };
    });
  }, [d, top]);

  const facilities = useMemo((): Column[] => {
    return d.facilityYears.map((yr, k) => {
      const segments = d.facilities.map((name, f) => ({
        key: name,
        value: d.facility[0]![k]![f]!,
        color: FACILITY_COLORS[name]!,
      }));
      return { year: yr, total: segments.reduce((a, s) => a + s.value, 0), segments };
    });
  }, [d]);

  const total = nightsAt(d, 0, yi);
  const prev = yi > 0 ? nightsAt(d, 0, yi - 1) : null;
  const facilityYear = d.facilityYears[0]!;
  const showFacility = year >= facilityYear;
  const fi = d.facilityYears.indexOf(year);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <h1 className="text-[19px] font-semibold tracking-tight">都道府県別の外国人延べ宿泊者数</h1>
        <div className="flex gap-2">
          <Segmented label="グラフ" options={CHARTS} value={chart} onChange={setChart} />
          <Segmented label="尺度" options={MEASURES} value={measure} onChange={setMeasure} />
        </div>
      </header>

      <p className="tnum min-h-9 pb-3 text-[12.5px]">
        <span className="font-semibold">{year}年</span>
        <span className="text-muted">{` · 全国 ${exact(total)}`}</span>
        {prev !== null && <span className="text-muted">{`（前年比 ${change(total, prev)}）`}</span>}
      </p>

      <Years
        columns={columns}
        measure={measure}
        highlighted={top.includes(picked) ? picked : ""}
        focused={year}
        onFocus={(y) => setYearParam(String(y))}
        label={`都道府県別の外国人延べ宿泊者数の${measure === "share" ? "構成比" : "人泊"}`}
      />

      <ul className="mt-3 flex flex-wrap gap-x-1 gap-y-1 pl-[46px] text-[11px]">
        {[...top, REST].map((name, k) => {
          const on = picked === name;
          const color = name === REST ? REST_COLOR : RANK_COLORS[k]!;
          const value = name === REST ? columns[yi]!.segments.at(-1)!.value : nightsAt(d, d.prefectures.indexOf(name), yi);
          return (
            <li key={name}>
              <button
                type="button"
                disabled={name === REST}
                onClick={() => setPicked(on ? "" : name)}
                aria-pressed={on}
                className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-[background-color,transform] duration-150 ease-out enabled:cursor-pointer enabled:active:scale-[0.97] ${
                  on ? "bg-ink/[0.06] font-semibold text-ink" : "text-muted enabled:hover:bg-ink/[0.03]"
                }`}
              >
                <span aria-hidden className="size-[9px] rounded-[2px]" style={{ backgroundColor: color }} />
                {name}
                <span className="tnum text-faint">{pct(value / total)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <section className="mt-10">
        <h2 className="pb-2 text-[13px] font-semibold">宿泊施設のタイプ</h2>
        {!showFacility && <p className="pb-2 text-[12px] text-muted">施設タイプの区分は{facilityYear}年から</p>}
        <Years
          columns={facilities}
          measure={measure}
          highlighted={facility}
          focused={year}
          onFocus={(y) => setYearParam(String(y))}
          height={240}
          label={`宿泊施設のタイプ別の外国人延べ宿泊者数の${measure === "share" ? "構成比" : "人泊"}`}
        />
        <ul className="mt-2 flex flex-wrap gap-x-1 gap-y-1 pl-[46px] text-[11px]">
          {d.facilities.map((name) => {
            const on = facility === name;
            const value = showFacility ? d.facility[0]![fi]![d.facilities.indexOf(name)]! : null;
            return (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => setFacility(on ? "" : name)}
                  aria-pressed={on}
                  className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-[background-color,transform] duration-150 ease-out cursor-pointer active:scale-[0.97] ${
                    on ? "bg-ink/[0.06] font-semibold text-ink" : "text-muted hover:bg-ink/[0.03]"
                  }`}
                >
                  <span aria-hidden className="size-[9px] rounded-[2px]" style={{ backgroundColor: FACILITY_COLORS[name] }} />
                  {name}
                  {value !== null && <span className="tnum text-faint">{pct(value / total)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <ul className="mt-5 flex flex-col gap-1 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
        <li>
          延べ宿泊者数は、1人が1泊すると1人泊。同じ人が2泊すれば2人泊で、訪日外客数（人）とは単位が違う。
        </li>
        <li>
          {d.years[0]}–{d.years[last]}年の確定値。2010年4–6月調査から従業者9人以下の施設が対象に加わったため、全年で対象が揃う{d.years[0]}年から。2026年1月調査から層化の基準が変わったので、2026年は入れていない。
        </li>
        <li>
          色のついた{TOP}都道府県は{d.years[last]}年の上位。「{REST}」は全国からそれらを引いた残り。都道府県を押すと、その都道府県だけを濃くする。
        </li>
        <li>
          施設タイプは{facilityYear}年から（それ以前の表は5区分で、簡易宿所が分かれていない）。合計との差は「タイプ不詳」。
        </li>
      </ul>
    </div>
  );
}
