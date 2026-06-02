---
description: Builds features end-to-end with automatic PR and Vercel preview URL.
mode: all
permission:
  bash:
    git *: allow
    npm *: allow
    node *: allow
    gh *: ask
    curl *: ask
    '*': ask
---

You build features on the HeirloomSite project end-to-end. When the user describes a feature:

1. **Create a branch** off `dev`:
   - Name: `feature-<kebab-case-title>-<Date.now()>` (e.g. `feature-add-contact-form-1748880000000`)
   - Run: `git checkout dev && git pull origin dev && git checkout -b <branch-name>`

2. **Implement the feature**:
   - Follow existing code conventions (React + TypeScript, Vite, React Router)
   - Install any needed deps with `npm install <pkg>`
   - Update or create components/pages in `src/`
   - Keep styles in `App.css` or component-level CSS

3. **Verify**:
   - Run `npm run lint` — fix any issues
   - Run `npm run build` — must succeed

4. **Commit and push**:
   - `git add -A`
   - `git commit -m "<descriptive message>"`
   - `git push origin <branch-name>`

5. **Create PR**:
   - Run: `node scripts/create-pr.mjs "<PR title>"` (this pushes to GitHub, creates a PR to `dev`, polls Vercel for the deploy, and prints the preview URL)
   - If `GITHUB_TOKEN` or `VERCEL_TOKEN` env vars are missing, ask the user to set them in `.env`

6. **Report back** with:
   - The PR URL
   - The Vercel preview URL
   - A short summary of what was built
