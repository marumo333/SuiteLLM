# nanoquant-glm

## 実装

- [x] 振る舞いを requirements.md に書く
- [x] nanoquant-glm.test.mjs の失敗を、格納量の判定テストに置き換える
- [x] テストが通るまで見積もりを実装する
- [ ] 4096×2048 を bitsPerWeightMilli 550 で見るとランク 704、格納ビット 4423680 になることをテストする
- [ ] 復元が非有限、またはノルムが 0 のときは再構成誤差を記録しないことをテストする
- [ ] 層 3 エキスパート 0 の down_proj を `dealignai/GLM-5.3-Flash-UNCENSORED-FP8` から復元し、校正なしの ADMM で `features/nanoquant-glm/one-matrix.json` を書く。親とゲートはランク、格納ビット、有限性、solverCommit、seed、device を見る。誤差の大小は合否にしない
- [ ] シャードを消す前に、親で lm-evaluation-harness の `wikitext` 全文と複数選択 5 タスクを測り、`features/nanoquant-glm/parent-benchmark.json` を書く
- [ ] 校正 128×2048 の対角を層ごとに取り、層単位で誤差を吸収してからテンソルごとにパックする。完成ファイルがあるテンソルは飛ばす
- [ ] 同じタスクと同じ `limit` でパックを測り、`features/nanoquant-glm/harness.json` に `word_perplexity` の `ratio` と正答率を書く
- [ ] `ratio` が 3 を超えるか、件数 30 以上の正答率が標準誤差の 2 倍を超えて落ちたときは、許された変更を 1 つだけ適用して同じ入力で測り直す。3 回で止め、`features/nanoquant-glm/quality.json` に残す

## 設計

- [x] 親チェックポイントを `dealignai/GLM-5.3-Flash-UNCENSORED-FP8` に決める。元の `zai-org/GLM-5.3-Flash` は使わない
- [x] 分解する重みを、層 0–44 と埋め込みと lm_head の、両辺 32 以上の 2 次元に固定する。各行列は自分の重みだけを分解する
- [x] 分解する重みの bitsPerWeightMilli を、`.mlp.experts.` は 550、それ以外は 800 に決める
- [x] 索引から、分解する重みの格納バイトと残すテンソルのバイトを足し、予約 4GiB 込みで 32GiB を超えるときはパックを作らない
- [x] パックはテンソル 1 ファイル、再開は層にする。未完成ファイルは捨てる
- [x] 校正は WikiText-2 train の 128×2048 を、隠れ状態 2GiB とエキスパート 32 体の FP32 で層ごとに流す
- [x] 誤差の吸収は論文の学習率 1e-4、バッチ 4、8 エポックで、まだ分解していない重みだけを更新する
- [x] 量子化後は lm-evaluation-harness の `wikitext` と複数選択 5 タスクで親とパックを比べる。生成とエージェントの公式表はこの機械では測らない
- [x] VRAM に常時載せるのはエキスパート以外の因子と残すテンソルで、空きに直近のエキスパートを置く
- [x] 品質が悪いとき変えてよいのは γ、エキスパートのビット、校正本数の 1 つで、3 回で止める
