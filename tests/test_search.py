import random
from statistics import mean

from core.astar import astar
from core.branching import effective_branching
from core.heuristics import HEURISTICS, h0
from core.puzzle import GOAL, neighbors


def random_walk(rng, steps):
    s, prev = GOAL, None
    for _ in range(steps):
        options = [t for _, t in neighbors(s) if t != prev]
        prev, s = s, rng.choice(options)
    return s


def instances(n=15, steps=20, seed=1):
    rng = random.Random(seed)
    return [random_walk(rng, steps) for _ in range(n)]


def test_solved_start():
    r = astar(GOAL, h0)
    assert r.path == [GOAL] and r.moves == [] and r.metrics["cost"] == 0
    assert r.metrics["expanded"] == 1


def test_same_cost_and_valid_paths():
    for s in instances():
        costs = set()
        for h in HEURISTICS.values():
            r = astar(s, h)
            assert r.path[0] == s and r.path[-1] == GOAL
            assert len(r.path) == len(r.moves) + 1 == r.metrics["cost"] + 1
            for a, m, b in zip(r.path, r.moves, r.path[1:]):
                assert (m, b) in neighbors(a)
            costs.add(r.metrics["cost"])
        assert len(costs) == 1


def test_admissible():
    for s in instances():
        cost = astar(s, h0).metrics["cost"]
        for h in HEURISTICS.values():
            assert h(s) <= cost


def test_expanded_order_on_average():
    deep = [s for s in instances(n=40, steps=30, seed=2) if astar(s, HEURISTICS["h2"]).metrics["cost"] >= 8]
    assert len(deep) >= 10
    avg = {k: mean(astar(s, h).metrics["expanded"] for s in deep) for k, h in HEURISTICS.items()}
    assert avg["h2"] <= avg["h1"] <= avg["h0"]


def test_metrics_keys():
    r = astar(instances(1)[0], HEURISTICS["h2"])
    assert set(r.metrics) == {"expanded", "generated", "max_frontier", "time_ms", "cost"}


def test_effective_branching():
    assert abs(effective_branching(2, 1) - 2) < 1e-6   # N+1 = 1 + b
    assert abs(effective_branching(6, 2) - 2) < 1e-6   # 7 = 1 + 2 + 4
    assert abs(effective_branching(2, 2) - 1) < 1e-6   # 3 = 1 + 1 + 1
    assert effective_branching(10, 0) is None
