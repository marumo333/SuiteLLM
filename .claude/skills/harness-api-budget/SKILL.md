---
name: harness-api-budget
description: 親は Grok。検証は契約と feature-gate を親が実行する。検証用 subagent は出さない。照会は code-mode、子へは packet。
---

# harness-api-budget skill（[[0033]] / [[0037]] / [[0039]] / [[0040]] / [[0045]] / [[0046]] / [[0047]] / [[0048]] / [[0049]] / [[0050]]）

## 席の要約

| 席                   | いつ                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| 親チャット **Grok 4.7 high** | 常時。壁打ち・調査・重なるファイルの実装・契約とゲートの実行・cycle 記録 |
| Task **Fable 5.1 high** | 重ならないスライスの前の plan-confirm、または人が明示したレビュー1回、grow 前の設計 |
| Task **Grok 4.7 high**  | 計画確認のあと、ファイルが重ならないスライスを同時に進める既定。完成は 1 本の PR |
| Task **Opus 5.5** / **Muse** | 起動しない。検証と内省は親が行う                                   |

## budget_guards（必ず守る）

1. 親を Opus/Fable にピッカー切替しない。
2. ゲート Task 入力は**成果物のみ**（計画 md / diff / 失敗ログ / ADR パス）。会話履歴の丸投げ禁止。
3. Muse / Opus の検証 subagent は起動しない。Sol / Terra / Luna も使わない。
4. 3体のレビューは起動しない。人が明示したレビューは Fable 1回で止める（[[0050]] / [[0051]]）。
5. plan-confirm は重ならないスライスを同時に進める前だけ。重なるファイルを親が書く修正では出さない。
6. 完了判定は `node scripts/feature-gate.mjs` の出口コード。名前付き agent に判定させない。
7. 人が明示した Fable の実効モデルが `claude-fable-5-1-thinking-high` でなければ、その起動は failed。
8. **1周の再注入**: 各席に渡すのは goal / feature / diff / 関連 ADR パス / 今周の事実だけ。
   `learnings.md` 全文と `decisions/` 全件を親と各 Task が読み直さない（同じ本文は1周1席）。
   これは入力トークン削減。pre-commit（[[0042]]）は回避防止であり、トークンは減らさない。
9. **code-mode（[[0048]]）**: 照会 bash が2本以上なら `scripts/code-mode.mjs` 1回。
    中間出力は文脈に載せない。生の `&&` 照会連鎖は hook が deny。Ultra でも省略しない。
10. **packet（[[0045]]）**: 子には `scripts/harness-query.mjs` が書いた JSON だけ。
    会話・learnings 全文・ADR 全件は継がない。effort / escalate は親が cycle の dispatch 行に書く。
    子を出すときは packet。会話 fork は置かない。
11. 型の正解は `tsc --noEmit`（[[0051]]）。親が指摘を直す・検討・記録・却下に1回分ける。コードを変えるのは直すだけ。そのあと noEmit が緑なら止め、二周目は開かない。親が `node scripts/contract-check.mjs` と `node scripts/feature-gate.mjs` を実行する。verifier / reflector / 3体は起動しない。人が明示した `skill:adversarial-review` は新しい周で1回まで。`skill:verify` と `skill:reflect` は新しい周で0回。過去の周は記録済み回数を超えて増やせない。超えたら feature-gate が拒否する。
12. **読み方。** 検索は一致行を残す（`node scripts/search-lines.mjs` か `rg -n`）。`rg -l` と件数だけは hook が deny。行が分かったファイルは `node scripts/file-window.mjs --file PATH --line N` の 100 行。`node_modules` と `.tools` は読まない。観測を畳むときは `scripts/lib/observation-fold.mjs` で、再実行できる検索の古いものだけ。ファイル本文は畳まない。現行ピンは `cycle/model-routing.yaml`。ADR の決定本文と learnings の日付付き記録は履歴。

## superpowers 接続

`brainstorming`(親 Grok) → `writing-plans`(親 Grok) →
`plan-confirm`(重ならないスライスの前) → 重ならないスライスは `grok-4.7-high` で同時、重なるファイルは親が書く → 契約と feature-gate（親が実行）。完成は 1 本の PR。

使ったら `cycle` skill で node/edge を記録する。
