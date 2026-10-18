"""Offline batch experiment: instances bucketed by optimal depth, A* with h0/h1/h2.

python -m experiment.run [--per-bucket 100] [--h0-per-bucket 100] [--seed 0]
Writes results/experiment.json and results/experiment.csv.
"""

import argparse
import csv
import json
import random
from pathlib import Path
from statistics import mean

from core.astar import astar
from core.branching import effective_branching
from core.heuristics import HEURISTICS, h2
from core.puzzle import GOAL, is_solvable, neighbors

DEPTHS = list(range(2, 25, 2))
SHALLOW_MAX = 14  # up to here random walks reach the bucket easily; deeper uses random permutations
METRICS = ["expanded", "generated", "max_frontier", "time_ms", "bstar"]
OUT = Path(__file__).resolve().parent.parent / "results"


def random_walk(rng, steps):
    """Walk randomly from GOAL without undoing the previous move.

    Args:
        rng: random.Random instance (seeded for reproducibility).
        steps: Number of moves.

    Returns:
        A solvable state at most steps moves from GOAL.
    """
    s, prev = GOAL, None
    for _ in range(steps):
        options = [t for _, t in neighbors(s) if t != prev]
        prev, s = s, rng.choice(options)
    return s


def random_solvable(rng):
    """Draw random permutations until one is solvable.

    Args:
        rng: random.Random instance.

    Returns:
        A uniformly random solvable state.
    """
    while True:
        s = tuple(rng.sample(range(9), 9))
        if is_solvable(s):
            return s


def generate(rng, per_bucket, attempts_per_bucket):
    """Build instance buckets keyed by optimal depth.

    Shallow buckets (d <= SHALLOW_MAX) are fed by random walks, deeper ones
    by random permutations. Depth is measured with A* + h2; every candidate
    goes to the bucket of its real depth, whichever bucket is being filled.

    Args:
        rng: random.Random instance.
        per_bucket: Target instances per depth.
        attempts_per_bucket: Candidate cap per target depth.

    Returns:
        Dict depth -> list of distinct states. Buckets may be short when the
        state space has fewer states at that depth (d = 2, 4, 6).
    """
    buckets = {d: [] for d in DEPTHS}
    seen = set()
    for d in DEPTHS:
        for _ in range(attempts_per_bucket):
            if len(buckets[d]) >= per_bucket:
                break
            s = random_walk(rng, rng.randint(d, 2 * d)) if d <= SHALLOW_MAX else random_solvable(rng)
            if s in seen:
                continue
            seen.add(s)
            depth = astar(s, h2).metrics["cost"]
            if depth in buckets and len(buckets[depth]) < per_bucket:
                buckets[depth].append(s)
    return buckets


def run(per_bucket, h0_per_bucket, seed, attempts_per_bucket):
    """Generate instances and run A* with every heuristic on them.

    Args:
        per_bucket: Target instances per depth.
        h0_per_bucket: Cap for h0 per depth (h0 is the slow one).
        seed: RNG seed.
        attempts_per_bucket: Candidate cap per target depth.

    Returns:
        Dict with "meta" (parameters) and "rows" (one per depth, each metric
        averaged per heuristic).

    Raises:
        AssertionError: If any heuristic returns a cost different from the
            bucket depth.
    """
    rng = random.Random(seed)
    buckets = generate(rng, per_bucket, attempts_per_bucket)
    rows = []
    for d, states in buckets.items():
        row = {"d": d, "n": {}}
        for m in METRICS:
            row[m] = {}
        for name, h in HEURISTICS.items():
            sample = states[:h0_per_bucket] if name == "h0" else states
            runs = []
            for s in sample:
                met = astar(s, h).metrics
                assert met["cost"] == d
                met["bstar"] = effective_branching(met["generated"], d)
                runs.append(met)
            row["n"][name] = len(runs)
            for m in METRICS:
                row[m][name] = mean(r[m] for r in runs) if runs else None
        rows.append(row)
        print(f"d={d:2} n={row['n']} expanded={ {k: round(v) for k, v in row['expanded'].items() if v is not None} }", flush=True)
    meta = {
        "seed": seed,
        "per_bucket_target": per_bucket,
        "h0_per_bucket": h0_per_bucket,
        "attempts_per_bucket": attempts_per_bucket,
        "note": "values are per-bucket means; bstar uses N = generated (AIMA); time_ms is not reproducible",
    }
    return {"meta": meta, "rows": rows}


def write(result):
    """Write results/experiment.json and results/experiment.csv.

    Args:
        result: Output of run().
    """
    OUT.mkdir(exist_ok=True)
    (OUT / "experiment.json").write_text(json.dumps(result, indent=1))
    with open(OUT / "experiment.csv", "w", newline="") as f:
        w = csv.writer(f)
        names = list(HEURISTICS)
        w.writerow(["d"] + [f"n_{h}" for h in names] + [f"{m}_{h}" for m in METRICS for h in names])
        for r in result["rows"]:
            w.writerow([r["d"]] + [r["n"][h] for h in names] + [r[m][h] for m in METRICS for h in names])


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--per-bucket", type=int, default=100)
    p.add_argument("--h0-per-bucket", type=int, default=100)
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--attempts-per-bucket", type=int, default=20000)
    a = p.parse_args()
    write(run(a.per_bucket, a.h0_per_bucket, a.seed, a.attempts_per_bucket))
