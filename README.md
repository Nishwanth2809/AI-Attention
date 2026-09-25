---
title: Attn - Personal Focus Coach
emoji: 🌿
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# Attn — a personal focus coach

A browser-first automation project that turns visual attention cues into useful actions.
Set an intention, start a focus session, and let configurable rules handle distraction
nudges, desk-away pauses, break reminders, and focus milestones. Finish with a private
session report and downloadable timeline.

## Run locally

Use Node.js 22 (or Node.js 20.19+).

```sh
npm --prefix frontend ci
npm run dev
```

Open http://127.0.0.1:5173. Choose **Try a demo first** for a camera-free walkthrough.
The demo uses simulated signals and the real automation engine. About 21 seconds in,
the default distraction rule produces a coach card. Demo reports are explicitly labeled.

```sh
npm test
npm run build
npm run preview
```

`frontend/dist` is the complete deployable application. The new app does **not** need
Python, a database server, an API key, or a GPU. The former Flask application is preserved
in `legacy/`. Do not run `python app.py` from the project root for the new application.

## What works

- **Focus space:** session intention, 15/25/50-minute timer, private camera preview,
  focus signal, gaze/head/eye cues, pause/resume, and live score timeline.
- **Automations:** configurable thresholds, sustained-condition durations, cooldowns,
  enable/disable switches, three actions, and a visible execution log.
- **Actions:** in-app coach cards, optional desktop notifications, and automatic session pause.
  Reaching the session goal automatically finishes and saves a report.
- **Reports:** average signal, observed focused time, longest streak, per-session timeline,
  automation count, camera/demo filters, CSV timelines, and JSON exports.
- **Privacy controls:** camera opt-in, notification opt-in, local reports, export, and clear-data controls.
- **Portfolio demo:** works without camera access, a model download, credentials, or a server.

## Deploy free

**Recommended: Cloudflare Pages.** Connect this repository, set the root directory to
`frontend`, build command to `npm run build`, output directory to `dist`, and Node version
to `22`. Alternatively, upload the contents of a locally built `frontend/dist` directory
using Pages Direct Upload. Open the deployed HTTPS URL directly for camera use.

`netlify.toml` and `render.yaml` provide alternative static-host configurations. Docker
support serves the same static bundle on port 7860; it does not run Python inference.

See [deployment guide](docs/DEPLOYMENT.md) for exact steps and caveats. No deployment has
been performed automatically.

## Structure

```text
frontend/
  src/
    core/                 # Pure rule engine, session aggregates, storage
    features/
      focus/              # Camera lifecycle, focus controller, workspace
      automations/        # Rule editor and execution log
      reports/            # Reports, exports, privacy settings
    ui/                   # Icons, chart, modal keyboard handling
  public/vision-worker.js # Isolated MediaPipe inference worker
  tests/                  # Node tests and real model smoke-check page
  dist/                   # Production build
legacy/                   # Previous Python/UI implementation, preserved
.github/workflows/ci.yml   # Test and build on pushes and pull requests
docs/                     # Architecture, deployment, validation
```

## Architecture and tradeoffs

Camera frames stay on the visitor's device. A dedicated worker loads MediaPipe Face
Landmarker and processes one frame at a time. The UI derives a heuristic score from gaze
alignment (45%), head alignment (35%), and eye openness (20%). It samples the score once
per second for reports and automations. This deliberately avoids claiming to detect
thoughts, true productivity, medical conditions, or precise blink rates.

Rules run **only while the session is active and this tab is visible**. Hiding the tab,
pausing, or a long device suspension pauses coaching. These are interactive browser
automations, not scheduled cloud jobs. Refreshing closes an unfinished session without
saving a completed report; finish first to preserve it.

The latest 30 completed reports and rule preferences are saved in localStorage, scoped
to this browser and domain. They do not sync across devices. Export reports before
clearing browser data. Storage failures are surfaced in the UI.

First camera use needs internet access to load pinned MediaPipe JavaScript/WASM from
jsDelivr and the model from Google Cloud Storage. Fonts load from Google Fonts; system
fonts are the fallback. Camera use requires HTTPS or localhost, browser permission,
and a compatible browser; recent desktop Chrome or Edge is the recommended starting point.
The free-host demo has no server-side inference load or shared-session conflicts.

## Sources

- [MediaPipe Face Landmarker for Web](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)

Model accuracy is not established by the included tests. Use this as a personal focus
experiment and an automation-engineering showcase, not an employee or student assessment tool.
