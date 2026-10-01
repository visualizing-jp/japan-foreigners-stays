/**
 * 国・地域ビュー。国籍別の延べ宿泊者数と、その国籍がどの都道府県に泊まったか。
 * 国籍別は従業者10人以上の施設だけで、全都道府県の数より少ない。
 */

import { use, useMemo } from "react";
import { loadStays } from "../data/load.ts";
import { PICK_COLOR, RANK_COLORS, REST_COLOR } from "../data/colors.ts";
import { coveredAt, firstNationYear, nationAt, nightsAt } from "../data/derive.ts";
import { exact, nights, pct } from "../data/format.ts";
import { RankList, type RankRow } from "../components/RankList.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { StackedYears, type Column, type Measure } from "../components/StackedYears.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { CHARTS, Streamgraph, type Chart } from "../components/Streamgraph.tsx";
import { Preliminary } from "../components/Preliminary.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";

const TOP = 8;
const REST = "そのほか";
const MEASURES = [
  { value: "count", label: "人泊" },
  { value: "share", label: "構成比" },
] as const;

export function NationsView() {
  const d = use(loadStays());
  const last = d.years.length - 1;
  const [yearParam, setYearParam] = useUrlState<string>("y", String(d.years[last]), (v) => d.years.includes(Number(v)));
  const year = Number(yearParam);
  const yi = d.years.indexOf(year);
  const [measure, setMeasure] = useUrlState<Measure>("measure", "count", (v) => v === "count" || v === "share");
  const [chart, setChart] = useUrlState<Chart>("chart", "bars", (v) => CHARTS.some((c) => c.value === v));
  const largest = d.nations.reduce((a, _, i) => ((nationAt(d, i, 0, last) ?? 0) > (nationAt(d, a, 0, last) ?? 0) ? i : a), 0);
  const [selected, setPicked] = useUrlState<string>("n", "", (v) => d.nations.includes(v));
  const Years = chart === "stream" ? Streamgraph : StackedYears;

  const top = useMemo(
    () =>
      d.nations
        .map((name, i) => ({ name, v: nationAt(d, i, 0, last) ?? -1 }))
        .filter((r) => r.v >= 0)
        .sort((a, b) => b.v - a.v)
        .slice(0, TOP)
        .map((r) => r.name),
    [d, last],
  );

  const covered = coveredAt(d, 0, yi);
  const all = nightsAt(d, 0, yi);
  const rows: RankRow[] = d.nations
    .flatMap((name, i) => {
      const value = nationAt(d, i, 0, yi);
      if (value === null) return [];
      const k = top.indexOf(name);
      return [{ name, value, label: pct(value / covered), indent: 0, color: k < 0 ? undefined : RANK_COLORS[k] }];
    })
    .sort((a, b) => b.value - a.value);

  const picked = d.nations.indexOf(selected);
  const extra = picked >= 0 && !top.includes(selected) && nationAt(d, picked, 0, last) !== null ? selected : null;
  const columns = useMemo((): Column[] => {
    const shownNames = extra === null ? top : [...top, extra];
    return d.years.map((yr, k) => {
      const t = coveredAt(d, 0, k);
      const shown = shownNames.flatMap((name) => {
        const value = nationAt(d, d.nations.indexOf(name), 0, k);
        if (value === null) return [];
        return [{ key: name, value, color: colorOf(top, name) ?? PICK_COLOR }];
      });
      const rest = t - shown.reduce((a, s) => a + s.value, 0);
      return { year: yr, total: t, segments: [...shown, { key: REST, value: Math.max(0, rest), color: REST_COLOR }] };
    });
  }, [d, top, extra]);

  const focus = picked < 0 ? largest : picked;
  const focusName = d.nations[focus]!;
  const placeColumns = useMemo((): Column[] => {
    const present = d.years.flatMap((_, k) => (nationAt(d, focus, 0, k) === null ? [] : [k]));
    const end = present.at(-1);
    if (end === undefined) return [];
    const ranked = d.prefectures
      .map((name, i) => ({ name, v: i === 0 ? -1 : (nationAt(d, focus, i, end) ?? 0) }))
      .filter((r) => r.v >= 0)
      .sort((a, b) => b.v - a.v)
      .slice(0, TOP);
    return present.map((k) => {
      const t = nationAt(d, focus, 0, k)!;
      const shown = ranked.map((r, i) => ({
        key: r.name,
        value: nationAt(d, focus, d.prefectures.indexOf(r.name), k) ?? 0,
        color: RANK_COLORS[i]!,
      }));
      const rest = t - shown.reduce((a, s) => a + s.value, 0);
      return {
        year: d.years[k]!,
        total: t,
        segments: [...shown, { key: REST, value: Math.max(0, rest), color: REST_COLOR }],
      };
    });
  }, [d, focus]);

  const pickedValue = picked < 0 ? null : nationAt(d, picked, 0, yi);
  const started = firstNationYear(d, focus);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[300px] shrink-0 max-lg:w-full lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col lg:self-start">
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <YearSelect years={d.years} value={year} onChange={(y) => setYearParam(String(y))} format={(y) => `${y}年`} />
          <span className="text-[11px] text-faint">10人以上に占める割合</span>
        </div>
        <RankList
          rows={rows}
          selected={selected}
          onSelect={(name) => setPicked(name === selected ? "" : name)}
          noneLabel="全体"
          noneValue={nights(covered)}
        />
        <p className="mt-2 border-t border-rule px-2 pt-2 text-[10.5px] leading-relaxed text-faint">
          国籍を選ぶとグラフでその国籍だけを濃くし、下に泊まった都道府県を出す。同じ国籍をもう一度押すか「全体」で解除。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <h1 className="text-[19px] font-semibold tracking-tight">国籍別の外国人延べ宿泊者数</h1>
          <div className="flex gap-2">
            <Segmented label="グラフ" options={CHARTS} value={chart} onChange={setChart} />
            <Segmented label="尺度" options={MEASURES} value={measure} onChange={setMeasure} />
          </div>
        </header>

        <p className="tnum min-h-9 pb-3 text-[12.5px]">
          <span className="font-semibold">{year}年</span>
          <Preliminary label="10人以上" />
          <span className="text-muted">{` · ${nights(covered)}（全施設 ${nights(all)} の${pct(covered / all)}）`}</span>
          {pickedValue !== null && (
            <>
              <span className="text-muted"> · </span>
              <span
                aria-hidden
                className="mr-1 inline-block size-[9px] rounded-[2px] align-baseline"
                style={{ backgroundColor: colorOf(top, selected) ?? PICK_COLOR }}
              />
              <span className="font-semibold">{selected}</span>
              <span className="text-muted">{` ${exact(pickedValue)}（${pct(pickedValue / covered)}）`}</span>
            </>
          )}
          {selected !== "" && pickedValue === null && (
            <span className="text-muted">{` · ${selected}はこの年の表に列がない`}</span>
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
          label={`国籍別の外国人延べ宿泊者数の${measure === "share" ? "構成比" : "人泊"}`}
        />
        <Legend
          items={[
            ...top.map((name, k) => ({ name, color: RANK_COLORS[k]! })),
            ...(extra === null ? [] : [{ name: extra, color: PICK_COLOR }]),
            { name: REST, color: REST_COLOR },
          ]}
        />

        <section className="mt-8">
          <h2 className="pb-2 text-[13px] font-semibold">「{focusName}」が泊まった都道府県</h2>
          {placeColumns.length > 0 && (
            <Years
              columns={placeColumns}
              measure="share"
              highlighted=""
              focused={year}
              onFocus={(y) => setYearParam(String(y))}
              height={220}
              label={`「${focusName}」の都道府県別の構成比`}
            />
          )}
          {placeColumns.length > 0 && (
            <Legend
              items={[
                ...placeColumns[0]!.segments.slice(0, -1).map((s) => ({ name: s.key, color: s.color })),
                { name: REST, color: REST_COLOR },
              ]}
            />
          )}
        </section>

        <ul className="mt-5 flex flex-col gap-1 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          <li>
            国籍別は従業者10人以上の施設だけ。{year}年は全施設の{pct(covered / all)}。表の合計は国籍不詳を含む。
          </li>
          <li>
            インドネシア・ベトナム・フィリピンは{firstNationYear(d, d.nations.indexOf("インドネシア"))}年から、イタリア・スペインは{firstNationYear(d, d.nations.indexOf("イタリア"))}年から別の列。それ以前は「その他」に含まれる。アメリカは米国、イギリスは英国にそろえた。
          </li>
          <li>
            色のついた{TOP}か国は{d.years[last]}年の上位。「{REST}」は、10人以上の合計からそれらを引いた残り。{started !== undefined && started > d.years[0]! ? `「${focusName}」は${started}年の表から。` : ""}
          </li>
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
