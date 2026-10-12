---
name: revision-select
description: 採点のあるハーネス改訂は、開発点数が親を上回るときだけ残す。評価問は採点に混ぜない。proposer の重みは更新しない。
---

# revision-select skill

出典は Zhang ら、arXiv:2609.35738（Harness Learning Enables Generalizable Test-Time Adaptation）。

## 既にあるもの

次は近いが、同じ規則ではない。

- `docs/learnings.md` は言語的な内省であり、平均点数ではない。
- `node scripts/feature-gate.mjs` はいまの木の合否であり、親との比較ではない。
- `policy/learned/` は不変条件の置き場で、中身は空である。
- `harness-audit` はチェックリストである。
- `observation-fold` は再実行できる検索を畳む。
- cycle の3指標は skill の省略であり、課題の点数ではない。

## 使う

採点のある改訂は1候補ずつ、Reasoning Gym の保持規則にかける。

- 編集が適用できないときと、無変更のときは親を残す。
- 開発集合の平均点数が親を上回るときだけ候補を残す。同点と下回る点は親を残す。下回っても採用しない。
- 評価問はフィードバックと採点に入れない。フィードバックと採点は同じ開発問でよい。
- 実行報告の失敗例は最大8件。
- 妥当性（解析、適用、実行の割合）は報告に残す。保持の比較には混ぜない。
- 記録は任意の `cycle/revision.json`。あるときは feature-gate が同じ判定をする。無いときは通常の commit を止めない。

```bash
node scripts/revision-select.mjs --file round.json
```

`round.json` は `parent`、`candidate`、`sets.feedback`、`sets.score`、`sets.eval` を持つ。点数は 0 以上 1 以下。`sets.score` は親の採点問と一致する。任意の `retained` は判定と一致するときだけ通る。

## 使わない

proposer の重みは更新しない。教師の教師あり学習も、GRPO も、このリポジトリの依存に足さない。論文の逐次学習は、単発の改訂より安定して良いとは出ていない。テスト時に残るのは、凍ったモデルのまま実行結果でハーネスを残すかどうかだけである。

既存の `pnpm test` が緑であることを、この平均点数が上がったこととしては扱わない。緑が定常のスイートには改善余地が無く、能力の追加が止まる。点数は、頭のある課題を呼び出し側が渡す。

新しい席、Feature 票、機能ごとの ADR は作らない。
