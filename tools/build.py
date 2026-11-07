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
# Fragment for the claude.ai artifact (host adds its own document skeleton)
(root / "dist").mkdir(exist_ok=True)
(root / "dist/artifact.html").write_text(html, encoding="utf-8")
# Full standalone document for GitHub Pages / local use
head = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black">\n'
        '<meta name="theme-color" content="#1c1e21">\n')
i = html.index("<div class=\"wrap\">")
full = head + html[:i] + "</head>\n<body>\n" + html[i:] + "\n</body>\n</html>\n"
(root / "index.html").write_text(full, encoding="utf-8")
print("built index.html", len(full), "bytes; dist/artifact.html", len(html), "bytes")
