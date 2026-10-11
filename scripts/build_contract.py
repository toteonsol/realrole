"""Build a compact deployable copy of the contract.

Bradbury caps a transaction at ~16-20M gas and deploy calldata costs ~800
gas/byte, so the readable source (33 KB) is too large to deploy there.
This script minifies the source (keeping annotations, which GenVM storage
needs), compresses it, and wraps it in a two-line loader that executes the
identical code in the module namespace.

    python scripts/build_contract.py contracts/realrole.py build/realrole.deploy.py
"""
import base64
import sys
import zlib

import python_minifier

src_path, out_path = sys.argv[1], sys.argv[2]
src = open(src_path).read()
header, body = src.split("\n", 1)
assert header.startswith("# {"), "first line must be the runner header"
mini = python_minifier.minify(
    body,
    remove_annotations=False,
    remove_literal_statements=True,
    rename_globals=False,
    rename_locals=True,
    hoist_literals=False,
)
packed = base64.b85encode(zlib.compress(mini.encode(), 9)).decode()
loader = (
    f"{header}\n"
    "import zlib,base64\n"
    f"exec(zlib.decompress(base64.b85decode('{packed}')).decode(),globals())\n"
)
open(out_path, "w").write(loader)
print(f"source {len(src)} B -> minified {len(mini)} B -> deployable {len(loader)} B")
