"""層 3 エキスパート 0 の down_proj を、固定コミットのソルバで 1 枚だけ測る。

ソルバのソースはこのリポジトリへコピーしない。NANOQUANT_SRC は
SamsungLabs/NanoQuant のコミット a9e0a430 の src/nanoquant/core/admm_nq.py を指す。
"""
import importlib.util
import json
import os
import subprocess
import sys

import numpy as np
import torch

ROWS = 4096
COLS = 2048
RANK = 704
COMMIT = "a9e0a430881ff80d83b622c3129e330dc33c04f5"


def load_solver(path):
    spec = importlib.util.spec_from_file_location("admm_nq", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("ソルバを読めない")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.factorize_admm_nanoquant


def main():
    if len(sys.argv) != 4:
        print("使い方: measure-one.py restored.f32 admm_nq.py one-matrix.json", file=sys.stderr)
        return 1
    matrix_path, solver_path, out_path = sys.argv[1:]
    if not torch.cuda.is_available():
        print("GPU が無いので記録しない", file=sys.stderr)
        return 1
    raw = np.fromfile(matrix_path, dtype=np.float32)
    if raw.size != ROWS * COLS or not np.isfinite(raw).all() or float(np.linalg.norm(raw)) == 0.0:
        print("復元が非有限、またはノルムが 0", file=sys.stderr)
        return 1
    device = torch.cuda.get_device_name(0)
    weight = torch.from_numpy(raw.reshape(ROWS, COLS)).to(device="cuda", dtype=torch.float32)
    torch.manual_seed(0)
    torch.cuda.manual_seed_all(0)
    head = subprocess.run(
        ["git", "-C", os.path.dirname(solver_path), "rev-parse", "HEAD"],
        check=False,
        capture_output=True,
        text=True,
    )
    if head.returncode != 0 or head.stdout.strip() != COMMIT:
        print("ソルバのコミットが固定値と違う", file=sys.stderr)
        return 1
    solve = load_solver(solver_path)
    solved = solve(
        weight,
        torch.ones(COLS, device=weight.device, dtype=weight.dtype),
        torch.ones(ROWS, device=weight.device, dtype=weight.dtype),
        RANK,
        outer_iters=400,
        inner_iters=5,
        reg=0.03,
        rho_scheduler="linear",
        print_admm_steps=True,
    )
    factors_a = solved["A"].transpose(0, 1)
    factors_b = solved["B"]
    signs_u = torch.sign(factors_a)
    signs_v = torch.sign(factors_b)
    signs_u = torch.where(signs_u == 0, torch.ones_like(signs_u), signs_u)
    signs_v = torch.where(signs_v == 0, torch.ones_like(signs_v), signs_v)
    scale_out = factors_a.abs().mean(dim=1)
    scale_in = factors_b.abs().mean(dim=0)
    binary = scale_out[:, None] * (signs_u @ signs_v) * scale_in[None, :]
    norm = torch.linalg.norm(weight)
    relative = (torch.linalg.norm(weight - binary) / norm).item()
    continuous = (torch.linalg.norm(weight - solved["W_final"]) / norm).item()
    repo = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    record = subprocess.run(
        [
            "node",
            os.path.join(repo, "features", "nanoquant-glm", "rank.mjs"),
            "--record",
            "--matrix",
            matrix_path,
            "--rows",
            str(ROWS),
            "--cols",
            str(COLS),
            "--relative",
            str(relative),
            "--continuous",
            str(continuous),
            "--device",
            device,
            "--out",
            out_path,
        ],
        check=False,
        cwd=repo,
    )
    print(json.dumps({"relativeError": relative, "continuousRelativeError": continuous, "device": device, "solverCommit": COMMIT}))
    return record.returncode


if __name__ == "__main__":
    raise SystemExit(main())
