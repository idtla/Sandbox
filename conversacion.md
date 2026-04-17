# Conversación del proyecto

---

**Agente:** 2026-04-17 — `main` quedó en un solo commit con `README.md`, `conversacion.md`, `.github/workflows/block-pr-to-main.yml` y `.github/scripts/setup-github-main-protection.ps1`. Las ramas remotas no se han borrado. El push falló aquí por falta de scope **`workflow`** en el token: hace falta un PAT con ese permiso (o `gh auth login`) y entonces `git push --force-with-lease origin main`. Luego activar Actions y (opcional) `.github/scripts/setup-github-main-protection.ps1` con `gh`.

**Agente:** 2026-04-17 (tarde) — `git push --force-with-lease origin main` hecho. Ruleset **`sandbox-main-readonly`** (id 15212567): al inicio llevaba check obligatorio y eso **bloqueaba también `git push`** a `main`; se dejó solo **non_fast_forward + deletion** (sin checks en ruleset). El workflow **block-pr-to-main** sigue fallando en PRs. PR #11 temporal cerrado; rama `ci/bootstrap-check` eliminada. Commit `815a20c` y doc/script alineados con eso.
