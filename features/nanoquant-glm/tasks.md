# nanoquant-glm

- [x] 振る舞いを requirements.md に書く
- [x] nanoquant-glm.test.mjs の失敗を、格納量の判定テストに置き換える
- [x] テストが通るまで見積もりを実装する
- [ ] 4096×2048 を bitsPerWeightMilli 550 で見るとランク 704、格納ビット 4423680 になることをテストする
- [ ] 復元が非有限、またはノルムが 0 のときは再構成誤差を記録しないことをテストする
- [ ] 層 3 エキスパート 0 の down_proj を FP8 から復元し、校正なしの ADMM で再構成誤差をデスクトップの `.tools/nanoquant-glm/one-matrix.json` に書く。実測値はゲートに入れない
- [ ] 全層を流してパックしたチェックポイントを書く
- [ ] パックした重みで perplexity を測り、Llama-2-70B の 3.32 から 7.61（0.80 bit）に相当する落ち方かを記録する
