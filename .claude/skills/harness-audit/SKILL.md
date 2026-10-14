---
name: harness-audit
description: ハーネス健全性を決定的にスコア化し履歴に記録。実行するほど成長しているかを可視化する。
---

# harness-audit skill

## スコア項目（決定的・0-100）

- ルール網羅: `.claude/AGENTS.md` の禁止が hooks で強制されているか。
- 判断の置き場: 人の判断が `docs/decisions/` にあり、実行メモが `docs/learnings.md` にあるか。
- **席割当の整合（[[0033]] / [[0049]] / [[0051]]）**: `model-routing.yaml` は host-default。製品スラッグは無い。検証用 subagent は空。AGENTS / skills が verifier や 3体の起動を必須にしていないか。
- **ハーネス制約（[[0039]] / [[0051]]）**: 席は親。モデル ID は指定しない。検証は契約と feature-gate。機能ごとに ADR、レビュー、proposed、admitted は作らない。
- **cycle 整合（[[0039]]）**: required-cycle の必須ノードが記録され、3指標が出せるか。
- セキュリティ: hooks が秘密の読取と外部送信を止めているか。
- 学習: learnings が更新されているか。機能ごとの票は増えていないか。
- **OPA 整合**: `opa test policy/` が緑。Feature 票は無い。

## 実行席

監査の集計・文書突合・判定は親。検証用の Task は出さない。

## 出力

合計スコアと内訳を、その周の報告に書く。前回比の増減を報告。下降時は原因を明示する。
