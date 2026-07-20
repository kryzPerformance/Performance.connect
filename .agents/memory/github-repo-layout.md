---
name: GitHub repo layout
description: Where this project pushes on GitHub and what must not be overwritten
---
Origin is `kryzPerformance/Performance.connect`. Its `main` branch holds the user's LIVE performanceconnect.ca site code (wrangler/Cloudflare-based) — never push or force-push the events app to `main`.
**Why:** Overwriting main would delete the existing site's source from GitHub.
**How to apply:** Push this workspace's code to the `events-app` branch (`gitPush({ branch: "events-app" })`).
