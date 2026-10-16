# learnings.md — 自己成長ループの記憶（実行ごとに追記）

<!-- 人が読む文は日本語。機械キー・コマンド・パスは英語のまま。 -->

各タスク完了時に `worked` / `failed` / `edge cases` を追記する（人が読む本文は日本語）。
再現できる判断は `docs/decisions/` に残す。機能の判断は `features/<slug>/design.md` に残す。機能ごとに ADR、レビュー、proposed、admitted は作らない。
ハーネスの実行日記だけを書く（[[0039]]）。

---

## 2026-09-11 — 工場比喻を監査 / token効率化へ置換（F-0011 / C-0011）

**問い**

- README の工場比喻（工場長 / 治具 など）を正本語彙（席・正本・ゲート・cycle）へ寄せ、
  後退を機械判定で止められるか。

**worked**

- 人間指示の写像をそのまま固定した。治具 code-mode → `token効率化`、工場長 → `監査`。
  ソフトウェア工場 / 工場フロア / 工程カード / 抜き取り / 検査 / 振り返り / 出荷 / 正本倉庫 / 原料 も置換。
- TDD 赤は新テストが `### 監査` 不在で失敗（アサーションを先に置き README を後で直した）。置換後 3/3 緑。
- 旧語を `doesNotMatch` で固定したので、次周に工場語が戻ると赤になる。
  用語の一貫性を人の読みではなく `scripts/license-readme.test.mjs` に落とせた。
- 触ったのは表示テキストだけ。mermaid の node id（`plant` / `warehouse` / `ship`）と
  C-0009 が固定した禁止辺（`FG --> warehouse` / `Gate --> Feat` / `HK --> AR` / `HG --> CanonOut`）・
  cycle 辺（`AR --> VR` / `VR --> RF` / `HM --> warehouse`）は変えていないので、権限モデルのテストは緑のまま。
- `pnpm test` 113、`opa test` 77、`feature-gate` 成功（F-0001 被覆）。F-0011 は proposed のまま、入場しない。
- commit 2b41e05 は origin に push 済みで PR 14。C-0009 でブロッカーだった push 権限は解消している。

**failed / edge cases**

- C-0009 のエントリは当時の現物（工場 mermaid・工場語のノード名）を書いている。履歴なので消さない。
  現行 README の第1図見出しは「監査」で、C-0009 の記述と現物のずれは本エントリで吸収する。
- 「工場」を全文一括置換すると、棄却済み他社概念の固有名
  （`docs/superpowers/specs/2026-09-04-token-efficiency-design.md` の「Uber 工場」）まで巻き込む。
  禁止語の適用範囲は README に限定し、非対象を設計メモに明記した。
- F-0011 のファイル名は `F-0011-mit-license-factory-diagram.yaml` のまま。
  出生票のパスは動かさず、`title` と `problem` だけ現行語彙へ直した。
- 用語修正でもテスト列挙は既存のまま済んだ。新規テストファイルを足していないので、
  C-0009 で踏んだ `package.json` と `.github/workflows/feature-gate.yml` の二重列挙は再発しない。
- trio は Fable 承認 / Grok 承認 / Muse が初回差し戻し（読了範囲不足）→ seq4 の再レビューで承認。
  Muse は packet の `diff_stat` が略称だけだと現物を読まずに判定に入る。席の傾向として記録する（[[0031]]）。
- 原因は packet 側にある。commit 後は `git diff --stat` が空なので親が
  `README LICENSE TEMPLATE package.json ...` と略称を手書きし、レビュー席が必読パスを引けない。
  再現可能な改善なので F-0012 を proposed で起票した。
- plan-confirm は並列展開なしで省略、harness-grow は入場なしで省略。

---

## 2026-09-11 — MIT と工場 mermaid（F-0011 / C-0009）

**問い**

- 複製先に法的包装（LICENSE）を付け、README の構造図を静的 PNG から mermaid 正本へ移せるか。

**worked**

- `scripts/license-readme.test.mjs` が3点を機械判定する。LICENSE は OSI MIT の全文一致、
  `package.json` の `license` は MIT、README は mermaid 3図（工場 / ランタイム / 再起的自己改善）。
- TDD 赤は LICENSE 不在の `existsSync` false。追加後に緑。
  `pnpm test` 113、`opa test` 77、`feature-gate` 成功で前進可能。
- 図は禁止辺を `doesNotMatch` で固定した（`FG --> warehouse` / `Gate --> Feat` / `HK --> AR` / `HG --> CanonOut`）。
  必須辺は `AR --> VR` / `VR --> RF` / `HM --> warehouse`、OPA は「判定のみ」表記。
- 旧 PNG は `docs/architecture/` に履歴として残した。README 本文は PNG を参照しない。
- 適用は F-0001 被覆。F-0011 は proposed のまま。0044 決定本文は消していない。

**failed / edge cases**

- CI のテスト実行は `node --test` の明示列挙なので、新テストは `package.json` の `test` と
  `.github/workflows/feature-gate.yml` の両方に足さないと緑のまま走らない。片方追記が初回の指摘点。
- 初回 trio は体1/体2が差し戻し。「欠落 PNG」の誤記（実体は履歴として存在）、工程順が逆、
  ゲートから倉庫へ抜ける辺、Fable が hooks を踏む表記、CI 未列挙。
- 再レビューも体1が差し戻し。`HK --> AR` は hooks からレビューへ出る辺、`HG --> CanonOut` は
  allow を迂回する直結。図の矢印1本が権限モデルの誤読を作るので、禁止辺はテスト側に落とした。
- 3回目 trio で 3/3 承認。plan-confirm は並列展開なしで省略、harness-grow は入場なしで省略。
- ブロッカー: 環境の `GITHUB_TOKEN` が無効で origin へ push できず、PR 作成は
  「remote に commits が無い」で失敗した。ローカル `cursor/mit-license-factory-diagram-1dcb` に 3 commit。
  ゲートが全部緑でも push 権限は verify の外側で落ちる。

---

## 2026-09-11 — ディスパッチ packet を本 PR で実装する（F-0007 / C-0010）

**問い**

- トークン効率の本丸（子に会話を継がない / 何バイト渡したか測る）をこの prime で入れるか。

**worked**

- `harness-query` が `C-NNNN.<node>.<seq>.json` を gitignore 配下に書く。32KiB・空・禁則キーは失敗。
- `packet.rego` は deny 空だけ。幅1 effort、canon 周の stay、子の自己昇格、Muse の第3外を落とす。
- `token_ledger` は観測だけ。3指標 / `need_rerun` は変えない。
- F-0007 は proposed のまま。適用は F-0001。0045 は新規。0044 決定本文は消さない。
- TDD 赤は `ERR_MODULE_NOT_FOUND` / `foldTokenLedger` 未 export。その後 assertion 緑、`pnpm test` 100、feature-gate 成功。

**failed / edge cases**

- `some k; k in input.child_keys` は OPA で unsafe。完全ルール `child_promotes if "effort" in ...` に分解した。
- 人間指示で起票と同じ PR に適用した。admit はしない。
- plan-confirm は並列展開していないので省略。
- 初回 trio 3/3 差し戻し: `packet.rego` が opa test 専用で dispatch に刺さっていなかった。
  sha256 形式だけ見て実体と突合せず、欠落は fail-open、`--seq` で単調増加を迂回できた。
  執行点を `cycle-record --type dispatch` に移し、node×seat から役割を導出し、欠落は deny にした。
- 再レビューも差し戻し。`--canon-path-count` 自己申告と git 失敗時の 0 を廃し、
  席を dispatch_seats に固定、Muse は escalate trio 必須、`--adr` の symlink を拒否した。
- 3回目 trio: review 席から grok（体2）が落ちていた。GIT_DIR 偽装で件数 0 にできた。
  空 feature を事実とみなしていた。体2を review_trio に戻し、git 環境変数を無視し、空値を事実から外した。
- 4回目は 1/3。GIT_DIR テストが実リポ差分に依存し main で赤になる。diff_stat 空白が事実扱い。
  テストを一時リポに移し、空白 diff_stat も空にした。
  続けて ZWSP と PATH 偽 git を塞いだ。HARNESS_ROOT 差し替えは残る（CLI の作業根）。

---

## 2026-09-11 — Uber code-mode を本 PR に入れる（F-0010 / C-0009）

**問い**

- Ultra でも効率と精度を同時に取る。記事の bash 一括は入っているか。

**worked**

- 2+ 照会の生 `&&` は hook deny。`scripts/code-mode.mjs --step` 1回が正。
- 要約 JSON のみ。上限超過は truncate せず失敗。
- commit-guard は code-mode の `--step` 内 `--no-verify` も見る。
- F-0010 は proposed。適用は F-0001。harness-query（F-0007）は別のまま。

**failed / edge cases**

- hook は未来の turn を結合できない。バラした単発照会は止めない。
- TDD 赤は当初 `ERR_MODULE_NOT_FOUND`（`/tmp/code-mode-red.log`）。
- cache TTL は触らない。

---

## 2026-09-11 — 計画/レビューを Fable 5.1、第3を Muse に揃える（F-0009 / C-0008）

**問い**

- 計画確定は Opus のままでよいか。レビューは Fable 5.1 の方が的確か。
- 第3を Muse に完全に差し替えるか。

**worked**

- 計画と敵対レビューは Fable 5.1 high。verifier / reflector は Opus。
- trio は Fable / Grok / Muse。Fable と Opus は同居させない。
- 第3の現行ピンは Muse medium。0044 決定1 も Sol を現行から外した。
- Fable の Opus フォールバックは failed。

**failed / edge cases**

- Fable は約2倍。Privacy Mode は保持オプトインが要る。
- 検証席まで Fable にはしない。機械判定に払う理由が薄い。
- 初回 trio は 3/3 差し戻し。0044 決定本文を再び書いた、C-0008 を learnings だけに書いた、
  受理 ADR の決定本文を in-place 置換した、F-0009 に F-0001 適用経路が無かった、
  F-0007 spec が Sol 第3のまま、0040 の役割不変条件への免除が無かった。
- 決定本文は戻して改正注記だけ現行ピンにする。適用経路は F-0008 と同じ文を 0047 に書いた。

---

## 2026-09-11 — 第3レンズを Muse Spark 1.3 にする（F-0008 / C-0007）

**問い**

- OpenAI 同梱切れの前に、第3席をどの独立ファミリーへ切るか。

**worked**

- 人間が Flash 待ちを上書きし、現行ピンを `muse-spark-1.3-medium` にした。
- 系列は Anthropic / xAI / Meta。Composer / Fable / Sol は第3に使わない。
- F-0008 は `proposed` のまま。適用は F-0001 の in_progress 被覆。
- F-0007 起票 PR とこの切替を一つの PR にまとめた。

**failed / edge cases**

- 初回 trio は体1/体2が差し戻し。C-0006 を F-0007 と二重に書いた、0044 決定本文を書き換えた、
  `sol_seat` 削除で deny が弱く見えた、F-0008 の `supersede_adr` が false のまま ADR を改正した。
- C-0007 に直し、0044 本文は戻し、`no_sol_terra_luna` を置いた。適用は F-0001（F-0003 と同じ）。
- Muse は聞き返しを訓練している。不確実は差し戻し、を skill に足した。
- Kimi / GLM は Desktop のみ。Task スラッグが無いのでピンしない。

---

## 2026-09-10 — ディスパッチ packet 起票（F-0007 / C-0006）

**問い**

- Graph / Loop / Judge / LangChain context mode をこのハーネスに写すとき、
  親から子へ何を継ぎ、誰が model / effort を変えてよいか。

**worked**

- 会話 fork は不採用。写すのはリポに落ちた事実の JSON packet（isolated / packet）。
- 親の effort / escalate 上書きはノード属性として残す。子の自己昇格は不可。
- 型の正本は TypeScript ではなく Rego（0014 / 0043）。
- 本周は出生規則どおり F-0007 を `proposed` だけ起票。admit しない。

**failed / edge cases**

- 0044 の `harness-query` は未実装のまま。本票が入場後に実装する。
- 指名できる xAI 個人の「evals をエージェントが持て」ツイートは一次ソース未確定。
  公式は Grok 4.6 カード §5。採点関数はループの外（InferenceEval / 本リポの OPA）。
- F-0001 の `approved` 自己申告（C1）はこの PR では直さない。
- 初回敵対レビューは差し戻し。paths の部分木被覆、supersede_adr、escalate の引き下げ、
  平文 writer、packet 保管が抜けていた。票をファイル単位に直し、spec に閉じた。
- 再レビューも差し戻し。F-0001 和集合でファイル単位が強制にならないこと、
  stay の高リスク判定が散文だったことを認め、自票パス追加と機械導出を spec に書いた。
- 三回目は高リスク集合の手書き列挙が 73 ファイルを漏らした。canon 非空を高リスクに倒す。
- 四回目は低リスク例外が evidence と skill を単独レンズに落とした。例外は置かない。

---

## 2026-08-18 — 三層知識 TLK（F-0006 / C-0005）

**問い**

- 複数エージェントが knowledge と ADR を全文読込するので、AI 層 / 中間層 / 人間層の三層と
  「764 次元 ontology」を作れと求められた。

**worked**

- 調査で「3 聴衆 × 764 次元」の完成規格は存在しないと確認した。外部記事の 764 は
  埋め込み次元 768 の誤記が大半だった。数値を仕様の主語にしないと決めた。
- 埋め込みベクトルを入場判定に使う案は落とした。取得内容を判断根拠に昇格させる形になり
  [[0018]]（取得内容/ツール出力はデータ扱い）と衝突する。
- 採用は三層知識 TLK。machine（Feature / criteria / policy）が正本、index（`catalog.json`）は
  advisory な地図、human（ADR / learnings）は読み物。index は派生で何も決定しない。
- Pydantic は入れない。依存ゼロ（Node のみ）を保ち、形の正本は OPA / Rego 側に置いた。
- 差し戻しは全部実装前・マージ前に落ちた。plan-confirm 3 回 → 敵対レビュー 4 回で計 7 件。
- 当時（2026-08-18）の席は親 Grok 4.6、設計 / レビュー / 検証は Opus Task。Sol は 3 体多数決の条件に届かず未使用。現行の親は `grok-4.7-high`（`cycle/model-routing.yaml`）。
- 検証は `pnpm test` 77 件と feature-gate が緑。

**failed**

- plan-confirm の差し戻し 4 点: index の識別子が Feature / ADR と衝突（id 衝突）、
  catalog が古いまま参照される鮮度、CI での再生成・検証が無い、
  `summary` が原文の代替として読まれる。設計段で 3 回往復してから承認になった。
- 敵対レビューの差し戻し 4 点: 外部由来 id を catalog キーにできる id 注入、
  Feature の `status` 欠落を許容、生成器が symlink 経由でツリー外を読む、
  `HARNESS_ROOT` 差し替えでゲート外のファイルを正本として読める。
- F-0006 は `proposed` のまま。今回の canon 適用は F-0001 の広域被覆に依存する（既知 C1 の続き）。
- `adversarial_review: approved` は依然自己申告。レビュー成果物ハッシュとの突合は未実装。

**edge cases**

- 「index は決定しない派生」と明文化しないと、agent が `catalog.summary` を根拠に入場を判断する。
  README に「入場・被覆・不変条件は Feature / criteria / policy の原文を読む」を書いた。
- `HARNESS_ROOT` はテストに必要で消せない。ゲート内スクリプトはルート由来のパスだけ信頼する。
- `catalog.json` は生成物で canon 外。生成器（`scripts/`）と `required-cycle.json` は canon 側。
- 764 / 768 のような外部由来の数値は ADR に書かない。必要になったら根拠付きで criteria に落とす。
- 新規 Feature は起票しない。今周の改善は F-0006 に収まり、残る 2 件（F-0001 広域被覆・
  レビュー証跡の突合）は新発見ではなく既知限界の持ち越しなので重複起票しない。

---

## 2026-08-15 — ADR 0039 をハーネス制約に言い換え（文書）

**問い**

- ADR 0039 の題と本文が排除リストになっていた。
- README に由来と「置かないもの」の節があった。

**worked**

- 0039 の題と決定をハーネス制約（席・正本・ゲート・cycle）に言い換えた。
- README / TEMPLATE / ADR / skill から排除リストと由来の記述を消した。
- F-0002 は `proposed` のまま。適用被覆は F-0001。

**failed**

- kind `product` は OPA 互換のため残し、表の説明だけ未使用にした。
- ランタイム図の排除リストフッタは再描画で消した。図は canon 外。

**edge cases**

- clone URL の `marumo333/cursor-harness` はこのリポの実体なので残した。
- 「並列展開案件」はグラフの案件ではないので残した。

---

## 2026-08-15 — 常時 pre-commit と日本語 conventional 主語（F-0005）

**問い**

- 実装後の commit が Claude PreToolUse だけだと迂回できる。主語が英語。
- 1周合計のトークンを、KV cache / Kimi K3 / Obsidian で減らせるか。

**worked**

- git / Cursor / Claude の三重 hook。`--no-verify`・連鎖・略記・`GIT_CONFIG_*`・空 hooksPath を拒否。
- 主語は `feat:` 等 + 日本語。Merge / Revert / fixup は例外。
- 敵対レビューの C1（`git add && git commit --no-verify` が allow）をテストで先に赤にして直した。

**failed**

- hook 自体は入力トークンを減らさない。節約は席への再注入削減（packet）側。
- CI の主語検査は先端だけ。0042 以前の英語コミットは書き換えない。
- `node` 不在の GUI git と OPA 未導入環境では commit が止まる（fail-closed）。

**edge cases**

- Cursor hook はシェルコマンド文字列に `--no-verify` が含まれるだけで deny する。
- F-0005 は `proposed`。適用被覆は F-0001。

---

## 2026-08-15 — PR レビュー指摘の再修正（F-0004）

**問い**

- 受理 ADR の決定文がまだ 4.5。親スラッグが Task に無い xhigh。npm 前提。
- clone 直後に実装へ飛ぶ。README に設計図が無い。0026 が Sonnet/Haiku 委譲のまま。

**worked**

- 当時の世代更新として 0031/0033/0037 の決定文を Grok 4.6 にした。0026 に当時の注記（実装は Grok 4.6、Sonnet/Haiku 委譲は廃止）。現行ピンは `cycle/model-routing.yaml`。
- 当時、criteria の親/Task を `cursor-grok-4.6-high-fast` に揃えた。xhigh は努力段として残し、ピンにはしない。現行の親は `grok-4.7-high`。
- パッケージマネージャを pnpm に固定（ADR 0041）。
- TEMPLATE/0039 に clone → ADR 技術選定 → Feature → 実装。README に Mermaid。
- reflect の評価トークンを `worked` / `failed` / `edge cases` に戻した。

**failed**

- F-0004 は `proposed`。canon 適用は F-0001 被覆（既知 C1）。
- allow から pnpm を外した。`node --test:*` も `--import` で任意実行できるので、テストは完全一致だけ許す。
- `pnpm check` は script 欠落時に PATH の `check` を実行するので `pnpm run check` にした。
- TEMPLATE の「起票直後に入場」は出生規則と衝突するので、起票 PR マージ → 次 PR 実装に直した。
- README / TEMPLATE / pnpm-lock.yaml を canon に入れた。CI は `node --test` 直呼び（第三者 Action なし）。

**edge cases**

- xhigh は 4.6 に存在する。Task allowlist に xhigh-fast が無いので criteria には書かない。

---

## 2026-08-15 — 親/trio の Grok 席を 4.6 に更新（ADR 0040 / F-0003）

**問い**

- 親の実体は `cursor-grok-4.6-xhigh-fast` なのに、文書と criteria が 4.5 / 旧スラッグのまま。
- 4.6 GA 後、他席（Opus / Sol / Fable / Composer）も動かす必要があるか。

**効いた**

- 公式（2026-08-12）は 4.6 を長時間エージェントと指示追従の後継と明記。同一 Cursor Models 枠。
- 旧スラッグ `grok-4.5-fast-xhigh` は廃止済み。Task 実在は `cursor-grok-4.6-high-fast`。
- 親スラッグは実体の xhigh-fast、trio/並列展開は Task allowlist の high-fast に分けた。
- Opus 5 / Sol / Fable / Composer / Auto は据え置き。席骨格（0033/0037）は触らない。
- 旧 ADR 本文は歴史として残し、改正注記と 0040 だけを正本にした。

**失敗 / リスク**

- Cursor ヘルプの available-models はまだ flagship=4.5、Router 必須も 4.5。文書遅れを理由に戻さない。
- F-0003 は `proposed`。同一 PR で admitted にしない。canon 適用は merge-base の F-0001 で被覆。
- Task に 4.6 非 Fast / xhigh-fast が無い。親 UI スラッグを Task に渡すと静かにフォールバックし、3ファミリーが壊れる。
- 旧ピン `grok-4.5-fast-xhigh` は 4.5 に無い努力段を含んでおり、改名前から無効だった。
- help の 4.5 Fast 出力 $18 と Models & Pricing の $12 が食い違う。価格差は差し替え理由に使わない。
- 敵対レビュー: F-0003 の `supersedes: [0031,0033,0037]` は骨格廃止に読めるので空にした。
  `chat_orchestrator` と `grok_task` を分けた。旧 ADR 決定箇条に「旧・0040」を打った。
  F-0001 広域被覆は既知 C1 の続きなのでこの票では直さない。

**次**

- 次の Grok 世代は GA + Task スラッグ実在 + 公式の長時間/指示追従根拠が揃ってから ADR+Feature。
- Claude/Sol も同じ条件。ヘルプの flagship 表記だけでは動かさない。

---

## 2026-08-14 — ハーネス制約と有界サイクル（ADR 0039 / F-0002）

**問い**

- ハーネスの対象（席・正本・ゲート・cycle）が文書で揺れていた。
- 自己改善は1周の手順だけで、skill 省略の3指標もマージ後の再起も無かった。

**効いた**

- 対象を席・正本・ゲート・cycle に閉じた。
- 必須ノードの used/skipped を `cycle/events.jsonl` に書き、node/edge/state を出す。
- 再起は人間の PR マージ後だけ。hooks から Task は起動しない。metrics 緑なら止める。
- `events.jsonl` は canon 外（追記ログ）。必須集合は `required-cycle.json` だけ。
- cycle.rego はキー欠落を deny。`gh pr list` 失敗は未処理扱い（欠落で拒否）。
- 再起は省略/失敗がある周だけ。空サイクルの integrity=0 では量産しない。
- feature-gate は PR ツリーの `*.test.mjs` を実行しない（信頼ゲート内の遠隔コード実行を回避）。
- `cycle-record` は node/state を検証し、`human_approved` は after-merge 専用。
- `cycle.admission.deny` が配列でなければ終了コード 1。壊れた events.jsonl は書き換えない。

**失敗 / リスク**

- Actions が Feature YAML を書く。`proposed` + `mutates_canon: false` に閉じ、エージェントは起動しない。
- `adversarial_review: approved` は依然自己申告（F-0001 既知限界の続き）。
- PR #1 が main に入った時点で F-0001 bootstrap は切れた。`bootstrap: true` のままでは
  以降の apply が全 deny になる。導入後は `bootstrap: false` にする。
- F-0002 は同一 PR で admitted にできない（出生規則）。今回の canon 適用は
  merge-base 上の F-0001（in_progress + review approved）で被覆する。

**次**

- 必須 skill をこの周で記録し、緑なら merge 後に再起しないことを確認する。

---

## 2026-08-14 — Feature 正本 + OPA grow 入場（ADR 0038 / F-0001）

**問い**

- 自己改善は learnings 日記 + skill 直接書き換えで、作業正本が無かった。

**効いた**

- 正本を `knowledge/features/F-NNNN-*.yaml` に置いた。GitHub Issue は正本にしない。
- reflector = 起票、grow = OPA allow の票だけ適用。F-0001 bootstrap は human + 1回限り。
- deny 空だけを見る。キー欠落は helper 完全ルール。`mutates` は diff 導出。

**失敗 / リスク（敵対レビューで確認済み → 修正済み）**

- `not (x in set)` の hoisting、bootstrap 恒久化、新規 Feature の自己承認、OPA_BIN 回避。

**既知の限界**

- `adversarial_review: approved` とレビュー成果物ハッシュの突合は未実装。

---

## 2026-08-14 — 人が読む文面を日本語に揃える

**効いた**

- ADR 見出し（状態/日付/背景/決定/結果/関連）、workflow の PR 文面、操作者向けエラー、OPA deny 文を日本語にした。
- YAML キー・コマンド・パス・状態値（proposed 等）は機械参照のため英語のまま。

**失敗 / リスク**

- deny 文を変えたので、英語文字列を固定していたテストも追従が必要。

---

## 2026-08-14 — 残っていた人が読む英語を洗い出して直す

**問い**

- 見出しと操作者向け文は日本語化済みだったが、説明文・コメント・用語に英語が残っていた。

**効いた**

- skill/agent の説明、ADR 本文、コメント、deny の「真偽値」を日本語にした。
- 機械キー・コマンド・パス・状態値・パッケージ名は英語のまま。

**失敗 / リスク**

- 用語を訳しすぎると、状態値（`skipped` 等）と説明文が食い違う。説明は日本語、値は英語で揃える。

---

## 2026-08-14 — 入場の欠落キーを閉じる

**効いた**

- `--admit` が `feature_in_merge_base` を渡さず、未定義だと出生 deny が発火しなかった。
- admit/apply は両キーを必須にした。learned / `*_test.rego` は副作用付き builtin を拒否する。
- `MERGE_SHA` は十六進だけ通す。

**失敗 / リスク**

- F-0001 の `adversarial_review: approved` 自己申告（C1）はこの PR では直さない。
  同じ票で evidence 突合を入れると今回の apply が止まる。次 Feature で直す。
- 欠落キー deny を足したあと、既存の拒否テストにキーを足さず 14 本が空振りした。
  全拒否テストにキーを明示し、policy 配下は再帰走査＋ package 正本固定にした。
- package 名の文字列判定は `grow["admission"]` と symlink で抜けた。
  `opa inspect` の解決済み名前空間と、正本 8 ファイル以外の拒否で閉じた。
- 名前空間照合をファイル名だけにすると `learned/grow.rego` へ正本を移して抜けた。
  policy 相対パスで突き合わせる。

---

## 2026-09-22 — Grok 4.7 と Opus 5.5 の世代ピン

**問い**

- Opus 5.5 が出たので検証席を替えるべきか。Grok 4.7 も同じ週に出た。

**効いた**

- 席は動かさない。親と実装と trio 体2は `grok-4.7-high`。検証と内省は `claude-opus-5-5-high`。計画とレビューは Fable 5.1 high のまま。
- 設計席（Fable）は世代ピンだけを承認した。CursorBench で Opus 5.5 が Fable より上でも、短い敵対レビューの席は分けたまま。
- Grok の CursorBench / Terminal-Bench は xHigh 対 High なので優越根拠に使わない。DeepSWE の high 同士と比較と、同価格の公式文だけを採用した。
- 非 fast の high が実在したので、0044 の「high-fast しか無い」例外は消える。fast はピンにしない。
- 親と実装の effort 既定を high にするのは方針判断であり、`packet-policy.mjs` の配列先頭を criteria と揃えないと文書だけになる。

**失敗 / リスク**

- packet を渡さない verifier 起動を「席の実起動」と書くと、チェック8（packet 必須）を破った前進可能が正本に残る。スラッグ解決の記録と、手順を満たした検証は分ける。
- 受理 ADR に後から「前進可能」を足すと、その文が先端の承認に読まれる。各 ID には対象コミットと結果を書き、後続コミットの承認ではないと書く。
- 3体レビューは証拠の書き方で閉じなかった。feature-gate と `pnpm test` は緑でも、前進可能にはしない。F-0013 は proposed のまま。

---

## 2026-09-27 — 正解は型と振る舞いの契約

**問い**

- 設計を文章にしてから実装するのと、型と振る舞いを先に書いて機械が判定するのは何が違うか。
- レビューが何度も回るのは、指摘の文章が足りないからか。

**効いた**

- 正解を契約にした。型は `tsc --noEmit` が、実装を契約の型へ代入できるかで赤にする。振る舞いは契約に書いた引数で呼び、出力か例外が一致するかで赤にする。
- `clamp` で両方を固定した。戻り値が string の実装は型で落ち、型が合っても出力が違う実装は振る舞いで落ちる。
- レビュー起動は、新しい周は 4（初回3体と再確認1回）まで。既にある周は記録済みの回数を超えて増やせない。超えると feature-gate が失敗する。
- 契約が緑の振る舞いについて、レビューは差し戻さない。差し戻せるのは型と振る舞いでは赤にならない席・正本・ゲート・秘密だけ。

**失敗 / リスク**

- 0050 の「再レビューは1回」は手順書の文だった。文が残っているかのテストは、5回目の起動を拒否しない。拒否は `review-cap` の回数比較に移した。
- F-0016 は proposed のまま。被覆は F-0001。この票は入場しない。
- 型検査は `typescript` 5.9.2 に依存する。振る舞いの実行は Node の型除去。CI は PR の workflow で `pnpm install` してから契約を見る。main の feature-gate が契約を呼ぶのは、この変更が main に入ってから。

---

## 2026-09-27 — 検証用 subagent を廃する

**問い**

- Cursor に、今のモデルへ不要な指示を洗う prompt-audit があるか。
- 契約で正解を決めたあと、確認用の subagent はまだ要るか。

**効いた**

- Cursor の公式機能には prompt-audit が無い。当たるのは Claude Code の `/claude-api prompt-audit`（anthropics/skills の `claude-api`）で、Opus 5.5 を名指しできる。
- その監査の Opus 5 節は、確認用 subagent と「もう一度確かめよ」を削除対象にする。足すと過検証になる、と書いてある。
- 必須 cycle から adversarial-review / verify / reflect を外した。新しい周のレビューは人が明示した1回、verify と reflect は 0 回。超えると feature-gate が失敗する。
- 判定は親が契約と feature-gate を実行する。3体は起動しない。

**失敗 / リスク**

- canon の入場は、これまで通り OPA が `adversarial_review: approved` を求める。毎タスクのレビューとは別で、親が自分で approved とは書かない。
- 過去の周に既にある起動回数は、その回数を超えて増やせないだけで、遡って消さない。

---

## 2026-09-27 — 指摘は4分類、直すだけを1回

**問い**

- 周が終わらないのは、指摘を全部直して差分全体を読み直すからか。
- 型が `tsc --noEmit` で緑なら、レビューは正しさを再定義できるか。

**効いた**

- 親が1回、直す・検討・記録・却下に分ける。コードを変えるのは直すだけ。そのあと noEmit が緑なら止め、二周目は開かない。
- `dispositionErrors` が、検討の適用と、緑の noEmit を不正解と呼ぶ指摘と、二周目を拒否する。

**失敗 / リスク**

- 分類そのものは親の判断。機械が見るのは、適用してよい桶が直すだけであることと、周が1回であること。

---

## 2026-09-27 — feature-gate は typescript の後に動かす

**問い**

- main に契約呼び出しが入ったあと、feature-gate の CLI が落ちるのは OPA か。

**効いた**

- 落ちるのは被覆の後。`feature-gate.mjs` が `contract-check.mjs` を呼び、`node_modules/typescript` が無いと `typescript が無い。pnpm install が必要` で exit 1 になる。
- CI のゲート段は `origin/main` の `feature-gate.mjs` を `/tmp` から実行する。PR のゲート実装だけを変えても、その段は main の呼び出しのまま。先に直るのは、PR の workflow で `pnpm install` をゲートより前に置くこと。

**失敗 / リスク**

- 契約ステップをゲートの後ろに足しただけでは、ゲート自身の呼び出しは先に走る。導入はその前。
- 導入を先にしても、Actions の ubuntu には `rg` が無い。`apt-get` で足すと取得方法が OPA と揃わない。`ensure-rg.mjs` が ripgrep 15.2.0 を tarball とバイナリの digest で `.tools/rg` に置く。PATH は見ない。
- 単体テストのファイル一覧を `package.json` と workflow に並べると、片方だけ更新される。一覧は `scripts/` 直下の `*.test.mjs`（`*.opa.test.mjs` を除く）を `run-harness-tests.mjs` が走査し、両方ともそのコマンドを呼ぶ。

---

## 2026-09-29 — 自己改善図の凡例実線は水平

**問い**

- `docs/architecture/self-improve-flow.png` の実線が、凡例の短い右矢印ではなく画面上端から斜めに降りていないか。

**効いた**

- 他の概要図の凡例（`runtime-overview.png` の y=1639 付近、x=96 から長さ 96）を正にした。斜線の芯は `(95,99,104)` で、左右の地の色で埋める。文字を横切った穴は、両側が暗色のときだけ黒でつなぐ。
- 凡例帯は runtime と同じ矩形を写すと、下向き矢印が右向き矢印になる。

**失敗 / リスク**

- 線色と字幕のグレーが近い。芯から離れた画素まで塗ると字形が欠ける。修復は予測線の近傍だけにする。

---

## 2026-10-04 — 個人開発の工場はレーンで分ける

**問い**

- 公開リポジトリの繰り返しに、このハーネスの OPA を全アプリへ掛けてよいか。

**効いた**

- 所有者の公開は 33。非公開はこのトークンから 0 件に見える。個人Webの繰り返しは Next.js App Router + npm で、CI とテストはほぼ無い。AI製品の完成形は `atrox` の pnpm + Vitest + CI。ガバナンスはこのリポジトリのまま分ける。組込み・fork・Rails にはゲートを掛けない。
- 詳細は `docs/software-factory-survey.md`。正本にはしていない。

**失敗 / リスク**

- 非公開が権限不足で見えていない可能性が残る。組織リポジトリは一覧に出ても、コミット名義が `marumo333` とは限らない。

---

## 2026-10-05 — ピン留め取得の 500 は再試行する

**問い**

- `docs/superpowers` を消した push の `opa` が落ち、同じ SHA の pull_request は通った。差分が原因か。

**効いた**

- 落ちたのはハーネス単体テスト 60。`ensure-rg` の curl が GitHub Releases の HTTP 500 で終了した。OPA と ripgrep の取得は `curlFetch` が `--retry 5 --retry-all-errors` でやり直す。digest の照合は変わらない。

**失敗 / リスク**

- 再試行しても 5 回とも失敗すればジョブは落ちる。リリース資産そのものが変わった場合は digest 不一致のまま拒否する。

---

## 2026-10-12 — 常時席とクラウドの並列実行は別の面

**問い**

- 親が一人であることは、クラウド上で機能ごとに分解し、数十体の実行を一覧で見ることとずれているか。

**効いた**

- ずれは、実行と制御を一つの席表に入れたときに起きる。機能分解と実行の一覧は Cursor のクラウドに置く。このリポジトリは席の許可とゲートであり、一覧の HTML は描かない。
- 生きている席のスラッグは `cycle/model-routing.yaml` と skill に残す。ゲートが見るのは族名と件数と effort の幅である。起動しない verifier と reflector の `model:` は外した。参照の無い `sonnet_pin` も外した。
- 役割を分けることと席を増やすことは同じ結果にならない。MetaGPT は役割と SOP（arXiv:2308.00352）、Agentless は固定した三段階（arXiv:2407.01489）、MAST は多体の失敗 14 様式（arXiv:2503.13657）。詳細は `docs/multi-agent-and-pins.md`。

**失敗 / リスク**

- `dispatch_seats` の `verify: opus` と `muse` は残した。記録してよい族の削除は、世代のピンとは別の変更である。
- この PR の CI は、まだ main の旧 `feature-gate.mjs` を実行する。子を隣から呼ぶ形は、そのスクリプトが main に入ったあとから効く。

---

## 2026-10-12 — ハーネス学習は保持規則だけを入れる

**問い**

- arXiv:2609.35738 の harness learning を入れるべきか。近い仕組みは既にあるか。

**効いた**

- 論文は、凍結した solver に対し proposer が実行結果でハーネスを書き換え、その点数を報酬に学習する。テスト時は重みを更新しない。Reasoning Gym では開発点数が親を上回るときだけ残す。評価問は採点から外す。
- 既存は `docs/learnings.md`、feature-gate の合否、空の `policy/learned/`、`harness-audit`、`observation-fold`、cycle の3指標である。候補と親の平均点数を比べて残す規則は無かった。
- 入れたのはその保持規則だけである。`scripts/lib/revision-select.mjs`。妥当性は報告に残し、保持には使わない。下回る候補は残さない。`cycle/revision.json` があるときだけ feature-gate が同じ判定をする。
- 入れなかったのは proposer の重み学習、新しい席、下回っても最高点を採用する手順、緑のテスト通過率を改善点数にすること。

**失敗 / リスク**

- 点数は呼び出し側が渡す。記録が無い commit は止まらない。偽の点数は集合の分離と、記録した保持が計算と一致することまでしか止められない。
- 指摘は1回。`--file` が無いときの未捕捉例外は直した。同点の浮動小数と、親と候補が同じ id の場合は検討のまま。feature-gate の例外ラップは contract-check と同じなので却下した。

---

## 2026-10-14 — 採点改訂は外し、レビュー観点は1回にまとめる

**問い**

- 近い仕組みがあるなら、採点による保持規則は不要か。
- PR とセキュリティレビューを、セキュリティ、ユースケース、設計の3エージェントにすべきか。

**効いた**

- 採点改訂は外した。feature-gate、契約、4分類が既に入場を見ていて、呼び出し側の点数には採点器が無かった。
- 3エージェントにはしない。CR-Bench（arXiv:2603.11078）は Reflexion で再現率が上がり信号対雑音比が落ちる。Adversarial Review（arXiv:2608.18167）はレビューと批判の3体が5体より良いが、トークンは zero-shot より多く、易しい差分では浪費になる。同じ差分を専門家5人が読み直すと入力を5回払う（Main Branch, 2026）。Librarian（arXiv:2605.27787）は共有要約でその重複を減らす。こちらは packet と code-mode と observation-fold が既にその役である。
- セキュリティ、振る舞い、設計は、親の1回と、人が明示した Fable 1回の同じ読みに含める。観点ごとに席は増やさない。review-cap は変えない。

**失敗 / リスク**

- 観点を手順に書いても、親が読まなければ取りこぼす。取りこぼしを席で埋めると、前に測った雑音とトークンが戻る。
- Qodo や CodeRabbit の専門エージェントは再現率を上げると自社が書く。独立した信号対雑音比は、この変更の根拠にしていない。

---

## 2026-10-14 — 人が頼まない品質はゲートであり、追加席ではない

**問い**

- 人が明示しないとレビューが起動しないと、品質とトークン効率を両立した工場にならないか。

**効いた**

- 人が待つのは追加の Fable 席と、main へのマージである。feature-gate と契約は pre-commit と CI が、頼まれなくても走る。親の3観点も、実装のあとに頼まれなくても行う、と手順へ書いた。
- 追加席を毎変更で起動すると、同じ差分の再読が工場の定常費になる。CR-Bench ではその再読が信号対雑音比を落とす。トークンを減らす工場は、モデルを足す前に決定的なゲートを毎回通す。

**失敗 / リスク**

- 手順は親が読んだときだけ効く。読まない親を、席の自動起動では直せない。直せるのは commit が落とすゲートである。

---

## 2026-10-14 — 製品スラッグはホストのカタログであり、契約ではない

**問い**

- Cursor 以外のクラウドでも同じハーネスを使うなら、モデル指定は無くすか。

**効いた**

- 生きた契約から製品スラッグを外した。実行はホストの既定。どの agent の frontmatter にも `model:` は置かない。実装スライスにモデル ID を書くと `parallel-slices` が拒否する。
- 残したのは役割、件数、effort、そして packet の席トークン（`grok` / `fable` / `opus` / `muse`）である。席トークンは入場語彙であり、ホストのモデル ID ではない。歴史の ADR は書き換えていない。

**失敗 / リスク**

- 席トークンの名前は、まだ特定の製品族に見える。ゲートの検査語彙を一度に捨てると、件数と effort の拒否まで巻き込む。今回は製品スラッグだけを外した。

---

## 2026-10-14 — hook はホストを聞かない

**問い**

- 最初の clone で、hook が Codex か Claude か Cursor かを聞いて割り当てるか。

**効いた**

- 聞かない。git hook は commit で走り、`hooksPath` は `pnpm install` が書く。その install は CI でも走る。Cursor の hook は、ホストが Cursor のときだけ動く。聞ける時点ではホストは決まっている。
- 各ホストは自分の入口を読む。共有のゲートは `host-default` のまま。ホスト名を yaml に書いてモデル ID を割り当てない。

**失敗 / リスク**

- 入口のファイルが無いホストは、共有の `AGENTS.md` と feature-gate だけを見る。それで足りる。質問を足すと、答えられない環境が止まる。

---

## 2026-10-14 — Cursor、Claude Code、Codex は同じ契約を読む

**問い**

- Cursor だけでなく、Codex と Claude にも対応するか。

**効いた**

- 質問は足さない。Claude Code は `CLAUDE.md` と `.claude/settings.json`、Codex は `AGENTS.md` と `.codex/hooks.json`、Cursor は `.cursor/hooks.json` を読む。正本は `.claude/AGENTS.md`。モデル ID は指定しない。
- Bash の秘密、照会の連鎖、commit ガードは同じスクリプトを呼ぶ。Claude と Codex の拒否は exit 2。Cursor の拒否は JSON のまま。Codex のスキルは `.agents/skills` から `.claude/skills` を見る。

**失敗 / リスク**

- Codex の `apply_patch` は `tool_input.command` で届く。秘密の書き込みフックは file path が無いと呼んでも素通りする。commit の git hook が実 `.env` を止める。

---

## 2026-10-14 — Claude の指示ファイルは AGENTS.md だけで足りる

**問い**

- Claude Code は `AGENTS.md` に対応している。別の `CLAUDE.md` は要るか。

**効いた**

- 要らない。Claude Code 2.1.277 以降の既定は、経路上に `CLAUDE.md` が無いとき `AGENTS.md` と `.claude/AGENTS.md` を読む。`CLAUDE.md` があるとそちらだけを読み、`AGENTS.md` は無視される。置いた `CLAUDE.md` は外した。
- `.claude/settings.json` の hook は指示ファイルではない。残す。Codex の `.codex/hooks.json` と `.agents/skills` も残す。

**失敗 / リスク**

- 利用者が `claude-md-and-agents-md` にしていない既定では、`CLAUDE.md` を戻すと共有契約が再び隠れる。個人の `~/.claude/CLAUDE.md` はリポジトリの `AGENTS.md` を消さない。

---

## 2026-10-14 — clone 後にプロバイダとモデルは選ばせない

**問い**

- Claude、Cursor、Codex で clone したあと、hook が初期化してプロバイダとモデルを選ばせるか。

**効いた**

- 選ばせない。as-is にも選択画面は無い。as-is は契約が製品スラッグを名指し、動く入口は `.cursor/hooks.json` だけだった。to-be は名指しをやめ、開いているアプリの既定に任せる。`pnpm install` が書くのは git の commit hook だけである。図は `docs/architecture/host-entry-as-is-to-be.mmd`。

**失敗 / リスク**

- アプリ自身の設定画面がモデルを聞くことはある。このリポジトリの hook は、その答えを yaml に書かない。

---

## 2026-10-14 — 選択は手元の一度だけ

**問い**

- clone のあと、プロバイダとモデルを選べた方が開発者に分かりやすいか。

**効いた**

- 手元の端末で `pnpm install` したときだけ、`scripts/setup-host.mjs` が一度聞く。空欄のモデルはホストの既定。Claude は `.claude/settings.local.json`、Codex は手元の `.codex/config.toml` に書く。Cursor のモデルはアプリのモデル選択が使う。
- CI と commit hook は質問しない。答えは共有の yaml には書かない。二度目は聞かない。

**失敗 / リスク**

- Codex の `.codex/config.toml` が既にあるときは上書きしない。そのファイルは gitignore なので、共有の Codex 設定を後からコミットする場所にはしない。

---

## 2026-10-14 — アーキテクチャ図は自己改善図の見た目に揃える

**問い**

- README の図のうち、自己改善図だけ白箱と流れる破線で、他は Mermaid 既定の紫と黄の静止画になっていないか。

**効いた**

- 箱は白、枠は `#26263d`、影は右下の `#f0f0f0`。集団の塗りは白で、枠だけ濃い。破線（`-.->`）は 8 フレームで矢印の先へ流す。実線は実行のまま動かさない。監査図に破線は無いので 1 フレーム。
- `self-improve-flow.gif` は参照として描き直していない。見切れ対策の折り返し幅はそのまま。

**失敗 / リスク**

- 破線の動きは mmd の theme だけでは再現しない。再描画には mermaid-cli と Chrome が要る。入口図の「変更」矢印がサブグラフ名に重なるのは、揃える前から同じ位置にある。

---

## 2026-10-14 — クラウド前提では install がモデルを聞かない

**問い**

- 開発の完了はクラウドまたは Actions である。手元の TTY だけでプロバイダとモデルを聞く `prepare` を残すか。

**効いた**

- 残さない。クラウドのインストールは標準入力が TTY ではないので、質問は届かず、手元とクラウドで入口が分かれる。`pnpm install` が書くのは git の `hooksPath` だけである。`scripts/setup-host.mjs` は外した。実行モデルはホストの既定。共有の yaml には書かない。

**失敗 / リスク**

- アプリ自身の設定画面がモデルを聞くことはある。このリポジトリの hook はその画面を起動しない。

---

## 2026-10-14 — クラウド起動の初期化は図に出す

**問い**

- git clone のあと、クラウド環境の起動時に初期化しているか。図はそれを示し、README で読める大きさか。

**効いた**

- ビルドの記録は clone までで、`pnpm install` は走っていなかった。`.cursor/environment.json` の install が、clone のあと `pnpm install --frozen-lockfile` で初期化する。質問はしない。
- 入口図は as-is と to-be を横に並べ、to-be はクラウド起動 → git clone → 起動時に初期化にした。四図とも幅 920、高さ 800 以内。破線は 8 フレーム。

**失敗 / リスク**

- リポジトリの `environment.json` は、個人環境の設定より先に読まれる。次のビルドから install が走る。起動のたびには入れ直さない。

---

## 2026-10-14 — 初期化は蓄積を空の周に戻す

**問い**

- クラウド起動の初期化は、`events.jsonl` などの蓄積を消すことか。`cycle/` と `docs/` を空の周に戻すべきか。docs が多すぎて、プロダクトごとのクラウド環境にできないか。

**効いた**

- 依存の `pnpm install` は初期化ではない。`node scripts/init.mjs --product` が、プロダクトの remote で `cycle/` と `docs/` を空の周に戻す。`events.jsonl` は空の `C-0001`、packet と日記と調査と図は落ちる。正本の yaml と `docs/decisions/` と席の説明は残る。二度目は空のまま。
- このテンプレートの remote（`marumo333/marumo333-cloud`）では消さない。

**失敗 / リスク**

- 決定の文書はゲートが引用するので残す。プロダクトの作業ログではないが、ツリーには残る。

---

## 2026-10-16 — 用語は docs/GLOSSARY.md に置く

**問い**

- ユビキタス言語が無いと、エージェントが名前を新しく作る。用語集は `docs/` に要るか。プロダクトの初期化が `docs/` を空の周に戻すとき、用語集も消えるか。

**効いた**

- 用語は `docs/GLOSSARY.md` だけに書く。ここに無い名前は作らない。プロダクトの `node scripts/init.mjs` は無いときだけこのファイルを作る。`--product` は無いときだけ空の見出しを作り、ある用語は残す。二度目は上書きしない。
- 親の3観点（秘密、振る舞い、置き場）で直す指摘は無かった。

**失敗 / リスク**

- プロダクトがテンプレートの用語を引き継いだままにすると、プロダクトの名前が席や正本のまま残る。足す用語はこのファイルに足す。空の見出しは、ファイルが無いときだけ書く。
