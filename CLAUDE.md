# Claude Code

このリポジトリは Cursor、Claude Code、Codex で同じ契約を使う。正本は [`.claude/AGENTS.md`](.claude/AGENTS.md)。モデル ID は指定しない。実行はホストの既定。

commit 前に `node scripts/feature-gate.mjs` を通す。主語は `feat:` / `fix:` / `docs:` 等 + 日本語。`--no-verify` は拒否される。照会 bash が2本以上なら `node scripts/code-mode.mjs --step` を1回使う。
