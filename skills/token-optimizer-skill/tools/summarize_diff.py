#!/usr/bin/env python3
"""
summarize_diff.py — Résume un diff Git sans coller tout le patch.

Usage:
  git diff | python tools/summarize_diff.py
  python tools/summarize_diff.py < diff.patch
"""
from __future__ import annotations

import re
import sys

MAX_HUNKS = 40
MAX_CHARS = 8000


def main() -> None:
    diff = sys.stdin.read()
    files = []
    current = None
    additions = deletions = 0
    hunks = []

    for line in diff.splitlines():
        if line.startswith("diff --git "):
            if current:
                files.append((current, additions, deletions, hunks[:]))
            m = re.search(r" b/(.+)$", line)
            current = m.group(1) if m else line
            additions = deletions = 0
            hunks = []
        elif line.startswith("@@"):
            if len(hunks) < MAX_HUNKS:
                hunks.append(line)
        elif line.startswith("+") and not line.startswith("+++"):
            additions += 1
        elif line.startswith("-") and not line.startswith("---"):
            deletions += 1
    if current:
        files.append((current, additions, deletions, hunks[:]))

    out = ["Résumé du diff:"]
    if not files:
        out.append("- Aucun diff détecté.")
    for file, add, delete, hs in files:
        out.append(f"- {file}: +{add} / -{delete}")
        for h in hs[:5]:
            out.append(f"  - {h}")
        if len(hs) > 5:
            out.append(f"  - ... {len(hs)-5} autres blocs")

    txt = "\n".join(out)
    if len(txt) > MAX_CHARS:
        txt = txt[:MAX_CHARS] + "\n...[sortie coupée pour économiser les tokens]"
    print(txt)


if __name__ == "__main__":
    main()
