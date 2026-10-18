"""Heuristics for the 8-puzzle. h1 and h2 skip the blank, otherwise inadmissible."""

from core.puzzle import GOAL

_TARGET = {tile: divmod(i, 3) for i, tile in enumerate(GOAL)}


def h0(s):
    return 0


def h1(s):
    """Misplaced tiles."""
    return sum(1 for x, g in zip(s, GOAL) if x and x != g)


def h2(s):
    """Sum of Manhattan distances."""
    total = 0
    for i, x in enumerate(s):
        if x:
            r, c = divmod(i, 3)
            tr, tc = _TARGET[x]
            total += abs(r - tr) + abs(c - tc)
    return total


HEURISTICS = {"h0": h0, "h1": h1, "h2": h2}
