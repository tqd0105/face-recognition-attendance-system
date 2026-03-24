# face-recognition-attendance-system

Face Recognition Attendance System.

## Git Workflow

- Base branch: `main`
- Integration branch: `develop`
- Feature branches: `feature/<name>`

Recommended merge flow:

1. `feature/*` -> `develop`
2. `develop` -> `main`

## Commit Standards

This repository uses Conventional Commits.

See full guideline in `CONTRIBUTING.md`.

Quick format:

```text
<type>(<scope>): <short summary>
```

Examples:

```text
feat(frontend): add attendance dashboard layout
fix(backend): validate student id before check-in
docs(readme): add setup steps for local development
```

## Optional: Use Commit Template

Set the template once on your machine:

```bash
git config --global commit.template .gitmessage.txt
```

You can also set it only for this repository:

```bash
git config commit.template .gitmessage.txt
```
