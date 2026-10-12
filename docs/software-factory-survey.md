# 公開リポジトリから見たソフトウェアファクトリー

調査日: 2026-10-04。対象は GitHub アカウント `marumo333` に、この実行のトークンから見えた公開リポジトリ。調査は親と、読み取り専用の3調査に分けた。

この文書は調査記録である。人の判断は `docs/decisions/` と `docs/learnings.md`、機能の判断は `features/<slug>/design.md` に残す。ここにあるのは、個人開発の実リポジトリに工場を合わせたときのレーン分けである。

## 見え方

| 区分 | 件数 | 根拠 |
| --- | ---: | --- |
| 所有者の公開リポジトリ | 33 | `gh repo list marumo333` の visibility が PUBLIC のみ。プロフィールの `public_repos` も 33 |
| 参加先を含む origin | 39 | `user/repos?affiliation=owner,collaborator,organization_member` |
| 練習用 fork | 10 | TechBowl の stations、`octocat/Spoon-Knife`、`anuraghazra/github-readme-stats` など |
| 非公開 | 0 | `user/repos?visibility=private` の長さが 0 |

非公開が 0 件なのは、リポジトリが無い場合と、この fine-grained PAT に非公開の権限が無い場合の両方があり得る。中身は見ていない。組織の非公開メンバーも見えない。

組織リポジトリは一覧に出る。コミット名義で `marumo333` を確認できたのは `group-program/minecraft-mod-translate-app` だけだった。ETロボコン、Kibo、TCDB、ChoibenAssist-Back は、このトークンでは作者として固定できない。工場の正は所有リポジトリにし、組織リポジトリはレーンの境界を示す参考にする。

## 結論

ソフトウェアファクトリーは1本のゲートにしない。個人開発で繰り返す形は3つで、残りにはこのハーネスの OPA を掛けない。

1. **個人Web。** Next.js App Router、Tailwind、npm の `package-lock.json`。
2. **AI製品。** `atrox` の pnpm + Turborepo + Vitest + CI。第二の形は `rag-faq-app` の FastAPI + Supabase。
3. **ガバナンス。** このリポジトリ。席・正本・ゲート・cycle。Next のひな型ではない。

組込み、練習 fork、単発実験は工場の外に置く。

## 個人Web

12件を再帰ツリーと `package.json` で見た。

`customer`、`seller`、`outfit-app`、`fish-spot`、`runners-free`、`fast-map`、`portfolio-site`、`outfit-app2`、`develoop-official/develop-site`、`develoop-official/ChoibenAssist-Front`、`RTP-RagToPent/Tier-Map-Frontend`、`group-program/game-information-app`。

| 仮説 | 判定 |
| --- | --- |
| 主形は Next.js App Router + Tailwind + npm。pnpm はこの12件に無い | 成立。ルータは `app/` が9、`src/app` が3。`pages/` は0。Tailwind が無いのは ChoibenAssist-Front（Panda CSS）だけ |
| バックエンドは Supabase が主で、Prisma は一部 | 一部。Supabase は7件。Prisma は `customer`、`seller`、`runners-free` の3件で、いずれも Supabase と併用 |
| lint はあるが GitHub Actions はほぼ無い | 成立。`lint` は10件。workflow は `fast-map` の ESLint と、ChoibenAssist-Front の GitLab ミラーだけ |
| テストはほぼ無い | 成立。例外は `outfit-app` の Jest 1件。`test` スクリプトは無く、ディレクトリ名 `__tests__ ` の末尾に空白がある |
| OPA を全アプリへコピーするのは過剰 | 成立。`opa` / `rego` / `feature-gate` は0。`tsc --noEmit` のスクリプトは `runners-free` の `type-check` だけ |

この12件に実在するものだけを台にする。

- npm scripts の `dev` / `build` / `start`（12件とも `next build`）
- `app/` または `src/app` の `layout.tsx` と `page.tsx`
- `tsconfig.json`
- `lint` と ESLint（`eslint.config.mjs` か `.eslintrc.json`）
- Tailwind の PostCSS または `tailwind.config.*`（11件）
- `PRD.md`（直下、`docs/`、`documents/`、`doc/`）
- `.env.example`（実在は `develop-site` と `Tier-Map-Frontend` の2件。ファイル名はこれに揃える）

品質用 CI の実例は `fast-map` の `lint.yml`（`npm ci` と ESLint）だけである。型検査を足すなら、実在するコマンドは `runners-free` の `tsc --noEmit` である。テストランナーはこのレーンの完成条件にしない。

## AI製品

本線は `marumo333/atrox`。公開説明は小説自動生成AIエージェント。pnpm 9.15.4、Turborepo、Node 22、Vitest。`apps/web` は Next.js 16、`packages/agent` は `@anthropic-ai/sdk`、`packages/db` は Drizzle と Neon。CI は lint、format、test、build の3段。Vitest は9ファイル。生成は `agent_queue` 経由で、cron は Vercel の `/api/cron/generate`。

ドキュメントと実装はずれている。`CLAUDE.md` は Hono と書くが、lockfile に `hono` は無く、API は `apps/web` の Route Handler である。工場に載せるときは Route Handler と `packages/agent` を正にする。

第二は `marumo333/rag-faq-app`。frontend は Next.js と Supabase、backend は FastAPI のオニオン構成、pgvector、Gemini。テストと GitHub Actions は無い。完成した台にはしない。

入れないもの。

- `marumo333-portfolio` は学習用 PRD の Phase 1 まで。動いているのは固定プロフィールの FastAPI と SvelteKit の lint CI。RAG の実装は無い。
- `ag-ui-frontend` と `ag-ui-server` は説明が学習用。localhost 固定で、ルートのファイル名が App Router になっていない。
- `amazon-scraper` は Playwright の単一スクリプトで、AIレーンではない。

## ガバナンス

`marumo-cloud` の対象は席・正本・ゲート・cycle である。依存は TypeScript と OPA。script は `test`、`opa:test`、`opa:gate`。workflow は `feature-gate.yml` と `harness-cycle.yml`。ここを Next のひな型にすると、製品の依存とゲートの依存が混ざる。

## 工場の外

| レーン | 例 | ゲート |
| --- | --- | --- |
| 組込み・ロボコン | `ET-2026` の Make サンプル、`Kibo-RPC5th` の Android Gradle、`kyonkyon-roket-2025` の Arduino | 掛けない |
| 練習 fork | TechBowl の stations 8本と、README 統計・Spoon-Knife | 掛けない |
| 実験 | `node-codetest`（Vitest あり、CI なし）、`atcoder`、`GivingCampaign-AutoVoter`、Electron の翻訳ツール | 掛けない |
| 別スタックの演習 | `store` は Rails。CI は Brakeman、RuboCop、Postgres 上の `rails test` | このハーネスは掛けない。Rails の CI は既にある |

`ChoibenAssist-Back` の実行ゲートは GitLab CI（pytest と black）で、GitHub 側はミラーだけである。

## 直した方がよい事実

中身の秘密は読んでいない。

- `marumo333/vite-techtrain` のルートに `.env` がある（55バイト）。`.env.example` ではない。
- `marumo333/demo-site` と `marumo333/React-kiso1` の既定ブランチに `node_modules` がある。
- `RobotClub-RyukyuUniv/TCDB` の木に `backend/__pycache__` がある。
- `outfit-app2` は `outfit-app` へ merge 済みと説明にあり、既定ブランチは `new-branch` のまま残っている。

## 検証

親が origin 39件のルート、言語、workflow 名、依存の信号を集め、3つの読み取り専用調査が仮説をファイルで確かめた。

- 個人Webの12件は、Next と npm と App Router で一致した。Supabase は過半数であり全員ではない。
- AIレーンの本線は `atrox`、ガバナンスは別レーン、学習用と Playwright 実験は工場に入れない、で一致した。
- 組込み・fork・Rails・Electron はビルド正本が一致せず、単一ゲートにできない、で一致した。
- 非公開件数 0 は、親と3番目の調査で同じコマンド結果だった。

検証用の subagent は起動していない。完了の判定は、この文書が上記のファイル事実と矛盾しないことである。
