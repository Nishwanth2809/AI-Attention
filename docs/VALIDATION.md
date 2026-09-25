# Validation of the rewrite

- 15 Node tests passed: dwell thresholds, cooldowns, disabled/edited rules, pause continuity, missing-face routing, periodic reminders, focus milestones, configuration recovery, report statistics, bounded history, demo events, landmark score bounds, and storage failure recovery.
- Production Vite build passed. Initial application JavaScript is approximately 73 KB gzipped, excluding model assets loaded only on camera start.
- In-app browser walkthrough: demo started, distraction cards appeared, manual pause worked, Finish saved a report, and reports persisted across reload.
- Edited the break interval to 10 seconds with a Pause action. The app automatically paused and logged the action. Restored the 20-minute coach-card default afterward.
- Real MediaPipe worker integration check passed: downloaded the pinned runtime/model and ran inference on a blank image, returning no face. No webcam permission was requested for this check.
- Desktop and narrow/mobile layouts were inspected. The narrow report page had equal document and scroll widths (no horizontal overflow).
- Runtime console check showed no errors or warnings during the demo walkthrough.
- CSV serialization is tested. The embedded-browser download event could not be confirmed, so test actual CSV/JSON file downloads in your deployment browser.
- Actual webcam permission, real-face scoring accuracy, desktop notification delivery, Docker image building, and a remote deployment remain manual checks. Model initialization/inference was tested; model accuracy was not.
- No deployment or Git commit was made. Original application code is archived under legacy; original root database/upload data was left intact.

The preview contains two clearly labeled demo reports created during verification; production starts empty on a new browser origin.
