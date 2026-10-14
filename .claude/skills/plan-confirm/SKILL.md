---
name: plan-confirm
description: 重ならないスライスの前の計画確定レビュー（backend-architect）。writing-plans完了直後・parallel-dispatch前に必ず使う。
---

# plan-confirm skill（[[0033]] / [[0037]] / [[0047]]）

**適用範囲**: `parallel-dispatch`（ファイルが重ならないスライスを同時に進める）の**直前のみ必須**。重なるファイルを親が書く修正では省略可。
この skill は重ならないスライスの前だけ使う。レビュー subagent はここから出さない（[[0051]]）。完成は 1 本の PR。モデル ID は指定しない。

## 手順

1. superpowers `writing-plans` で計画 md を用意する（親）。
2. **C トリガ判定**: 次のいずれかなら設計レビュー必須。
   - policy / cycle の再起 / 正本パスの変更
   - 複数 skill・policy にまたがる横断変更
   - hooks や GitHub Actions の強制点
3. `backend-architect` を **Task（ホストの既定・新しい文脈）**で起動。モデル ID は渡さない。入力は**計画 md のみ**（＋必要なら関連 ADR パス）。
   会話履歴は渡さない。実装禁止。
   - 非 C: 「壊せ／抜け／リスク。承認か差し戻しのみ」
   - C: 上記＋「境界・正本・再起の有界性・ADR 要否。設計不足なら差し戻し」
4. **承認** 時のみ、重ならないスライスを同時に進めてよい。計画ファイルに証跡を書く:

```yaml
plan_confirm:
  status: approved
  agent: backend-architect
  at: 2026-08-14T00:00:00Z
  c_trigger: false
```

5. 差し戻す指摘がある → 親が計画を1回直して再提出（新しい文脈・差し戻した項目だけ）。同じ指摘が2回出るか、記録だけの粗探しなら人に返して止める（[[0050]]）。
6. `verify` は重ならないスライスを同時に進めた案件でこの証跡を確認する（[[0016]]）。
