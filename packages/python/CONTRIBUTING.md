# Develop the Python SDK

Python 3.11+ is required. Work from `packages/python` in the public SDK repository:

```sh
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install --group dev
python -m pip install -e .
python scripts/generate.py --check
python -m mypy src/insidedm
python -m pytest -q
python -m build
python -m twine check --strict dist/*
python scripts/check_release.py
```

On Windows activate `.venv\Scripts\activate` instead. The distribution builds from
its own source archive; no Node installation, backend checkout, Git metadata or
code generation is needed to install it. Regeneration alone reads the reviewed
sibling `packages/node/openapi/public-v1.yaml`. Run `scripts/generate.py` after
reviewing shared contract changes and commit the generated files and reference.

Keep sync and async behavior aligned through shared policy. Async code must use
native I/O and propagate caller cancellation. Keep endpoints fixed, validate
before requests and preserve intent keys and bodies across retries. Name public
arguments in snake_case. Preserve arbitrary customer map keys, distinguish omitted
fields from explicit null, and avoid duplicate aliases for the same action.

Public documentation is audience agnostic. Detailed partner integration playbooks
are distributed privately. Never add real keys, customer data, private URLs,
environment files or backend code to this repository or package.

The SDK, documentation and bundled contract are MIT licensed. Update the Python
changelog for user-visible changes. Python releases and `python-v<version>` tags
are independent of Node releases. See [publication](PUBLICATION.md).
