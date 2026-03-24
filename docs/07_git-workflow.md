# Git Workflow

## Branches
- main
- develop
- feature/ai-frontend
- feature/backend-system

## Workflow

Frontend developer:
git checkout feature/ai-frontend
git pull
git add .
git commit -m "feat(frontend): ..."
git push origin feature/ai-frontend

Backend developer:
git checkout feature/backend-system
git pull
git add .
git commit -m "feat(backend): ..."
git push origin feature/backend-system

Integrate to develop:
git checkout develop
git pull
git merge feature/ai-frontend
git merge feature/backend-system
git push origin develop

Release to main:
git checkout main
git pull
git merge develop
git push origin main