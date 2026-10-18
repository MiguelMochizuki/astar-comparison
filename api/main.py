"""FastAPI: solve endpoint, precomputed experiment, static front."""

import json
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from core.astar import astar
from core.branching import effective_branching
from core.heuristics import HEURISTICS
from core.puzzle import is_solvable, is_valid

ROOT = Path(__file__).resolve().parent.parent
EXPERIMENT = ROOT / "results" / "experiment.json"

app = FastAPI(title="A* 8-puzzle")


class SolveRequest(BaseModel):
    """Body of POST /api/solve.

    Attributes:
        state: 9 ints, row-major, 0 = blank.
        heuristic: "h0", "h1" or "h2".
    """

    state: list[int]
    heuristic: Literal["h0", "h1", "h2"]


@app.post("/api/solve")
def solve(req: SolveRequest):
    """Solve a state with one heuristic.

    Args:
        req: State and heuristic name.

    Returns:
        Dict with path (list of states), moves and metrics (including bstar).

    Raises:
        HTTPException: 422 if the state is not a permutation of 0..8 or is
            unsolvable.
    """
    s = tuple(req.state)
    if not is_valid(s):
        raise HTTPException(422, "state must be a permutation of 0..8")
    if not is_solvable(s):
        raise HTTPException(422, "state is unsolvable")
    r = astar(s, HEURISTICS[req.heuristic])
    metrics = {**r.metrics, "bstar": effective_branching(r.metrics["generated"], r.metrics["cost"])}
    return {"path": r.path, "moves": r.moves, "metrics": metrics}


@app.get("/api/experiment")
def experiment():
    """Serve the precomputed experiment.

    Returns:
        Contents of results/experiment.json.

    Raises:
        HTTPException: 404 if the experiment was not generated yet.
    """
    if not EXPERIMENT.exists():
        raise HTTPException(404, "run `python -m experiment.run` first")
    return json.loads(EXPERIMENT.read_text())


app.mount("/", StaticFiles(directory=ROOT / "web", html=True), name="web")
