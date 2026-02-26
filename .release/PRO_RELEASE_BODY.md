## Pro v0.1.0

- Source Pro tag: `pro/v0.1.0`
- Source Pro commit: `cf85806b6744d8f50a322fe2018581f93f10ec05`

## Shared

- Introduced a standardized Pro to Community release process with explicit SemVer tag mapping.
- Added stricter sync traceability by persisting source tag, source commit, and UTC sync timestamp.
- Improved release governance with enforced English release artifacts and clearer automation boundaries.
- Updated README to a concise Docker Hub-safe format under 25,000 characters.

## Pro

- Added automated Pro release generation from `pro/vX.Y.Z` tags.
- Added release note generation tooling to build Pro and Community notes from one source file.
- Enforced pre-commit quality gates in workflow design: build-first policy and README length validation.
