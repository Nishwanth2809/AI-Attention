# Preserved version 1

This folder preserves the improved Flask/MediaPipe application and the former React UI.
The current app lives in `frontend/` and runs entirely in the browser. Nothing here is
part of the new production bundle or Docker image.

To run the old Python app with a compatible Python environment, use this directory as
the working directory, install `requirements.txt`, and run `python app.py`.
To use the original database, set `ATTENTION_DB_PATH` to the absolute path of the
`attention.db` still in the project root. Existing uploads also remain in the project
root; this archive is retained as reference rather than a migrated live service.

Run the archived regression tests from here with `python -m unittest discover -s tests -v`.
`frontend-src` is the original frontend source snapshot before the full rewrite.
