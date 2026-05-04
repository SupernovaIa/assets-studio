# Architecture

## Servicios

Tres servicios independientes con la misma forma de entrada (`markdown` + `brand`) y outputs distintos. Comparten el cargador de brand y nada más.

### 1. Slides

Pipeline en dos fases:

```
markdown ──► [outline LLM] ──► outline JSON (slides con título + intent)
                                    │
                                    └──► [content LLM × N en paralelo]
                                              │
                                              └──► HTML+CSS por slide
                                                        │
                                                        └──► [validación] ──► retry ×2
                                                                    │
                                                                    └──► HTML autocontenido final
```

- **Outline**: el LLM lee el markdown y devuelve la estructura del deck (cover, secciones, slides de contenido con un *intent* visual cada una, thanks).
- **Content**: por cada slide de contenido, una llamada al LLM en paralelo que devuelve `{ html, css }` libre, usando un set de clases base (`sg-*`) y las variables CSS del brand.
- **Validación**: heurística sobre el HTML generado (cardinalidad de bloques, no overflow obvio, uso de variables del brand). Si falla, retry hasta 2 veces.
- **Ensamblado**: chrome hardcoded por tipo de slide (cover, section, thanks, content) + HTML/CSS del LLM inyectado. Output es un `.html` único con CSS inline, fuentes de Google Fonts, JS de navegación inline, assets en base64.

**Edición conversacional**: la API es stateless. El cliente guarda `slides[]` + `chats[]` y los manda en cada `POST /api/slides/edit`. La edición regenera el slide con el chat como contexto.

### 2. Infografía

```
markdown ──► [brief LLM] ──► visual brief (texto descriptivo)
                                    │
                                    └──► [gpt-image-2] ──► PNG
                                                │
                                                └──► [composite logo] ──► PNG final
```

- **Brief**: una llamada a Anthropic Sonnet con system prompt minimalista + el `brief-exemplar.txt` del brand como ejemplo conversacional (few-shot). Sonnet adapta el ejemplo al documento y al brand. Sustituye paleta y fonts del brand sobre los del exemplar.
- **Imagen**: `gpt-image-2` a 2048×1024 (horizontal, 2K). Devuelve PNG.
- **Logo**: el modelo no genera logos legibles. Se compositea con `sharp` en post sobre la esquina configurada en el brand.
- **Wrapper HTML**: el PNG se sirve embebido en una página simple con botón "Imprimir / Descargar".

No hay edición conversacional en infografía (es one-shot por ahora).

### 3. Cheatsheet

_Por definir._ Decisiones pendientes:
- Formato: ¿A4 portrait densa? ¿Multi-página? ¿Imagen o HTML?
- Motor: ¿LLM HTML como slides, o imagen como infografía?
- Edición: ¿conversacional o one-shot?

Ver [`roadmap.md`](roadmap.md).

## Sistema de brand

Un brand es **datos**, no código. Vive en `brands/<nombre>/`:

```
brands/<nombre>/
  brand.json              ← contrato (ver abajo)
  logo.png                ← opcional
  extra.css               ← opcional, overrides finos
  brief-exemplar.txt      ← opcional, prompt validado para infografía
```

### `brand.json`

```json
{
  "name": "thepower",
  "displayName": "The Power",
  "palette": {
    "primary":   "#1C3C42",
    "accent":    "#82C4AF",
    "secondary": "#E8654A",
    "surface":   "#ffffff",
    "text":      "#1C3C42",
    "textMuted": "rgba(28,60,66,0.62)"
  },
  "fonts": {
    "heading": { "family": "Sora",    "weights": [600, 700] },
    "body":    { "family": "Poppins", "weights": [400, 500, 600] }
  },
  "logo": {
    "file":     "logo.png",
    "position": "bottom-right"
  },
  "infographic": {
    "styleHint": "editorial, clean, generous whitespace"
  }
}
```

> `logo.position` aplica solo a infografía (dónde compositea `sharp` el logo). En slides la posición la decide el chrome de cada tipo.

El loader (`src/lib/brand.ts`) lo lee, valida con zod, y devuelve un objeto normalizado:

```js
{
  name, displayName,
  palette,                  // hex colors
  fonts: { heading, body, googleFontsUrl },
  logo: { dataUrl, position } | null,
  extraCss: string | "",
  briefExemplar: string,    // contenido de brief-exemplar.txt; fallback a default si no existe
  infographic: { styleHint }
}
```

Este objeto se inyecta en:
- **Slides**: las variables CSS del `palette` se vuelcan en `:root`, las fuentes se cargan en el `<head>`, y los prompts del LLM reciben los nombres de las variables disponibles ("usa `var(--primary)`, no inventes colores").
- **Infografía**: el `palette` y `styleHint` se inyectan como texto en el prompt del visual brief y en el prompt de imagen ("paleta: ..., estilo: ...").

### Brand `default`

Paleta neutra (grises + un acento azul), tipografías Inter+Inter, sin logo. Es el fallback cuando no se pasa `brand` o el nombre no existe.

## API

Stateless. El cliente mantiene el estado.

| Método | Ruta                       | Body                                              | Response                  |
|--------|----------------------------|---------------------------------------------------|---------------------------|
| GET    | `/studio/`                 | —                                                 | SPA                       |
| POST   | `/api/slides/generate`     | `{ markdown, brand? }`                            | `{ slides[] }`            |
| POST   | `/api/slides/edit`         | `{ slides, chats, slideIndex, message, brand? }`  | `{ slides, chats }`       |
| POST   | `/api/slides/preview`      | `{ slides, brand? }`                              | `text/html`               |
| POST   | `/api/slides/download`     | `{ slides, brand? }`                              | `text/html` (attachment)  |
| POST   | `/api/infographic`         | `{ markdown, brand? }`                            | `{ imageUrl, html }`      |
| POST   | `/api/cheatsheet`          | TBD                                               | TBD                       |
| GET    | `/api/brands`              | —                                                 | `[{ name, displayName }]` |

`brand` es opcional. Si se omite, usa `default`.

## Decisiones tomadas (y por qué)

- **Un solo pipeline de slides** (LLM genera HTML+CSS libre). Descartamos el structured/legacy del repo viejo: la consistencia se logra con prompts y validación, no con un renderer determinista.
- **Infografía solo vía `gpt-image-2`**. Descartamos las variantes HTML/3D/animated/nano del repo viejo. La premium (`-a`) era la que mejor funcionaba.
- **Brand como datos, no como código**. En el repo viejo cada brand era un módulo Node con prompts custom — esto se duplicaba y dificultaba añadir brands. Ahora los prompts son únicos y los brands solo aportan tokens visuales.
- **API stateless**. El cliente lleva el estado de slides + chats. Permite deploy en serverless sin sesiones.
