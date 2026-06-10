#!/usr/bin/env python3
"""
analyze_file.py — Analyse courte d'un gros fichier pour économiser les tokens.

Usage:
  python tools/analyze_file.py path/to/file.ts
  python tools/analyze_file.py path/to/file.ts --keyword transaction --context 8
  python tools/analyze_file.py path/to/file.ts --max-chars 6000
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

FORBIDDEN_PARTS = {
    ".git", "node_modules", "dist", "build", ".next", ".nuxt", "coverage",
    "vendor", "bin", "obj", "target", ".cache", ".turbo"
}
SECRET_NAMES = {
    ".env", ".env.local", ".env.production", ".env.development", "id_rsa", "id_dsa",
    "id_ecdsa", "id_ed25519", "private.key", "server.key"
}
BINARY_EXTS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz",
    ".tar", ".rar", ".7z", ".exe", ".dll", ".so", ".dylib", ".mp4", ".mp3",
    ".wav", ".woff", ".woff2", ".ttf", ".eot"
}
PATTERNS = [
    ("imports", re.compile(r"^\s*(import\s.+|from\s+\S+\s+import\s+.+|using\s+.+;|require\(.+\))")),
    ("classes", re.compile(r"^\s*(export\s+)?(abstract\s+)?class\s+[A-Za-z_][\w]*|^\s*public\s+class\s+[A-Za-z_][\w]*")),
    ("functions", re.compile(r"^\s*(export\s+)?(async\s+)?function\s+[A-Za-z_][\w]*|^\s*(public|private|protected)?\s*(async\s+)?[A-Za-z_<>,\[\]?]+\s+[A-Za-z_][\w]*\s*\([^)]*\)\s*[{;]|^\s*[A-Za-z_][\w]*\s*[:=]\s*(async\s*)?\([^)]*\)\s*=>")),
    ("routes", re.compile(r"\b(router\.|app\.|Route\(|@Get\(|@Post\(|@Put\(|@Delete\(|path\s*:)")),
    ("db", re.compile(r"\b(prisma\.|DbContext|Repository|sequelize|mongoose|schema|model\(|SELECT\s|INSERT\s|UPDATE\s|DELETE\s)", re.I)),
]


def die(msg: str, code: int = 1) -> None:
    print(f"ERREUR: {msg}", file=sys.stderr)
    raise SystemExit(code)


def is_forbidden(path: Path) -> str | None:
    parts = set(path.parts)
    hit = parts.intersection(FORBIDDEN_PARTS)
    if hit:
        return f"dossier interdit: {sorted(hit)[0]}"
    if path.name in SECRET_NAMES or path.name.startswith(".env"):
        return "fichier secret protégé"
    if path.suffix.lower() in BINARY_EXTS:
        return "fichier binaire/non texte"
    return None


def read_text(path: Path, max_bytes: int) -> str:
    try:
        raw = path.read_bytes()[:max_bytes]
    except FileNotFoundError:
        die(f"fichier introuvable: {path}")
    if b"\x00" in raw:
        die("le fichier semble binaire; lecture refusée")
    for enc in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def clip(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n...[sortie coupée pour économiser les tokens]"


def line_block(lines: list[str], start: int, end: int) -> str:
    start = max(1, start)
    end = min(len(lines), end)
    return "\n".join(f"{i:>5}: {lines[i-1]}" for i in range(start, end + 1))


def extract_symbols(lines: list[str], limit_per_type: int = 25) -> dict[str, list[str]]:
    found: dict[str, list[str]] = {name: [] for name, _ in PATTERNS}
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if not stripped or len(stripped) > 240:
            continue
        for name, pattern in PATTERNS:
            if len(found[name]) >= limit_per_type:
                continue
            if pattern.search(line):
                found[name].append(f"L{i}: {stripped}")
    return {k: v for k, v in found.items() if v}


def keyword_hits(lines: list[str], keyword: str, context: int, max_hits: int) -> list[tuple[int, int, int]]:
    pat = re.compile(re.escape(keyword), re.I)
    ranges = []
    for i, line in enumerate(lines, 1):
        if pat.search(line):
            ranges.append((max(1, i - context), i, min(len(lines), i + context)))
            if len(ranges) >= max_hits:
                break
    # merge overlaps
    merged: list[tuple[int, int, int]] = []
    for start, hit, end in ranges:
        if merged and start <= merged[-1][2] + 1:
            prev_start, prev_hit, prev_end = merged[-1]
            merged[-1] = (prev_start, prev_hit, max(prev_end, end))
        else:
            merged.append((start, hit, end))
    return merged


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyse courte d'un fichier long sans gaspiller les tokens.")
    parser.add_argument("file", help="Chemin du fichier à analyser")
    parser.add_argument("--keyword", "-k", action="append", default=[], help="Mot-clé à chercher; peut être répété")
    parser.add_argument("--context", type=int, default=8, help="Nombre de lignes autour d'un mot-clé")
    parser.add_argument("--max-bytes", type=int, default=2_000_000, help="Lecture maximale du fichier en octets")
    parser.add_argument("--max-chars", type=int, default=8000, help="Sortie maximale en caractères")
    parser.add_argument("--max-hits", type=int, default=6, help="Nombre maximal de blocs par mot-clé")
    args = parser.parse_args()

    path = Path(args.file)
    reason = is_forbidden(path)
    if reason:
        die(f"lecture refusée ({reason}): {path}")

    stat = path.stat() if path.exists() else None
    text = read_text(path, args.max_bytes)
    lines = text.splitlines()
    symbols = extract_symbols(lines)

    out: list[str] = []
    out.append(f"Fichier analysé: {path}")
    out.append(f"Taille: {stat.st_size if stat else 'inconnue'} octets")
    out.append(f"Lignes lues: {len(lines)}")
    out.append(f"Extension: {path.suffix or '(aucune)'}")
    out.append("")

    out.append("Résumé structurel:")
    if not symbols:
        out.append("- Aucun symbole principal détecté automatiquement.")
    else:
        for name, values in symbols.items():
            out.append(f"- {name}:")
            for item in values[:20]:
                out.append(f"  - {item}")
            if len(values) > 20:
                out.append(f"  - ... {len(values) - 20} autres éléments ignorés")
    out.append("")

    if args.keyword:
        for kw in args.keyword:
            ranges = keyword_hits(lines, kw, args.context, args.max_hits)
            out.append(f"Extraits pour mot-clé: {kw}")
            if not ranges:
                out.append("- Aucun résultat.")
            else:
                for start, hit, end in ranges:
                    out.append(f"--- L{start}-L{end} (hit L{hit}) ---")
                    out.append(line_block(lines, start, end))
            out.append("")
    else:
        out.append("Extraits recommandés:")
        if len(lines) <= 120:
            out.append(line_block(lines, 1, len(lines)))
        else:
            out.append("- Fichier long: lire seulement les sections ci-dessus ou relancer avec --keyword.")
            out.append("- Exemple: python tools/analyze_file.py <file> --keyword NomFonction")
        out.append("")

    out.append("Prochaine action proposée:")
    if args.keyword:
        out.append("- Lire uniquement les blocs pertinents affichés, puis appliquer un patch minimal.")
    else:
        out.append("- Relancer avec un mot-clé exact lié à l'erreur, la fonction, la route ou le composant.")

    print(clip("\n".join(out), args.max_chars))


if __name__ == "__main__":
    main()
