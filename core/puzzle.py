"""8-puzzle state: 9-tuple, row-major, 0 = blank."""

GOAL = (1, 2, 3, 4, 5, 6, 7, 8, 0)

# Move letter = direction the blank moves.
_DELTAS = {"U": (-1, 0), "D": (1, 0), "L": (0, -1), "R": (0, 1)}


def neighbors(s):
    """[(move, next_state)] for every legal blank move."""
    i = s.index(0)
    r, c = divmod(i, 3)
    out = []
    for m, (dr, dc) in _DELTAS.items():
        nr, nc = r + dr, c + dc
        if 0 <= nr < 3 and 0 <= nc < 3:
            j = nr * 3 + nc
            t = list(s)
            t[i], t[j] = t[j], t[i]
            out.append((m, tuple(t)))
    return out


def is_valid(s):
    return len(s) == 9 and sorted(s) == list(range(9))


def is_solvable(s):
    """3x3 grid: solvable iff inversion count (ignoring blank) is even."""
    tiles = [x for x in s if x]
    inv = sum(a > b for i, a in enumerate(tiles) for b in tiles[i + 1:])
    return inv % 2 == 0
