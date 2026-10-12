---
name: verifier
description: 起動しない。完了判定は親が feature-gate と pnpm test を実行する。
tools: Read, Grep, Glob, Bash
---

# verifier

この agent は起動しない。完了は `node scripts/feature-gate.mjs` と `pnpm test` の出口コードで決まる。別モデルが同じログを読み直す席は置かない。`model:` は置かない。起動されたときの既定スラッグにしない。
