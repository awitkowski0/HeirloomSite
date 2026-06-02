---
name: feature-pull-request
description: Use when the user asks to build a new feature, create a PR, or deploy. Covers the full workflow, branch creation, implementation, verification, PR creation, and Vercel preview URL retrieval.
---

# Feature PR Workflow

This is the HeirloomSite project — a furniture e-commerce site built with React + TypeScript, Vite, and deployed on Vercel.

## When the user asks to build a feature

Follow these steps in order:

### 1. Branch
- Base off `dev`: `git checkout dev && git pull origin dev`
- Create branch: `git checkout -b feature-<kebab-title>-<Date.now()>`

### 2. Implement
- Follow existing conventions in the codebase
- `src/pages/` for page components, `src/components/` for shared components
- React Router v7 for routing, React Helmet Async for `<head>` meta
- Stripe + PayPal for payments, PostHog for analytics
- Data lives in `public/data/` (built from `data/` by `scripts/build-data.mjs`)

### 3. Verify
```bash
npm run lint
npm run build
```
Fix any issues. Build must succeed.

### 4. Commit & push
```bash
git add -A
git commit -m "feat: <short description>"
git push origin <branch-name>
```

### 5. Create PR
```bash
node scripts/create-pr.mjs "<PR title>"
```

This script:
- Creates a PR on GitHub from current branch → `dev`
- Polls Vercel until the deploy is ready
- Prints the PR URL and the Vercel preview URL

### 6. Report
Tell the user:
- PR URL
- Vercel preview URL
- Summary of changes

## Env vars required
Set these in `.env` (never commit):
- `GITHUB_TOKEN` — GitHub personal access token with `repo` scope
- `VERCEL_TOKEN` — Vercel access token (from Vercel dashboard → Settings → Tokens)
- `VERCEL_PROJECT_ID` — optional, auto-detected from `vercel.json` or git remote
