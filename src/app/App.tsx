import { Suspense } from "react";
import { EraView } from "./views/EraView.tsx";
import { NationsView } from "./views/NationsView.tsx";
import { PlacesView } from "./views/PlacesView.tsx";
import { useUrlState } from "./hooks/useUrlState.ts";
import { SeriesBar, SeriesFooter } from "./components/Brand.tsx";

const VIEWS = [
  { id: "era", label: "時代", hint: "2011–" },
  { id: "places", label: "都道府県", hint: "2011–" },
  { id: "nations", label: "国・地域", hint: "2011–" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

export function App() {
  const [view, setView] = useUrlState<ViewId>("view", "era", (v) => VIEWS.some((x) => x.id === v));

  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule bg-paper/85 backdrop-blur-sm">
        <SeriesBar />
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-end justify-between gap-4 px-6 pt-5">
          <div className="pb-2">
            <h1 className="text-[15px] font-semibold tracking-tight">訪れた外国人は、どこに泊まってきたか</h1>
            <p className="text-[11px] text-muted">観光庁「宿泊旅行統計調査」</p>
          </div>
          <nav className="-mb-px flex gap-1" aria-label="ビュー">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-current={view === v.id ? "page" : undefined}
                className={`cursor-pointer border-b-2 px-3 pt-1 pb-2 text-[13px] whitespace-nowrap transition-colors duration-150 ${
                  view === v.id ? "border-ink font-semibold text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {v.label}
                <span className="ml-1.5 text-[10px] font-normal text-faint max-sm:hidden">{v.hint}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <Suspense key={view} fallback={<Loading />}>
        {view === "era" && <EraView />}
        {view === "places" && <PlacesView />}
        {view === "nations" && <NationsView />}
      </Suspense>

      <footer className="mx-auto w-full max-w-[1240px] px-6 pt-2 pb-10 text-[11px] leading-relaxed text-faint">
        出典: 観光庁「宿泊旅行統計調査」の各年の確定値。都道府県別の外国人延べ宿泊者数は推移表（2025年12月以前）の年計、施設タイプは第4表、国籍は参考第1表（従業者10人以上の施設）。
        延べ宿泊者数は人泊で、1人が1泊すると1人泊。各年の表は、都道府県の和と全国、国籍の和と合計が、公表値の丸め（10人泊単位）の範囲で一致することを確かめている。
        <SeriesFooter />
      </footer>
    </div>
  );
}

function Loading() {
  return <div className="mx-auto w-full max-w-[1240px] px-6 py-16 text-[12px] text-faint">読み込み中</div>;
}
