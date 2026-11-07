#!/usr/bin/env python3
"""Inline js/calc.js and data/*.json into src/app.html -> index.html (single self-contained file)."""
import json, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "src/app.html").read_text(encoding="utf-8")
calc = (root / "js/calc.js").read_text(encoding="utf-8")
calc = re.sub(r"^export\s+", "", calc, flags=re.M)
env = json.dumps(json.loads((root / "data/envelopes.json").read_text(encoding="utf-8")), ensure_ascii=False)
apt = json.dumps(json.loads((root / "data/airports.json").read_text(encoding="utf-8")), ensure_ascii=False)

for marker in ("/*__ENVELOPES__*/", "/*__AIRPORTS__*/", "/*__CALC__*/"):
    assert html.count(marker) == 1, marker
html = html.replace("/*__ENVELOPES__*/", env).replace("/*__AIRPORTS__*/", apt).replace("/*__CALC__*/", calc)
(root / "index.html").write_text(html, encoding="utf-8")
print("built index.html", len(html), "bytes")
