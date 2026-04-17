# Sandbox

Este repositorio es un **sandbox personal**: un sitio donde conviven **varios experimentos y mini-proyectos**, cada uno en **su propia rama**.

## Qué es `main`

La rama `main` **no contiene código de aplicación**. Solo esta documentación.

- Sirve como **punto de partida** para crear nuevas ramas (`git checkout main && git pull && git checkout -b nombre-del-proyecto`).
- Evita mezclar en un único historial todos los prototipos.
- Así puedes desplegar **GitHub Pages**, **Cloudflare Pages** u otros entornos **por rama o por proyecto**, sin que `main` sea la rama “de producción” de nada.

## Por qué no se fusiona en `main`

`main` debe permanecer como **plantilla vacía**. El trabajo vive en ramas (`pomodoro`, `miniapp`, `Artemis`, etc.). Las integraciones y PRs deberían ir **entre ramas de proyecto** o hacia una rama dedicada, **no** hacia `main`.

En GitHub, la rama `main` está protegida mediante **comprobaciones obligatorias** (workflow) para que los PRs hacia `main` no se puedan fusionar. Para ajustes puntuales del README en `main`, usa **push directo** con permisos de administrador o el flujo que definas en el equipo.

## Cómo empezar un proyecto nuevo

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b mi-nuevo-proyecto
```

Desarrolla en `mi-nuevo-proyecto` y súbelo con `git push -u origin mi-nuevo-proyecto`.

## Ramas existentes

Las demás ramas del remoto **no se tocan desde esta limpieza de `main`**: siguen apuntando a sus commits. Solo el historial de **`main`** pasa a ser mínimo (este README + automatización de protección).

## Protección de `main` en GitHub

1. Activa **Actions** en el repositorio si estaban desactivadas.
2. Tras el primer PR hacia `main`, el workflow `block-pr-to-main` registra el check `block-pr-to-main / block-merge-to-main` (siempre falla: **no** se puede fusionar el PR).
3. Opcional por terminal (requiere [GitHub CLI](https://cli.github.com/)): `winget install GitHub.cli`, luego `gh auth login`, y ejecuta:

   `.\.github\scripts\setup-github-main-protection.ps1`

   Eso crea un **ruleset** que exige ese check y bloquea force-push y borrado de `main`. Si la API rechaza el nombre del check, añádelo en **Settings → Rules → Branch rules** cuando el check ya haya aparecido en un PR.

### Si `git push` rechaza el workflow

GitHub puede responder: *refusing to allow a Personal Access Token … without `workflow` scope*. En ese caso:

- Crea un **Personal Access Token (classic)** con el scope **`workflow`**, o usa **GitHub CLI** (`gh auth login`) con permisos suficientes, y vuelve a ejecutar `git push --force-with-lease origin main`.
- O sube el contenido de `.github/workflows/block-pr-to-main.yml` creando el archivo **desde la web** del repositorio (Editor) y luego alinea tu copia local con `git pull`.
