# 訪れた外国人は、どこに泊まってきたか

観光庁「宿泊旅行統計調査」をもとに、外国人の延べ宿泊者数を時代／都道府県／国籍の3つの切り口で探索するダッシュボード。

- 想定URL: https://japan-foreigners-stays.visualizing.jp/
- シリーズ: [日本にいる外国人は、どこから来たか](https://japan-foreigners.visualizing.jp/)（`../japan-foreigners/`）

visualizing.jp スタンドアロン（dataviz.jp サブスクツールではない）。

## 開発

```bash
npm install
npm run fetch && npm run normalize && npm run data && npm run verify
npm run dev
```

| スクリプト | 内容 |
| --- | --- |
| `npm run fetch` | 推移表と各年の集計結果を観光庁のサイトから `data/raw/` へ（`-- --force` で取り直し） |
| `npm run normalize` | 正規化 JSON を `data/normalized/` へ |
| `npm run data` | 配信用 JSON を `public/data/` へ |
| `npm run verify` | 都道府県の和・施設タイプの和・国籍の和の突き合わせ |
| `npm run dev` | Vite 開発サーバ |
| `npm run build` | 本番ビルド |
| `npm run typecheck` | TypeScript 検査 |

データ設計の正本は [`docs/data-sources.md`](docs/data-sources.md)。

## ビュー

- **時代** — 都道府県別の外国人延べ宿泊者数（2011–）と、宿泊施設のタイプ（2015–）
- **都道府県** — 年ごとの順位と、上位の構成の推移、選んだ県の施設タイプ
- **国・地域** — 国籍別の順位（従業者10人以上の施設）と、その国籍が泊まった都道府県

## デプロイ

`main` への push で GitHub Pages にデプロイ（`.github/workflows/pages.yml`）。カスタムドメインは `public/CNAME`。
