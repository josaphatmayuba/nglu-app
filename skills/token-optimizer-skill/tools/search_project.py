#!/usr/bin/env python3
"""
search_project.py — Recherche ciblée dans un projet avec exclusions anti-gaspillage.

Usage:
  python tools/search_project.py "transaction type" src
  python tools/search_project.py "createTransaction" . --ext .ts --max-results 30
"""
from __future__ import annotations

import argparse
import os
import re
from pathlib import Path

EXCLUDED_DIRS = {".git", "node_modules", "dist", "build", ".next", ".nuxt", "coverage", "vendor", "bin", "obj", "target", ".cache", ".turbo"}
SECRET_NAMES = {".env", ".env.local", ".env.production", "id_rsa", "id_ed25519", "private.key", "server.key"}
BINARY_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz", ".mp4", ".mp3", ".wav", ".woff", ".woff2", ".ttf"}


def allowed(path: Path, exts: set[str] | None) -> bool:
    if any(part in EXCLUDED_DIRS for part in path.parts):
        return False
    if path.name in SECRET_NAMES or path.name.startswith(".env"):
        return False
    if path.suffix.lower() in BINARY_EXTS:
        return False
    if exts and path.suffix.lower() not in exts:
        return False
    return path.is_file()


def safe_read(path: Path, max_bytes: int = 250_000) -> str:
    raw = path.read_bytes()[:max_bytes]
    if b"\x00" in raw:
        return ""
    return raw.decode("utf-8", errors="ignore")


def main() -> None:
    p = argparse.ArgumentParser(description="Recherche projet économique en tokens.")
    p.add_argument("query", help="Mot ou regex à chercher")
    p.add_argument("root", nargs="?", default=".", help="Dossier racine")
    p.add_argument("--regex", action="store_true", help="Traiter query comme regex")
    p.add_argument("--ext", action="append", default=[], help="Filtrer par extension, ex: --ext .ts")
    p.add_argument("--max-results", type=int, default=50)
    p.add_argument("--max-chars", type=int, default=8000)
    args = p.parse_args()

    root = Path(args.root)
    exts = {e.lower() if e.startswith(".") else "." + e.lower() for e in args.ext} or None
    pattern = re.compile(args.query if args.regex else re.escape(args.query), re.I)

    results: list[str] = []
    count = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDED_DIRS]
        for fn in filenames:
            path = Path(dirpath) / fn
            if not allowed(path, exts):
                continue
            text = safe_read(path)
            if not text:
                continue
            for i, line in enumerate(text.splitlines(), 1):
                if pattern.search(line):
                    snippet = line.strip()
                    if len(snippet) > 220:
                        snippet = snippet[:220] + "..."
                    results.append(f"{path}:L{i}: {snippet}")
                    count += 1
                    break
            if count >= args.max_results:
                break
        if count >= args.max_results:
            break

    output = [f"Recherche: {args.query}", f"Racine: {root}", f"Résultats: {len(results)}", ""] + results
    txt = "\n".join(output)
    if len(txt) > args.max_chars:
        txt = txt[:args.max_chars] + "\n...[sortie coupée pour économiser les tokens]"
    print(txt)


if __name__ == "__main__":
    main()
