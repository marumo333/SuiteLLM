# 振る舞いと名詞・動詞で進める

調査日: 2026-10-04。正本ではない。毎回の ADR と Feature 起票は、このリポジトリの製品開発には使わない。

## 判定

プロダクトは、機能ごとの振る舞いと、そのプロダクトの名詞・動詞で進める。Foundry の製品、権限基盤、オブジェクトDB、Connect / Understand / Analyze / Act / Automate を失敗の分類名にすることは採らない。文書を、テストとツールの代わりにはしない。

## ファイル

プロダクトごとに常時置くのは短い `AGENTS.md` だけにする。機能が自明なら `design.md` は書かない。

機能が説明を要するときだけ、次を置く。

| ファイル | 中身 | 出典の対応 |
| --- | --- | --- |
| `requirements.md` | `WHEN` 条件 `THE SYSTEM SHALL` 振る舞い。または Given / When / Then | Kiro の EARS。Spec Kit と OpenSpec のシナリオ |
| `design.md` | 構成、データの流れ、失敗時に何が残るか | Kiro の `design.md`。自明なら省略（OpenSpec は条件付き） |
| `tasks.md` | その機能の作業だけ | Kiro / Spec Kit |
| `docs/GLOSSARY.md` | 用語、Object type、Property、Link type | ユビキタス言語。ここに無い名前は作らない |
| `ACTIONS.md` | Parameters、Submission criteria、Ontology edits、Side effects | Foundry の動詞（actions）。Logic の Function は動詞に混ぜない |

## clone の直後

git は clone のときにリポジトリ内のスクリプトを実行しない。初期化は、clone の次に一度だけ叩く `node scripts/init.mjs` である。二度目も同じコマンドで、既存ファイルは上書きしない。

この順で行う。

1. ロックファイルを見る。`package-lock.json` なら `npm ci`。`pnpm-lock.yaml` なら `pnpm install`。`requirements.txt` または `pyproject.toml` ならその依存を入れる。両方あるリポジトリは両方入れる。
2. `.env.example` があり `.env` が無いときだけコピーする。`.env` はコミットしない。
3. `prisma/schema.prisma` があるときだけ `prisma generate`。
4. 次が無いときだけ、空の見出しを作る。あるファイルは開いて終わらせる。
   - `AGENTS.md` は短い作業合意だけ。
   - `docs/GLOSSARY.md` は用語と、Object type、Property、Link type。ここに無い名前は作らない。
   - `ACTIONS.md` は Parameters、Submission criteria、Ontology edits、Side effects。Function は動詞に混ぜない。
5. `design.md`、`requirements.md`、`tasks.md` は、機能の作業が始まるまで作らない。機能を始めるコマンドは `node scripts/start-feature.mjs <slug>` で、`features/<slug>/requirements.md` と `tasks.md` と、失敗する `features/<slug>/<slug>.test.mjs` を作る。`design.md` は `--design` のときだけ作る。二度目は上書きしない。見出しが無いときはこのコマンドを拒否し、先に `node scripts/init.mjs` を求める。このハーネスでは機能ファイルを作らない。確認は `node scripts/check-behavior.mjs` で、振る舞いが空のときと、テストが置き換え前のままのときは失敗する。
6. 入れた依存、作ったファイル名、次に叩くコマンド（`npm run dev` か、既にある test）を1画面で出す。

初期化がやらないことは、ADR と Feature の起票、モデル名の指定、既存ファイルの上書き、秘密の生成、このハーネスの OPA をプロダクトへコピーすることである。

このハーネスリポジトリを clone したあとは、いまどおり `pnpm install` である。`prepare` が git hooks を入れる。プロダクトの始め方は `TEMPLATE.md` の「プロダクトを始める」にある。機能ごとに ADR、レビュー、proposed、admitted は作らない。

`ACTIONS.md` の初期見出しには、動詞の3つの失敗を書いておく。提出を拒むときと書き戻しが失敗するときは状態を変えず、状態のあとで副作用だけが失敗することがある。

## 失敗

動詞の失敗は3つに書く。

1. 提出前に基準を満たさず、状態は変わらない。
2. 書き戻しが失敗し、状態は変わらない。
3. 状態は変わったあと、通知や外部の副作用だけが失敗する。

Connect から Automate の5語は、Ontology の定義ではなく、2023年の Process Mining ホワイトペーパーの工程である。公式の決定の構成は Data、Logic、Action、Security である。

## 根拠

- [Why create an Ontology?](https://palantir.com/docs/foundry/ontology/why-ontology/) は、データ要素を名詞、actions を動詞と書く。Logic と Security は別項である。2026-10-04 に本文を確認した。
- [Kiro Feature Specs](https://kiro.dev/docs/specs/feature-specs/)（ページ更新 2026-08-04）は `requirements.md`、`design.md`、`tasks.md`。振る舞いは EARS。探索的なコーディングとバグには向かないと公式が書く。
- [OaK](https://arxiv.org/abs/2608.22974) は、もっともらしいだけのオントロジーは決定に必要な関係を欠く、と要約で書く。スキーマと型付き関数を判定で直すときだけ成績が上がる。
- エージェントハーネスの利得はツール、ファイル窓、テストにある。散文の指示を増やすと遵守は落ちる。ADR の件数そのものがリードタイムを伸ばす計測は無い。
- [Anthropic の長時間ハーネス](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) は、clone 後にエージェントが `init.sh` を走らせて依存と起動を確認する。git 自体は clone 時にそのスクリプトを実行しない。

## このリポジトリとの境界

席・正本・ゲートの記録は、プロダクトへコピーしない。プロダクトでは ADR を足す操作をしない。
