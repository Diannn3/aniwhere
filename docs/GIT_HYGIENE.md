# Git hygiene

Keep the history reviewable and each commit easy to revert.

## Commit boundaries

- Commit every notable change as soon as it is coherent and verified.
- Keep unrelated fixes, refactors, formatting, tests, and documentation in separate commits.
- Do not stage unrelated working-tree files. Review `git diff --cached` before committing.
- If a change crosses multiple concerns, split it into dependency-ordered commits.

## Commit size

- Keep each commit below 150 changed lines: additions plus deletions.
- Check the staged size before committing:

  ```bash
  git diff --cached --shortstat
  ```

- If the count is 150 or more, split the commit by concern or dependency boundary.
- Generated output and lockfiles count toward the limit; avoid bundling them unless required.

## Verification

- Run the smallest relevant check before committing.
- Use `git diff --check` to catch whitespace errors.
- Commit only after the staged diff and commit message describe one reviewable change.
- Prefer short imperative commit subjects with a conventional type, such as `fix:`, `feat:`, `test:`, or `docs:`.
