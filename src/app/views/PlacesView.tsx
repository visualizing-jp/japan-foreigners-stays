/**
 * 都道府県ビュー。年の順位と、上位の推移、選んだ県の施設タイプ。
 */

import { use, useMemo } from "react";
import { loadStays } from "../data/load.ts";
import { FACILITY_COLORS, PICK_COLOR, RANK_COLORS, REST_COLOR } from "../data/colors.ts";
import { stayAt, type StayUnit } from "../data/derive.ts";
import { exact, exactGuests, guests, nights, pct } from "../data/format.ts";
import { RankList, type RankRow } from "../components/RankList.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { StackedYears, type Column, type Measure } from "../components/StackedYears.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { CHARTS, Streamgraph, type Chart } from "../components/Streamgraph.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";

const TOP = 8;
const REST = "そのほか";
const UNITS = [
  { value: "nights", label: "人泊" },
  { value: "guests", label: "人数" },
] as const;
const MEASURES = [
  { value: "count", label: "実数" },
  { value: "share", label: "構成比" },
] as const;

export function PlacesView() {
  const d = use(loadStays());
  const last = d.years.at(-1)!;
  const [yearParam, setYearParam] = useUrlState<string>("y", String(last), (v) => d.years.includes(Number(v)));
  const year = Number(yearParam);
  const yi = d.years.indexOf(year);
  const [measure, setMeasure] = useUrlState<Measure>("measure", "count", (v) => v === "count" || v === "share");
  const hasGuests = d.guests[0]!.some((v) => v !== null);
  const [unit, setUnit] = useUrlState<StayUnit>("unit", "nights", (v) => v === "nights" || (v === "guests" && hasGuests));
  const [chart, setChart] = useUrlState<Chart>("chart", "bars", (v) => CHARTS.some((c) => c.value === v));
  const [selected, setPicked] = useUrlState<string>("p", "", (v) => d.prefectures.includes(v) && v !== d.prefectures[0]);
  const Years = chart === "stream" ? Streamgraph : StackedYears;
  const amount = unit === "nights" ? exact : exactGuests;
  const compact = unit === "nights" ? nights : guests;
  const unitLabel = unit === "nights" ? "人泊" : "人数";

  const top = useMemo(
    () =>
      d.prefectures
        .map((name, i) => ({ name, v: i === 0 ? -1 : stayAt(d, i, d.years.length - 1, unit) ?? -1 }))
        .filter((r) => r.v >= 0)
        .sort((a, b) => b.v - a.v)
        .slice(0, TOP)
        .map((r) => r.name),
    [d, unit],
  );

  const total = stayAt(d, 0, yi, unit);
  const rows: RankRow[] = d.prefectures.flatMap((name, i) => {
    if (i === 0) return [];
    const value = stayAt(d, i, yi, unit);
    if (value === null || total === null) return [];
    return [{ name, value, label: pct(value / total), indent: 0, color: colorOf(top, name) }];
  }).sort((a, b) => b.value - a.value);

  const pick = d.prefectures.indexOf(selected);
  const extra = pick > 0 && !top.includes(selected) ? selected : null;
  const columns = useMemo((): Column[] => {
    const shownNames = extra === null ? top : [...top, extra];
    return d.years.flatMap((yr, k) => {
      const t = stayAt(d, 0, k, unit);
      if (t === null) return [];
      const shown = shownNames.map((name) => ({
        key: name,
        value: stayAt(d, d.prefectures.indexOf(name), k, unit) ?? 0,
        color: colorOf(top, name) ?? PICK_COLOR,
      }));
      const rest = t - shown.reduce((a, s) => a + s.value, 0);
      return [{ year: yr, total: t, segments: [...shown, { key: REST, value: rest, color: REST_COLOR }] }];
    });
  }, [d, top, extra, unit]);

  const focus = pick < 0 ? 0 : pick;
  const focusName = d.prefectures[focus]!;
  const facilityYears = unit === "nights" ? d.facilityYears : d.guestFacilityYears;
  const facilityCube = unit === "nights" ? d.facility : d.guestFacility;
  const facilityColumns = useMemo((): Column[] => {
    return facilityYears.map((yr, k) => {
      const segments = d.facilities.map((name, f) => ({
        key: name,
        value: facilityCube[focus]![k]![f]!,
        color: FACILITY_COLORS[name]!,
      }));
      return { year: yr, total: segments.reduce((a, s) => a + s.value, 0), segments };
    });
  }, [d, focus, facilityYears, facilityCube]);

  const pickedValue = pick < 0 ? null : stayAt(d, pick, yi, unit);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[300px] shrink-0 max-lg:w-full lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col lg:self-start">
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <YearSelect years={d.years} value={year} onChange={(y) => setYearParam(String(y))} format={(y) => `${y}年`} />
          <span className="text-[11px] text-faint">全国に占める割合</span>
        </div>
        <RankList
          rows={rows}
          selected={selected}
          onSelect={(name) => setPicked(name === selected ? "" : name)}
          noneLabel="全国"
          noneValue={total === null ? "—" : compact(total)}
        />
        <p className="mt-2 border-t border-rule px-2 pt-2 text-[10.5px] leading-relaxed text-faint">
          都道府県を選ぶとグラフでその県だけを濃くし、下にその県の施設タイプを出す。同じ県をもう一度押すか「全国」で解除。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <h1 className="text-[19px] font-semibold tracking-tight">
            {unit === "nights" ? "都道府県別の外国人延べ宿泊者数" : "都道府県別の外国人実宿泊者数"}
          </h1>
          <div className="flex gap-2">
            <Segmented label="グラフ" options={CHARTS} value={chart} onChange={setChart} />
            {hasGuests && <Segmented label="単位" options={UNITS} value={unit} onChange={setUnit} />}
            <Segmented label="尺度" options={MEASURES} value={measure} onChange={setMeasure} />
          </div>
        </header>

        <p className="tnum min-h-9 pb-3 text-[12.5px]">
          <span className="font-semibold">{year}年</span>
          {total === null && <span className="text-muted">{` · この年の${unitLabel}はない`}</span>}
          {total !== null && <span className="text-muted">{` · 全国 ${compact(total)}`}</span>}
          {pickedValue !== null && total !== null && (
            <>
              <span className="text-muted"> · </span>
              <span
                aria-hidden
                className="mr-1 inline-block size-[9px] rounded-[2px] align-baseline"
                style={{ backgroundColor: colorOf(top, selected) ?? PICK_COLOR }}
              />
              <span className="font-semibold">{selected}</span>
              <span className="text-muted">{` ${amount(pickedValue)}（${pct(pickedValue / total)}）`}</span>
            </>
          )}
          {selected !== "" && (
            <button
              type="button"
              onClick={() => setPicked("")}
              className="ml-2 cursor-pointer rounded border border-rule px-1.5 py-px text-[11px] text-muted transition-[color,border-color,transform] duration-150 ease-out hover:border-rule-strong hover:text-ink active:scale-[0.97]"
            >
              解除
            </button>
          )}
        </p>

        <Years
          columns={columns}
          measure={measure}
          highlighted={top.includes(selected) ? selected : (extra ?? "")}
          focused={year}
          onFocus={(y) => setYearParam(String(y))}
          label={`都道府県別の外国人${unit === "nights" ? "延べ" : "実"}宿泊者数の${measure === "share" ? "構成比" : unitLabel}`}
        />
        <Legend
          items={[
            ...top.map((name, k) => ({ name, color: RANK_COLORS[k]! })),
            ...(extra === null ? [] : [{ name: extra, color: PICK_COLOR }]),
            { name: REST, color: REST_COLOR },
          ]}
        />

        <section className="mt-8">
          <h2 className="pb-2 text-[13px] font-semibold">{focusName}の宿泊施設のタイプ</h2>
          <Years
            columns={facilityColumns}
            measure="share"
            highlighted=""
            focused={year}
            onFocus={(y) => setYearParam(String(y))}
            height={220}
            label={`${focusName}の宿泊施設のタイプ別の構成比`}
          />
          <Legend items={d.facilities.map((name) => ({ name, color: FACILITY_COLORS[name]! }))} />
        </section>

        <ul className="mt-5 flex flex-col gap-1 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          <li>
            色のついた{TOP}都道府県は{last}年の上位。「{REST}」は全国からそれらを引いた残り。施設タイプは{d.facilityYears[0]}年からで、合計との差は「タイプ不詳」。
          </li>
          <li>全施設。延べ宿泊者数は人泊、実宿泊者数は人数。国籍別（従業者10人以上の施設）は「国・地域」。</li>
        </ul>
      </main>
    </div>
  );
}

function colorOf(top: string[], name: string): string | undefined {
  const k = top.indexOf(name);
  return k < 0 ? undefined : RANK_COLORS[k];
}

function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-[46px] text-[11px] text-muted">
      {items.map((it) => (
        <li key={it.name} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-[9px] rounded-[2px]" style={{ backgroundColor: it.color }} />
          {it.name}
        </li>
      ))}
    </ul>
  );
}
