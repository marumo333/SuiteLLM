# nanoquant-glm

## 実装

- [x] 振る舞いを requirements.md に書く
- [x] nanoquant-glm.test.mjs の失敗を、格納量の判定テストに置き換える
- [x] テストが通るまで見積もりを実装する
- [x] 4096×2048 を bitsPerWeightMilli 550 で見るとランク 704、格納ビット 4423680 になることをテストする
- [x] 復元が非有限、またはノルムが 0 のときは再構成誤差を記録しないことをテストする
- [x] 層 3 エキスパート 0 の down_proj を `dealignai/GLM-5.3-Flash-UNCENSORED-FP8` から復元し、校正なしの ADMM で `features/nanoquant-glm/one-matrix.json` を書く。親とゲートはランク、格納ビット、有限性、solverCommit、seed、device を見る。誤差の大小は合否にしない
- [ ] シャードを消す前に、親で lm-evaluation-harness の `wikitext` 全文と複数選択 5 タスクを `limit` 4 で測り、`features/nanoquant-glm/parent-benchmark.json` を書く。`mmlu` の `n` は 228、他の 4 タスクの `n` は 4
- [ ] 校正 128×2048 の対角を層ごとに取り、層単位で誤差を吸収してからテンソルごとにパックする。完成ファイルがあるテンソルは飛ばす
- [ ] 同じタスクと `limit` 4 でパックを測り、`features/nanoquant-glm/harness.json` に `word_perplexity` の `ratio` と正答率を書く
- [ ] `ratio` が 3 を超えるか、件数 30 以上の正答率が標準誤差の 2 倍を超えて落ちたときは、許された変更を 1 つだけ適用して同じ入力で測り直す。3 回で止め、`features/nanoquant-glm/quality.json` に残す。この `limit` で件数 30 以上になる複数選択は `mmlu` だけである
- [ ] 4060 が見えている状態で `binary_kernels` を `sm_89` だけに作り、`wikitext` の先頭文書で prefill と decode の対数尤度の差を `features/nanoquant-glm/kernel-check.json` に書く
- [x] エキスパートの行列を bitsPerWeightMilli 1043 で見るとランク 1408、格納ビット 8749056 になり、1408 が 128 の倍数で `Q1_0` の 1 ブロックが 18 バイトになることをテストする
- [ ] 本番のパック（`pack-e1408`）を層 44 と出力層まで終え、モデル全体の測りで全層を通した perplexity の比を読む
- [ ] .nq と親のシャードから GGUF へ変換する。U と V は `Q1_0`（符号は反転、s1 は U のブロックのスケール）、s2 は別のテンソル。エキスパート以外を BF16 にするか 8 bit の型にするかを決める
- [ ] llama.cpp に U、V、s2 の読み込み、2 回の積への置き換え、エキスパートのキャッシュの拡張を足し、ビルドする。改造した版の置き場所を決める
- [ ] `wikitext` の先頭文書で、llama.cpp の prefill と decode の対数尤度を PyTorch の因子積と比べ、`features/nanoquant-glm/kernel-check.json` に書く
- [ ] 照合の差が 0.01 以下のとき、人の確認のあと、GGUF、変換の手順、改造した llama.cpp の版、モデルカードを `marumo333/GLM-5.3-Flash-UNCENSORED-NanoQuant` に上げる

## 設計

- [x] 親チェックポイントを、ガードレールを外した `dealignai/GLM-5.3-Flash-UNCENSORED-FP8` に決める。元の `zai-org/GLM-5.3-Flash` は使わない
- [x] パックの公開先は `marumo333/GLM-5.3-Flash-UNCENSORED-NanoQuant`。アカウントが無いときは上げる前に作る
- [x] 分解する重みを、層 0–44 と埋め込みと lm_head の、両辺 32 以上の 2 次元に固定する。各行列は自分の重みだけを分解する
- [x] 分解する重みの bitsPerWeightMilli を、`.mlp.experts.` は 550、それ以外は 800 に決める
- [x] 索引から、分解する重みの格納バイトと残すテンソルのバイトを足し、予約 4GiB 込みで 32GiB を超えるときはパックを作らない
- [x] パックはテンソル 1 ファイル、再開は層にする。未完成ファイルは捨てる
- [x] 校正は WikiText-2 train の 128×2048 を、隠れ状態 2GiB とエキスパート 32 体の FP32 で層ごとに流す
- [x] 誤差の吸収は論文の学習率 1e-4、バッチ 4、8 エポックで、まだ分解していない重みだけを更新する
- [x] 量子化後は lm-evaluation-harness の `wikitext` と複数選択 5 タスクで親とパックを比べる。生成とエージェントの公式表はこの機械では測らない
- [x] VRAM に常時載せるのはエキスパート以外の因子と残すテンソルで、空きに直近のエキスパートを置く
- [x] 品質が悪いとき変えてよいのは γ、エキスパートのビット、校正本数の 1 つで、3 回で止める
- [x] 複数選択の `limit` は 4。`mmlu` の `n` は 228。他の 4 タスクの `n` は 4 で、やり直しの条件には入らない
- [x] デスクトップの推論は NanoQuant `a9e0a430` の `binary_kernels` を、4060 が見えているとき `sm_89` だけで作る。prefill は `gemm`、decode は `gemv`
- [x] 実行は Python 3.12、torch 2.6.0 の CUDA 12.4、transformers 5.16.1、datasets 4.0.0
- [x] 本番のパックはエキスパートだけをランク 1408（1043）で分解し、エキスパート以外は親の型のまま残す。校正は 64 本
- [x] 推論と公開は、パックのあとで llama.cpp の形（GGUF）へ変換する。パックは作り直さない
