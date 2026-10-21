# Publish the Python SDK

Distribution: **insidedm** on PyPI; import: **insidedm**; initial version: **0.1.0a0**.
The public source is `InsideDM/sdk`, directory `packages/python`. Node has its own
version and release workflow. `python-v<version>` tags identify Python releases.

## One-time registry setup

The PyPI project owner needs a verified PyPI account with two-factor authentication.
If the project does not exist, create a pending Trusted Publisher for `insidedm`:

| PyPI field | Value |
| --- | --- |
| Project name | `insidedm` |
| Publisher | GitHub Actions |
| Owner | `InsideDM` |
| Repository | `sdk` |
| Workflow filename | `python-release.yml` |
| Environment | `pypi` |

For an existing project, configure the same publisher in its publishing settings.
Package-name availability does not establish ownership. Do not put a PyPI token in
GitHub secrets, code, issues or chat. Trusted Publishing exchanges a short-lived
GitHub identity only inside the protected publisher job.

The GitHub `pypi` environment must allow only `main`. Repository owners can add
required reviewers if desired. The workflow has a separate unprivileged build/check
stage and an Ubuntu publisher with `id-token: write`; it publishes the exact wheel
and source archive downloaded from that run, with digital attestations enabled.

## Release

1. Update `_version.py`, the changelog and README installation status. Commit and
   push the reviewed source to `main`.
2. Run **Publish Python SDK** on that exact `main` commit. Its reusable checks cover
   supported Python versions, types, contract drift, wheel/sdist metadata, artifact
   allowlists and installed-package behavior.
3. After the checks and protected environment pass, PyPA's publisher uploads both
   artifacts together. Existing filenames are immutable; do not overwrite or hide
   duplicate-upload failures with `skip-existing`.
4. Verify PyPI version, descriptions, file hashes and attestations. Install the
   exact registry version in a fresh environment and run an offline client before
   creating `python-v<version>` on that same source commit.
5. Update documentation with verified publication evidence. An alpha remains an
   alpha; hosted provider acceptance is a separate product check.

Build locally with `python -m build`, `python -m twine check --strict dist/*`, and
`python scripts/check_release.py`. Source archives build without Node, Git or the
private application repository. Regeneration is a maintainer operation, not an
installation hook.

Use a new version for a correction. PyPI currently allows adding distribution
files only within 14 days of a release's first upload; this workflow uploads the
wheel and source archive together. TestPyPI is optional and requires a separate
publisher/account setup. Never mix production and test indexes as a fallback.

See [creating a project with a pending Trusted Publisher](https://docs.pypi.org/trusted-publishers/creating-a-project-through-oidc/),
[existing-project publishers](https://docs.pypi.org/trusted-publishers/adding-a-publisher/),
[PyPA's GitHub publishing guide](https://packaging.python.org/en/latest/guides/publishing-package-distribution-releases-using-github-actions-ci-cd-workflows/)
and [digital attestations](https://docs.pypi.org/attestations/).
