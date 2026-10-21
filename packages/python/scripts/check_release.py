"""Audit the actual wheel and source archive before registry publication."""
from __future__ import annotations

import ast
import hashlib
import json
import tarfile
import tomllib
import zipfile
from email.parser import BytesParser
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]


def require(value, message):
    if not value:
        raise SystemExit(message)


def audit():
    project = tomllib.loads((ROOT / "pyproject.toml").read_text())["project"]
    tree = ast.parse((ROOT / "src/insidedm/_version.py").read_text())
    version = next(ast.literal_eval(n.value) for n in tree.body if isinstance(n, ast.Assign)
                   and any(isinstance(t, ast.Name) and t.id == "__version__" for t in n.targets))
    require(project["name"] == "insidedm" and project["license"] == "MIT", "Unexpected publication identity.")
    artifacts = list((ROOT / "dist").iterdir())
    wheel = ROOT / "dist" / f"insidedm-{version}-py3-none-any.whl"
    source = ROOT / "dist" / f"insidedm-{version}.tar.gz"
    require(set(artifacts) == {wheel, source}, "dist must contain only this version's wheel and sdist.")
    with zipfile.ZipFile(wheel) as archive:
        files = {p: archive.read(p) for p in archive.namelist() if not p.endswith("/")}
        metadata = BytesParser().parsebytes(files[f"insidedm-{version}.dist-info/METADATA"])
        require(metadata["Name"] == "insidedm" and metadata["Version"] == version, "Wheel metadata does not match source.")
        require(metadata["License-Expression"] == "MIT" and metadata["Requires-Python"] == ">=3.11", "Wheel license or Python floor is wrong.")
        require("insidedm/py.typed" in files and "insidedm/types/inputs.py" in files, "Missing installed typing surface.")
        require(all(p.startswith(("insidedm/", f"insidedm-{version}.dist-info/")) for p in files), "Unexpected wheel payload.")
        require(any(p.endswith("/licenses/LICENSE") for p in files), "Missing wheel license.")
        contract = json.loads(files["insidedm/_generated/contract.json"])
        parity = json.loads(files["insidedm/_generated/parity.json"])
        require(set(parity["bound_operations"]) | set(parity["internal_operations"]) == set(contract["operations"]), "Unbound public operations.")
        require(contract["sha256"] == parity["contract_sha256"], "Contract snapshot mismatch.")
    with tarfile.open(source) as archive:
        members = archive.getmembers()
        require(all(m.isfile() or m.isdir() for m in members), "Source archive contains links or special files.")
        source_files = {m.name: archive.extractfile(m).read() for m in members if m.isfile()}
        prefix = f"insidedm-{version}/"
        require(all(p.startswith(prefix) for p in source_files), "Unexpected source archive root.")
        require(prefix + "LICENSE" in source_files and prefix + "src/insidedm/py.typed" in source_files, "Source archive lacks license or typing.")
        require(prefix + "README.md" in source_files and prefix + "pyproject.toml" in source_files, "Source archive cannot build independently.")
        for p, value in files.items():
            if p.startswith("insidedm/"):
                require(source_files.get(prefix + "src/" + p) == value, "Wheel and sdist contain different runtime source.")
        files.update(source_files)
    for name, value in files.items():
        path = PurePosixPath(name)
        require(not path.is_absolute() and ".." not in path.parts, "Unsafe artifact path.")
        require(not any(p in {"__pycache__", ".venv", ".git", "node_modules", ".pytest_cache", ".mypy_cache"} for p in path.parts), "Development cache leaked into artifacts.")
        require(path.suffix not in {".pyc", ".pyo"} and not path.name.startswith(".env"), "Unexpected private/build file.")
        require(b"/" + b"Users/" not in value and b"workspace" + b":" not in value
                and b"DATABASE_" + b"APP_URL" not in value, "Private workspace reference in artifact: " + name)
    for artifact in [wheel, source]:
        print(artifact.name, "sha256=" + hashlib.sha256(artifact.read_bytes()).hexdigest())
    print(f"Release audit passed: {version}; {len(contract['operations'])} shared operations; wheel and sdist agree.")


if __name__ == "__main__":
    audit()
