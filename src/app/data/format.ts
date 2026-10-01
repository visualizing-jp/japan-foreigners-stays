const int = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 1億人泊以上は億と万、10万人泊以上は万、それより小さい値は人泊。 */
export function nights(n: number): string {
  if (n >= 100_000_000) {
    let oku = Math.floor(n / 100_000_000);
    let man = Math.round((n - oku * 100_000_000) / 10_000);
    if (man === 10_000) {
      oku += 1;
      man = 0;
    }
    return man === 0 ? `${int.format(oku)}億人泊` : `${int.format(oku)}億${int.format(man)}万人泊`;
  }
  return n >= 100_000 ? `${int.format(Math.round(n / 10_000))}万人泊` : `${int.format(n)}人泊`;
}

export function exact(n: number): string {
  return `${int.format(n)}人泊`;
}

export function pct(share: number): string {
  return `${one.format(share * 100)}%`;
}

/** 前年比。「+9.5%」。 */
export function change(now: number, prev: number): string {
  const r = now / prev - 1;
  return `${r >= 0 ? "+" : ""}${pct(r)}`;
}

/** 軸の目盛り。5,000万以上は億、それ以外の 0 でない値は万。 */
export function tickMan(v: number): string {
  if (v === 0) return "0";
  if (v >= 50_000_000) {
    const oku = v / 100_000_000;
    return Number.isInteger(oku) ? `${oku}億` : `${one.format(oku)}億`;
  }
  return `${int.format(v / 10_000)}万`;
}
