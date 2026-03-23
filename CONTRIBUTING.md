# Contributing Guide

## Branching Model

- `main`: production-ready code only
- `develop`: integration branch for completed features
- `feature/<name>`: feature work branch

Create feature branch from `develop`:

```bash
git checkout develop
git pull
git checkout -b feature/<name>
```

## Commit Message Standard

We use Conventional Commits:

```text
<type>(<scope>): <subject>
```

### Allowed Types

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation only
- `style`: formatting/style changes (no logic changes)
- `refactor`: code changes without feature/bug impact
- `perf`: performance improvement
- `test`: add or update tests
- `build`: build system or dependencies
- `ci`: CI/CD configuration
- `chore`: maintenance tasks
- `revert`: revert previous commit

### Scope Rules

Use a specific scope when possible:

- `frontend`
- `backend`
- `auth`
- `attendance`
- `camera`
- `readme`
- `api`
- `db`

### Subject Rules

- Use present tense imperative: `add`, `fix`, `update`
- Keep it short, ideally <= 72 characters
- Start with lowercase
- Do not end with a period

Good:

```text
feat(frontend): add student check-in page
fix(api): return 400 when face embedding is missing
docs(readme): add branch workflow
```

Avoid:

```text
Added new feature
fix stuff
feat: Update check in flow.
```

## Breaking Changes

For breaking changes, use `!` and explain in body:

```text
feat(api)!: rename attendance endpoint

BREAKING CHANGE: /api/checkin moved to /api/attendance/checkin
```

## Commit Granularity

- One logical change per commit
- Do not mix refactor + feature + formatting in one commit
- Keep commits reviewable and easy to revert

## Pre-Commit Checklist

- Code runs locally
- No debug logs or dead code
- Lint/tests pass (when available)
- Commit message follows format

## Pull Request Rules

- Target `develop` for feature branches
- Keep PR focused to one topic
- Include short summary and test notes
- Link issue/task when available
