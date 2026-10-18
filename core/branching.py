"""Effective branching factor b* (AIMA): N + 1 = sum_{i=0..d} b*^i."""


def effective_branching(n, d, tol=1e-9):
    if d == 0:
        return None

    def total(b):
        return sum(b ** i for i in range(d + 1))

    lo, hi = 1.0, max(1.0, float(n))
    if total(lo) >= n + 1:
        return 1.0
    while hi - lo > tol:
        mid = (lo + hi) / 2
        if total(mid) < n + 1:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2
