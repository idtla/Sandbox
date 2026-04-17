# Sandbox

Este repositorio es un **sandbox personal**: un sitio donde conviven **varios experimentos y mini-proyectos**, cada uno en **su propia rama**.

## Qué es `main`

La rama `main` **no contiene código de aplicación**. Solo esta documentación.

- Sirve como **punto de partida** para crear nuevas ramas (`git checkout main && git pull && git checkout -b nombre-del-proyecto`).
- Evita mezclar en un único historial todos los prototipos.
- Así puedes desplegar **GitHub Pages**, **Cloudflare Pages** u otros entornos **por rama o por proyecto**, sin que `main` sea la rama “de producción” de nada.

## Por qué no se fusiona en `main`

`main` debe permanecer como **plantilla vacía**. El trabajo vive en ramas (`pomodoro`, `miniapp`, `Artemis`, etc.). Las integraciones y PRs deberían ir **entre ramas de proyecto** o hacia una rama dedicada, **no** hacia `main`.

En GitHub hay un **ruleset** en `main` que impide **force-push** y **borrar la rama**. Además, el workflow **block-pr-to-main** se ejecuta en cada PR hacia `main` y **falla a propósito** (avisando de que no debes fusionar ahí). Los pushes **normales** a `main` siguen permitidos para poder actualizar esta plantilla.

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
2. El workflow **block-pr-to-main** corre en PRs hacia `main` y deja el check en rojo (`block-pr-to-main / block-merge-to-main`). No fusiones ese PR si quieres respetar el modelo del sandbox.
3. El **ruleset** `sandbox-main-readonly` (Settings → Rules) aplica a `refs/heads/main`: **sin force-push** y **sin borrar la rama**. No incluye checks obligatorios en el ruleset, porque GitHub los aplicaría también a los **pushes directos** y bloquearía actualizar `main` por `git push`.

Recrear el ruleset en otro clon: [GitHub CLI](https://cli.github.com/) (`gh auth login`) y `.\.github\scripts\setup-github-main-protection.ps1`.

### Si `git push` rechaza el workflow

GitHub puede responder: *refusing to allow a Personal Access Token … without `workflow` scope*. En ese caso:

- Crea un **Personal Access Token (classic)** con el scope **`workflow`**, o usa **GitHub CLI** (`gh auth login`) con permisos suficientes, y vuelve a ejecutar `git push --force-with-lease origin main`.
- O sube el contenido de `.github/workflows/block-pr-to-main.yml` creando el archivo **desde la web** del repositorio (Editor) y luego alinea tu copia local con `git pull`.
