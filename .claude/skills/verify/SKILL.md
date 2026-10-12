---
name: verify
description: 完了判定は親がスクリプトを実行する。verifier subagent は起動しない。
---

# verify skill

完了は親が次を実行して決める。`verifier` は起動しない。出口コードが決まる処理を、別モデルに読み直させない。

1. `node scripts/feature-gate.mjs`
2. ハーネスにテストがある変更は `pnpm test`
3. 挙動変更は TDD の失敗ログ、または `cycle/code-quality.yaml` の `tdd_exceptions`
4. 秘密は hook が拒否する
5. 重ならないスライスを同時に進めたときだけ、計画ファイルの `plan_confirm.status: approved`

1つでも失敗なら、そのコマンドの出力を直す。別のモデルに再判定させない。
