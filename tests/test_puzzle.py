import random

from core.heuristics import h1, h2
from core.puzzle import GOAL, is_solvable, is_valid, neighbors


def random_solvable(rng):
    while True:
        s = tuple(rng.sample(range(9), 9))
        if is_solvable(s):
            return s


def test_neighbors_corner():
    # blank at bottom-right
    assert dict(neighbors(GOAL)) == {
        "U": (1, 2, 3, 4, 5, 0, 7, 8, 6),
        "L": (1, 2, 3, 4, 5, 6, 7, 0, 8),
    }


def test_neighbors_edge():
    s = (1, 0, 2, 3, 4, 5, 6, 7, 8)
    assert dict(neighbors(s)) == {
        "D": (1, 4, 2, 3, 0, 5, 6, 7, 8),
        "L": (0, 1, 2, 3, 4, 5, 6, 7, 8),
        "R": (1, 2, 0, 3, 4, 5, 6, 7, 8),
    }


def test_neighbors_center():
    s = (1, 2, 3, 4, 0, 5, 6, 7, 8)
    assert dict(neighbors(s)) == {
        "U": (1, 0, 3, 4, 2, 5, 6, 7, 8),
        "D": (1, 2, 3, 4, 7, 5, 6, 0, 8),
        "L": (1, 2, 3, 0, 4, 5, 6, 7, 8),
        "R": (1, 2, 3, 4, 5, 0, 6, 7, 8),
    }


def test_solvability():
    assert is_solvable(GOAL)
    assert not is_solvable((2, 1, 3, 4, 5, 6, 7, 8, 0))


def test_is_valid():
    assert is_valid(GOAL)
    assert not is_valid((1, 1, 3, 4, 5, 6, 7, 8, 0))
    assert not is_valid((1, 2, 3))
    assert not is_valid((1, 2, 3, 4, 5, 6, 7, 8, 9))


def test_heuristics_zero_at_goal():
    assert h1(GOAL) == h2(GOAL) == 0


def test_heuristics_ignore_blank():
    s = (1, 2, 3, 4, 5, 6, 7, 0, 8)  # one move from goal
    assert h1(s) == 1 and h2(s) == 1


def test_h2_dominates_h1():
    rng = random.Random(0)
    for _ in range(1000):
        s = random_solvable(rng)
        assert h2(s) >= h1(s)
