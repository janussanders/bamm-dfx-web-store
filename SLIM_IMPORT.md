# Caffeine import — slim branch

**Branch:** `caffeine-import-slim`

Caffeine GitHub import failed at ~60 MB because tracked assets were triplicated (`frontend/public`, `src/frontend/public`, `src/frontend/dist`) and included 70+ dev screenshots.

This branch keeps only:

- Source code (`src/backend`, `src/frontend/src`)
- UI icons actually referenced in the app: `frontend/public/assets/generated/` (9 PNGs)
- Backend build artifacts needed for bindgen: `src/backend/dist/`

## Import into Caffeine

1. GitHub Settings → Import from GitHub
2. Repository: `janussanders/bamm-e-commerce-site`
3. **Git ref:** `caffeine-import-slim`
4. Import from GitHub

After deploy, re-upload Mac/Windows installers via Admin if object-storage blobs were not in git (they never should be).
