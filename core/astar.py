"""Graph-search A* with pluggable heuristic. h0 = 0 makes it Dijkstra/UCS."""

import heapq
import itertools
import time
from dataclasses import dataclass

from core.puzzle import GOAL, neighbors


@dataclass
class Result:
    path: list
    moves: list
    metrics: dict


def astar(start, h, goal=GOAL):
    t0 = time.perf_counter()
    tie = itertools.count()
    # key (f, -g, counter): ties go to deeper nodes, then FIFO
    heap = [(h(start), 0, next(tie), start)]
    best_g = {start: 0}
    parent = {start: None}  # state -> (prev_state, move)
    expanded = generated = 0
    max_frontier = 1

    while heap:
        _, neg_g, _, s = heapq.heappop(heap)
        g = -neg_g
        if g > best_g[s]:
            continue  # stale entry, not counted
        expanded += 1
        if s == goal:
            break
        for m, t in neighbors(s):
            ng = g + 1
            if ng < best_g.get(t, ng + 1):
                best_g[t] = ng
                parent[t] = (s, m)
                heapq.heappush(heap, (ng + h(t), -ng, next(tie), t))
                generated += 1
        max_frontier = max(max_frontier, len(heap))
    else:
        raise ValueError("unsolvable state")

    path, moves = [goal], []
    while parent[path[-1]]:
        prev, m = parent[path[-1]]
        path.append(prev)
        moves.append(m)
    path.reverse()
    moves.reverse()
    return Result(path, moves, {
        "expanded": expanded,
        "generated": generated,
        "max_frontier": max_frontier,
        "time_ms": (time.perf_counter() - t0) * 1000,
        "cost": len(moves),
    })
