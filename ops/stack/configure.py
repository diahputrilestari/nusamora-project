#!/usr/bin/env python3
"""Ubah/menambah kunci di config.toml proyek CI: configure.py <config.toml> "section:key=value" ..."""
import sys, re
path, edits = sys.argv[1], sys.argv[2:]
lines = open(path).read().split("\n")
for e in edits:
    sec, kv = e.split(":", 1); key, val = kv.split("=", 1)
    hdr = f"[{sec}]"; i = next((n for n, l in enumerate(lines) if l.strip() == hdr), None)
    if i is None:
        lines += ["", hdr, f"{key} = {val}"]; continue
    j = i + 1
    while j < len(lines) and not lines[j].lstrip().startswith("["): j += 1
    pat = re.compile(r"^\s*#?\s*" + re.escape(key) + r"\s*=")
    k = next((n for n in range(i + 1, j) if pat.match(lines[n])), None)
    if k is None: lines.insert(i + 1, f"{key} = {val}")
    else: lines[k] = f"{key} = {val}"
open(path, "w").write("\n".join(lines))
