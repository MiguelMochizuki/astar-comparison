"""8-puzzle state: 9-tuple, row-major, 0 = blank."""

GOAL = (1, 2, 3, 4, 5, 6, 7, 8, 0)

# Move letter = direction the blank moves.
_DELTAS = {"U": (-1, 0), "D": (1, 0), "L": (0, -1), "R": (0, 1)}


def neighbors(s):
    """List the states reachable in one move.

    Args:
        s: State, 9-tuple in row-major order with 0 as the blank.

    Returns:
        List of (move, next_state) pairs, one per legal blank move. The
        move letter (U/D/L/R) is the direction the blank moves.
    """
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
    """Check that s is a permutation of 0..8.

    Args:
        s: Candidate state, any sequence.

    Returns:
        True if s has 9 entries covering 0..8 exactly once.
    """
    return len(s) == 9 and sorted(s) == list(range(9))


def is_solvable(s):
    """Check whether s can reach GOAL.

    On a 3x3 grid a state is solvable iff its inversion count, ignoring
    the blank, is even.

    Args:
        s: Valid state (see is_valid).

    Returns:
        True if s is solvable.
    """
    tiles = [x for x in s if x]
    inv = sum(a > b for i, a in enumerate(tiles) for b in tiles[i + 1:])
    return inv % 2 == 0
