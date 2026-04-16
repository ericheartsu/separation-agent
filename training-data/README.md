# training-data/

This folder is **not** where training files live in production. The real training data lives in Google Drive (read-only via the app).

This folder exists for:

- **Local dev caching** — when developing on your machine, the app may cache flattened previews here
- **Test fixtures** — small sample files (sanitized, not real customer art) for unit tests
- **Documentation** — sample files referenced from PLAN.md / TRAINING.md

Subfolders:

- `past-jobs/` — sample triplets for testing the ingest pipeline
- `templates/` — sample mockup templates for testing the generator
- `generated-mockups/` — output from local generator runs

Everything here is gitignored except `.gitkeep` files and this README. Real customer art **never** goes in this folder, even for testing — sanitize first.
