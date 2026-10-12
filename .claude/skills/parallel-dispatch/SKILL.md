---
name: parallel-dispatch
description: 計画確認のあと、ファイルが重ならないスライスは grok-4.7-high で同時に進める。重なるファイルは親が書く。完成は 1 本の PR。
---

# parallel-dispatch skill（[[0031]] / [[0033]] / [[0040]]）

頭（**親 Grok**）が計画を subagent に配るときの判断基準と手順。
計画確認のあと、ファイルが重ならないスライスは `grok-4.7-high` で同時に進めるのが既定。重なるファイルは親が書く。枝に分けて後からマージする十数体は入れない。完成は 1 本の PR。

## 前提ゲート

1. **`plan-confirm` 承認証跡**があること（重ならないスライスを同時に進める前・[[0033]]）。無ければ起動しない。
2. **C トリガ**（正本/OPA/cycle/hooks の横断変更）は plan-confirm 同一 Task で
   `backend-architect` 設計レビュー済みであること。

## 判断基準（この順で判定）

1. **読み取り専用か？**（探索）→ 親が調べる。レビュー用の subagent は並べない。
2. **書き込みタスク同士が独立か？**（触るファイル群が重ならない）
   → **既定**。計画確認のあと、`grok-4.7-high` で同一ワークスペースの Task を 1 メッセージで同時に起動する。
   完成は 1 本の PR。親が統合する。
3. **同じファイル群に触るか？**
   → **重なるファイルは親が書く。** 枝に分けて後からマージする十数体は入れない。
4. **依存関係があるか？** → 同時に進めない。逐次にするか、境界を先に確定してから重ならないスライスだけ同時に進める。

## ディスパッチの手順

同じ規則の判定は `node scripts/parallel-slices.mjs`（`scripts/lib/parallel-slices.mjs`）。Task は起動しない。同時実行の数値上限は無い。数は重ならないスライスの数。

1. superpowers `writing-plans` で **2-5分粒度**にタスクを分解し、各タスクの「触るファイル群」を明記する。
2. `plan-confirm` を通す。重ならないスライスが無い修正では、この skill を使わない。
3. 仕様が明文化できた、ファイルが重ならないタスクのみ `grok_task`（[[0040]] / [[0049]] / `model-routing.yaml`）に委譲する。
   実行時の親名が裸の `grok-4.7` でも、Task には `grok-4.7-high` を渡す。裸の `grok-4.7` は Task スラッグではない。
   曖昧なタスクは親が分けてから `grok-4.7-high` に渡す。Opus には渡さない。
4. subagent への指示に必ず含める: 対象ファイル / 完了条件 / 読むべき ADR・criteria / 禁止事項。
   入力は **packet**（`scripts/harness-query.mjs`）。会話 fork は置かない。
   effort / escalate は親だけが cycle dispatch に書く。子が同じキーを返したら deny。
5. 起動は 1メッセージにまとめる。完了後、親が 1 本の PR に統合し、`node scripts/contract-check.mjs` と `node scripts/feature-gate.mjs` を実行する。
   検証用の subagent は起動しない。

## アンチパターン

- plan-confirm なしに重ならないスライスを同時に進めること。
- 粒度が大きすぎる委譲。
- 同じファイルを触る2体を同一ワークスペースで同時に起動すること。
- 重なるファイルを枝に分けて後からマージすること。
- model 未指定の汎用 Task で Fable/Opus ゲートを代替すること。
- hooks から Task を自動起動すること（[[0033]]）。
