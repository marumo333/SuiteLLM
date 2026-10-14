# AGENTS.md

このリポジトリは Cursor、Claude Code、Codex で同じ契約を使うテンプレート。対象は席・正本・ゲート・cycle。手順は [`TEMPLATE.md`](TEMPLATE.md)、エージェント向けの規約は [`.claude/AGENTS.md`](.claude/AGENTS.md)。Claude Code もこの `AGENTS.md` と [`.claude/AGENTS.md`](.claude/AGENTS.md) を読む。`CLAUDE.md` は置かない。Codex は `.codex/hooks.json` も読む。人の判断は [`docs/decisions/`](docs/decisions/) と [`docs/learnings.md`](docs/learnings.md) に残す。モデル ID は指定しない。

## Cursor Cloud specific instructions

このセクションは、update script 実行後のクラウド環境で起動する将来のエージェント向けの、非自明な起動・実行の注意点をまとめる。標準手順は既存ドキュメント（README / package.json / TEMPLATE.md）を参照。

### 何のリポか

Node.js 製のガバナンスハーネス。npm 依存パッケージは無い（`package.json` に `dependencies` なし）。中身は `scripts/` の Node スクリプト群と OPA によるポリシーゲート。

### 実行環境

- Node.js 22 系 + pnpm 10.33.3（corepack 経由）。追加の言語ランタイムは不要。
- ゲート（feature-gate / OPA）は **Linux amd64 専用**。`scripts/ensure-opa.mjs` が OPA v1.8.0 を `.tools/opa` に digest 検証付きで取得する（`.tools/` は gitignore）。macOS / Windows / Linux arm64 では動かない。
- 一致行検索の `rg` も同じ。`scripts/ensure-rg.mjs` が ripgrep 15.2.0 の musl バイナリを `.tools/rg` に tarball とバイナリの digest で固定する。PATH の `rg` と `apt-get` は使わない。
- `scripts/feature-gate.mjs` は末尾で、自分の隣の `contract-check.mjs` と `review-cap-check.mjs` を呼ぶ。policy と契約と `cycle/events.jsonl` の根は `HARNESS_ROOT`（無ければスクリプトの親）。契約は `node_modules/typescript` が要る。CI は `pnpm install` のあと、`origin/main` の `feature-gate.mjs` をチェックアウトへ向ける。`opa test` の policy は PR の `policy/`。tsc は PR の `node_modules` を、展開した scripts の隣に結ぶ。コミット主語の検査も `origin/main` の lint を使う。
- OPA バイナリの取得には GitHub Releases への外向き通信が必要。初回の `node scripts/feature-gate.mjs` 実行時に遅延ダウンロードされる。

### コマンド（lint / test / build / run に相当）

- 依存導入 + git hooks 設定: `pnpm install`（`prepare` が `core.hooksPath=scripts/githooks` を設定）。クラウドの起動は git clone のあと `.cursor/environment.json` の `install` で同じ初期化をする。クラウドも手元もプロバイダとモデルは聞かない。実行はホストの既定。答えは共有の yaml には書かない。
- 自動テスト: `pnpm test`（`node --test`）。
- ポリシー lint / test（OPA のみ）: `node scripts/feature-gate.mjs --test`。
- 正本ゲート本体（build/run 相当）: `node scripts/feature-gate.mjs`。見る範囲は `policy/canon.rego`。Feature 票は作らない。

### 非自明な落とし穴

- Cursor の `beforeShellExecution` ガード（`.cursor/hooks/pre-commit.mjs` → `scripts/lib/commit-guard.mjs`）は、**シェルコマンド文字列に `git config ... hooksPath` が含まれるだけで（読み取り目的でも）拒否する**。hooksPath を確認したいときは `.git/config` を読む（例: `grep hooksPath .git/config`）。同様に `git commit --no-verify` / `-n` も拒否される。
- コミットメッセージは conventional prefix + 日本語主語が必須（`feat:` / `fix:` / `docs:` / `chore:` など）。英語のみの主語や prefix 無しは commit-msg hook に落とされる。`--no-verify` は禁止。
- ルートの `AGENTS.md` は canon ではない（canon は `.claude/AGENTS.md`）。どのパスも Feature 票は要らない。
- モデル ID は指定しない。実行はホストの既定。どの agent の frontmatter にも `model:` は置かない。ゲートは席トークンと件数と effort を見る。計画確認のあと、ファイルが重ならないスライスはホストの既定で同時に進めるのが既定。重なるファイルは親が書く。枝に分けて後からマージする十数体は入れない。完成は 1 本の PR。席は増やさない（`docs/multi-agent-and-pins.md`）。
