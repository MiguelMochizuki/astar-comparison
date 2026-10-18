"""Heuristics for the 8-puzzle. h1 and h2 skip the blank, otherwise inadmissible."""

from core.puzzle import GOAL

_TARGET = {tile: divmod(i, 3) for i, tile in enumerate(GOAL)}


def h0(s):
    """Null heuristic; A* with h0 is Dijkstra/UCS.

    Args:
        s: State.

    Returns:
        Always 0.
    """
    return 0


def h1(s):
    """Count misplaced tiles, excluding the blank.

    Args:
        s: State.

    Returns:
        Number of tiles 1..8 not at their GOAL position.
    """
    return sum(1 for x, g in zip(s, GOAL) if x and x != g)


def h2(s):
    """Sum the Manhattan distances of each tile to its goal, excluding the blank.

    Args:
        s: State.

    Returns:
        Sum over tiles 1..8 of |row - goal_row| + |col - goal_col|.
    """
    total = 0
    for i, x in enumerate(s):
        if x:
            r, c = divmod(i, 3)
            tr, tc = _TARGET[x]
            total += abs(r - tr) + abs(c - tc)
    return total


HEURISTICS = {"h0": h0, "h1": h1, "h2": h2}
