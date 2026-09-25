# Deployment

## Cloudflare Pages — recommended

This is a static application. Its AI processing runs in the visitor's browser, so a
server does not need to remain awake for inference or retain a SQLite database.

1. Push the rewritten project to your Git repository.
2. In Cloudflare, open Workers & Pages and create a Pages project connected to that repository.
3. Choose the desired production branch.
4. Root directory: `frontend`.
5. Build command: `npm run build`.
6. Build output directory: `dist`.
7. Set `NODE_VERSION=22` if the build environment does not already use Node 22.
8. Deploy and open the generated HTTPS URL directly.

Or run `npm --prefix frontend ci` then `npm run build` locally and use Pages Direct
Upload with the contents of `frontend/dist` (or the provided static ZIP).
The model and WASM files remain external; do not upload the Python environment or database.

Cloudflare currently documents 500 builds/month and 20,000 files/site on the Free plan.
Check current limits when deploying: https://developers.cloudflare.com/pages/platform/limits/ .
Direct Upload: https://developers.cloudflare.com/pages/get-started/direct-upload/ .

## Netlify

Connect the repository; `netlify.toml` sets the frontend base, build command, Node version,
and publish directory. Static drag-and-drop deployment can also use `frontend/dist`.
Current account limits and eligibility are controlled by the hosting provider.

## Render

Use the supplied `render.yaml` for a Static Site, or create one manually:
root `frontend`, build `npm ci && npm run build`, publish `dist`.
Do not choose a Python web service for this version.
Reference: https://render.com/docs/static-sites .

## Docker / Hugging Face Spaces

The multi-stage Dockerfile builds with Node 22 and serves static files with unprivileged
Nginx on port 7860. For local testing: `docker build -t attn .` and
`docker run --rm -p 7860:7860 attn`. The README contains Docker Space metadata.
Do not assume a new Hugging Face Docker Space is free: its hardware documentation notes
that creating a compute Space can require a paid plan. Static hosting is the free-first route.
Reference: https://huggingface.co/docs/hub/spaces-gpus .

## After deploying

- Run the interactive demo. Expect a distraction nudge after roughly 21 seconds.
- Finish and inspect the demo report. Reload, revisit Reports, and verify it persists.
- Edit a rule and test its action. Return demo-only test changes to your desired defaults.
- Test camera access on the direct HTTPS URL, not only an embedded preview.
- Verify permission-denied and camera-disconnected feedback.
- Desktop notifications need permission and are not uniformly supported across browsers.
- Keep the page visible while focusing. Browser automations stop when the tab is hidden.
- Export anything you want to retain. localStorage belongs to the deployed origin and device.

## Portfolio walkthrough

1. Show Focus space and explain the one-task intention.
2. Start the camera-free demo and show an automatic nudge.
3. Open Automations: demonstrate trigger → duration → action and cooldowns.
4. Configure a 10-second interval with a Pause action to demonstrate a visible effect.
5. Finish and show Reports: timeline, focus percentage, longest streak, and CSV export.
6. Explain the tradeoff: browser privacy and free hosting versus no unattended cloud execution.
7. Show the worker boundary, pure rule-engine tests, and GitHub Actions checks.
