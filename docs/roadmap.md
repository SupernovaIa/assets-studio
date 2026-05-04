# Roadmap

Construcción en fases. Cada fase tiene un criterio de "hecho" claro. No avanzar a la siguiente sin cerrar la anterior.

## Fase 0 — Andamiaje

- `package.json` con `express`, `@anthropic-ai/sdk`, `openai`, `sharp`, `dotenv`
- `.env.example` con `ANTHROPIC_API_KEY` y `OPENAI_API_KEY`
- `server.js` minimal + `lib/create-app.js` con DI
- Estructura de carpetas (`brands/`, `lib/{slides,infographic}`, `frontend-studio/`)
- `npm test` con `node:test` + `supertest` (aunque sea un test trivial)

**Hecho cuando**: `npm run dev` levanta y `GET /` devuelve algo.

## Fase 1 — Brand loader

- `lib/brand.js` con `loadBrand(name)` y validación del schema
- `brands/default/brand.json` (paleta neutra, Inter, sin logo)
- `brands/thepower/brand.json` migrado del repo viejo
- `GET /api/brands` lista los disponibles
- Tests del loader (default fallback, brand inexistente, schema inválido)

**Hecho cuando**: `loadBrand("thepower")` y `loadBrand("default")` devuelven objetos válidos y `loadBrand("nope")` cae a `default`.

## Fase 2 — Slides

- Prompts (outline + content) parametrizados con tokens del brand
- `lib/slides/generate.js` con las dos fases en paralelo
- Validación heurística + retry ×2
- `lib/slides/render.js` ensambla el HTML final autocontenido
- `lib/slides/edit.js` para edición conversacional
- Endpoints `/api/slides/{generate,edit,preview,download}`
- Logging por ejecución en `logs/<timestamp>/`

**Hecho cuando**: `node generate.js input.md --service=slides --brand=thepower` produce un HTML que se ve bien en el navegador y la edición conversacional funciona.

## Fase 3 — Infografía

- `lib/infographic/brief.js` — LLM produce visual brief con tokens del brand
- `lib/infographic/image.js` — llama a `gpt-image-2`, devuelve PNG
- `lib/infographic/composite.js` — `sharp` overlay del logo
- Endpoint `/api/infographic`
- CLI flag `--service=infographic`

**Hecho cuando**: `node generate.js input.md --service=infographic --brand=thepower` produce un PNG que respeta la paleta y tiene el logo en la esquina correcta.

## Fase 4 — Studio UI

- SPA con tres tabs: Slides, Infografía, Cheatsheet (placeholder)
- Selector de brand poblado desde `/api/brands`
- Para slides: editor conversacional (lo del repo viejo, simplificado)
- Para infografía: input + preview + descarga
- Sin estado en el servidor

**Hecho cuando**: un usuario puede ir a `/studio/`, elegir brand, generar slides + editarlas, y generar una infografía, todo desde la misma UI.

## Fase 5 — Cheatsheet

Decisiones pendientes (resolver antes de empezar la fase):

1. **Formato**: A4 portrait densa, multi-página, ¿imagen o HTML?
2. **Motor**: si es HTML, sigue el patrón de slides; si es imagen, sigue el de infografía
3. **Edición**: ¿conversacional o one-shot?

Una vez decidido, replica el patrón del servicio análogo.

## No-objetivos (explícitos)

- No reimplementar el structured pipeline del repo viejo
- No reimplementar variantes de infografía (3D, animated, nano-banana)
- No multi-tenant ni auth — esto es una herramienta interna
- No persistencia en DB — la API es stateless, el cliente lleva el estado
