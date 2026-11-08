# nanoquant-glm

WHEN GLM-5.3-Flash の 321323031390 パラメータを実効 0.55 bit で見積もる
THE SYSTEM SHALL 重みを 22090958409 バイトとし、4GiB の予約を足しても 32GiB の RAM に収まり、8GiB の VRAM には収まらないと判定する

WHEN 同じパラメータ数を実効 0.80 bit で見積もる
THE SYSTEM SHALL 重みを 32132303139 バイトとし、4GiB の予約を足すと 32GiB の RAM に収まらないと判定する

WHEN Llama-2-70B の NanoQuant 本文値（137.95 GB から 5.75 GB）の圧縮率を GLM-5.3-Flash の BF16 641.64 GB に掛ける
THE SYSTEM SHALL 26744690105 バイトになり、4GiB の予約を足しても 32GiB の RAM に収まり、8GiB の VRAM には収まらないと判定する

WHEN 4096 行 2048 列を bitsPerWeightMilli 550 でランクにする
THE SYSTEM SHALL ランクを 704、格納ビットを 4423680 とする

WHEN 復元した重みが非有限である、またはフロベニウスノルムが 0 である
THE SYSTEM SHALL 再構成誤差を記録しない
