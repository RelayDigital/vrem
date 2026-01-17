---
active: true
iteration: 1
max_iterations: 20
completion_promise: "COMPLETE"
started_at: "2026-01-17T22:59:20Z"
---

We are building the VREM real estate media production platform MVP from scratch in this repo. First read activity.md to see what was recently accomplished. Start the site locally and keep it localhost only. Use either: npm run dev (for Next or Vite) OR python3 -m http.server 8000 --bind 127.0.0.1 (for static HTML). Verify the current behavior in Claude in Chrome by opening the local URL and checking the page loads with no obvious layout issues. Then open plan.md and choose the single highest priority task whose Status is failing. Work on exactly one task: implement the change, run the linter or build check if available (npm run lint, npm run typecheck, or npm run build), and verify in Chrome again. Check the browser console for errors and confirm the change matches the acceptance criteria in plan.md. Append a dated progress entry to activity.md describing what you changed, which commands you ran, and what you verified in Chrome. When the task is confirmed, update that task Status in plan.md from failing to passing. Make one git commit for that task only with a clear single line message. Do not run git init, do not change git remotes, and do not push. Repeat until all tasks are passing. When all tasks are marked passing, output exactly COMPLETE.
