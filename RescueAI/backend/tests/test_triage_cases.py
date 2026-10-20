import json
from pathlib import Path

import pytest

from app.services.triage import evaluate

CASES = json.loads((Path(__file__).resolve().parents[2] / "shared" / "triage_cases.json").read_text())["cases"]


@pytest.mark.parametrize("case", CASES, ids=[f"{c['task']}-{i}" for i, c in enumerate(CASES)])
def test_shared_case(case):
    r = evaluate(case["task"], case["vitals"], case["flags"])
    assert r["level"] == case["level"]
    assert sorted(a["code"] for a in r["alerts"]) == sorted(case["codes"])
    if "missing" in case:
        assert sorted(r["missing_vitals"]) == sorted(case["missing"])
