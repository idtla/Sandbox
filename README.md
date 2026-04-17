# Sandbox

Este repositorio es un **sandbox personal**: aquí conviven **varios experimentos y mini-proyectos**. Cada proyecto vive en **su propia rama**. La rama **`main` no es la aplicación**: es solo la **plantilla** y la documentación de cómo trabajamos.

Este README está escrito para que **cualquier persona** y **herramientas automáticas** (p. ej. **Codex**, copilotos, agentes) entiendan el modelo sin interpretarlo a la ligera.

---

## Modelo mental (léelo antes de tocar Git)

| Rama | Rol |
|------|-----|
| **`main`** | Plantilla mínima: documentación del sandbox, automatización en `.github/`, y poco más. **No** es donde se desarrolla un producto. |
| **Rama de proyecto** (p. ej. `pomodoro`, `miniapp`) | Aquí está el **código y el historial** de ese experimento. Los PRs de trabajo del proyecto van **entre ramas que cuelgan de esta línea**, no hacia `main`. |
| **Ramas de feature** (p. ej. `pomodoro/login-oauth`) | Ramas **hijas de la rama de proyecto**. Sirven para features, fixes o refactors sin ensuciar la línea principal del proyecto hasta fusionar. |

**Regla de oro:** el trabajo “real” **nunca** tiene que terminar fusionándose en `main`. `main` solo sirve para **arrancar proyectos nuevos** y para **mantener esta guía** y los workflows del repo.

---

## Qué hay exactamente en `main`

- Este **`README.md`** (contrato de trabajo del sandbox).
- **`.github/workflows/block-pr-to-main.yml`**: en cada **pull request hacia `main`**, ejecuta un job que **falla a propósito** para marcar en rojo que ese PR no es el flujo deseado para código de proyecto.
- **`.github/scripts/setup-github-main-protection.ps1`**: script para crear o actualizar el **ruleset** de protección de `main` con [GitHub CLI](https://cli.github.com/) (`gh`).

No esperes en `main` el código fuente de los proyectos; eso está en **ramas de proyecto** en el remoto.

---

## Crear un **proyecto nuevo** (rama nueva desde `main`)

Siempre desde **`main` actualizado**, para no arrastrar commits de otro experimento salvo que quieras algo derivado a posta.

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b nombre-del-proyecto
# … desarrollo …
git push -u origin nombre-del-proyecto
```

El nombre de rama puede ser `kebab-case` o el estilo que prefieras; lo importante es que **identifique un proyecto** o línea de trabajo clara.

---

## **Features** y trabajo iterativo (rama hija de la rama de proyecto)

Para no mezclar todo en la punta de la rama de proyecto hasta que esté listo:

```bash
git fetch origin
git checkout nombre-del-proyecto
git pull origin nombre-del-proyecto
git checkout -b nombre-del-proyecto/short-desc-de-la-feature
# … commits …
git push -u origin nombre-del-proyecto/short-desc-de-la-feature
```

**Integración:**

- Abre un **pull request** en GitHub con **base = `nombre-del-proyecto`** y **compare = tu rama de feature**.
- **No** abras PRs de código de proyecto con **base `main`**, salvo cambios que sean **solo** de esta plantilla (README, workflows, scripts de repo).

Si fusionas por línea de comandos en local:

```bash
git checkout nombre-del-proyecto
git merge nombre-del-proyecto/short-desc-de-la-feature
git push origin nombre-del-proyecto
```

---

## Qué **no** hacer (importante para humanos e IA)

1. **No** tratar `main` como rama de despliegue “oficial” del sandbox: no lo es.
2. **No** fusionar en `main` el código de un proyecto (timer, miniapp, etc.). Mantén ese trabajo en la **rama del proyecto** (y sus features).
3. **No** abrir PRs de implementación de producto con **base `main`**; la base debe ser la **rama de proyecto** correspondiente.
4. Los PRs hacia `main` están pensados solo para **mantenimiento del repo** (documentación, workflows). El workflow **block-pr-to-main** fallará igualmente: revísalo y no fusiones por costumbre sin leer.

---

## Instrucciones explícitas para **Codex, GPT y agentes**

Cuando trabajes en este repositorio en modo asistente o batch:

1. **Pregunta o infiere la rama de proyecto** en la que debe vivir el cambio. Si es un proyecto nuevo, la rama debe **crearse desde `main`** y nombrarse de forma clara.
2. **No** propongas fusionar código de aplicación hacia **`main`**.
3. Si generas un **pull request**, la **rama base** debe ser la **rama de proyecto** (o la rama de feature padre acordada), **no `main`**, salvo que el cambio sea estrictamente de plantilla (README, `.github`, etc.).
4. Respeta que **`main`** debe seguir siendo **ligera**: evita añadir ahí dependencias pesadas, builds o árboles de código de un solo proyecto salvo que el mantenedor lo pida para la plantilla misma.
5. Para despliegues (Pages, Cloudflare, etc.), asume que el **origen del build** será la **rama del proyecto**, no `main`, salvo configuración explícita.

---

## Despliegue (GitHub Pages, Cloudflare Pages, etc.)

Cada proyecto puede tener su **rama** como fuente de despliegue. Configura el proveedor para que construya desde **`nombre-del-proyecto`** (o desde la subcarpeta que uses en esa rama). No asumas que `main` sirve como preview del sandbox completo.

---

## Protección de `main` en GitHub

1. **Actions** debe poder ejecutarse (para el workflow de bloqueo en PRs a `main`).
2. **Workflow `block-pr-to-main`:** en PRs hacia `main`, el check `block-pr-to-main / block-merge-to-main` **falla a propósito**. Es una señal; no indica un bug del código.
3. **Ruleset `sandbox-main-readonly`:** aplica a `refs/heads/main` y evita **force-push** y **borrar la rama**. No incluye “checks obligatorios” en el ruleset para no bloquear los **pushes normales** a `main` al actualizar esta plantilla (GitHub aplicaría esos checks también al push directo).

Para recrear o actualizar el ruleset en Windows, con `gh` autenticado:

`.\.github\scripts\setup-github-main-protection.ps1`

### Token sin permiso para workflows

Si `git push` dice que no puedes crear o actualizar `.github/workflows/` sin el scope **`workflow`**, usa un token con ese permiso o **`gh auth login`** con los scopes adecuados, y vuelve a hacer push. Alternativa: crear el YAML desde la web del repo y luego `git pull`.

---

## Ramas existentes en el remoto

Pueden existir muchas ramas de proyecto a la vez (p. ej. prototipos viejos). **No** se borran automáticamente al limpiar `main`: cada una sigue apuntando a su historial. Lista las ramas con `git branch -r` o mira el remoto en GitHub.

---

## Resumen en una frase

**`main` = plantilla y reglas del sandbox; cada rama de proyecto = un mundo aparte; las features = ramas que nacen del proyecto y vuelven al proyecto, no a `main`.**
