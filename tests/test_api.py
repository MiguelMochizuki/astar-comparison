"""API: solve responses, 422 on invalid input, 404 without experiment, static index."""

import pytest
from fastapi.testclient import TestClient

import api.main
from api.main import app

client = TestClient(app)
ONE_MOVE = [1, 2, 3, 4, 5, 6, 7, 0, 8]


@pytest.mark.parametrize("h", ["h0", "h1", "h2"])
def test_solve(h):
    r = client.post("/api/solve", json={"state": ONE_MOVE, "heuristic": h})
    assert r.status_code == 200
    body = r.json()
    assert body["moves"] == ["R"]
    assert body["path"] == [ONE_MOVE, [1, 2, 3, 4, 5, 6, 7, 8, 0]]
    assert body["metrics"]["cost"] == 1
    assert body["metrics"]["bstar"] == pytest.approx(body["metrics"]["generated"])


def test_solve_goal_has_null_bstar():
    r = client.post("/api/solve", json={"state": [1, 2, 3, 4, 5, 6, 7, 8, 0], "heuristic": "h2"})
    assert r.status_code == 200 and r.json()["metrics"]["bstar"] is None


@pytest.mark.parametrize("state,h", [
    ([1, 1, 3, 4, 5, 6, 7, 8, 0], "h2"),   # duplicate
    ([1, 2, 3], "h2"),                      # wrong length
    ([1, 2, 3, 4, 5, 6, 7, 8, 9], "h2"),   # out of range
    ([2, 1, 3, 4, 5, 6, 7, 8, 0], "h2"),   # unsolvable
    (ONE_MOVE, "h3"),                       # unknown heuristic
])
def test_solve_rejects(state, h):
    assert client.post("/api/solve", json={"state": state, "heuristic": h}).status_code == 422


def test_experiment_missing(monkeypatch, tmp_path):
    monkeypatch.setattr(api.main, "EXPERIMENT", tmp_path / "nope.json")
    assert client.get("/api/experiment").status_code == 404


def test_experiment_present():
    r = client.get("/api/experiment")
    assert r.status_code == 200 and r.json()["rows"][0]["d"] == 2


def test_index():
    assert client.get("/").status_code == 200
