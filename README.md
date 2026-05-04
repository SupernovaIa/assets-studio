# slides-generator

Tres servicios que convierten markdown en material visual autocontenido:

| Servicio    | Output                          | Motor                          |
|-------------|---------------------------------|--------------------------------|
| Slides      | HTML autocontenido (deck)       | LLM genera HTML+CSS por slide  |
| Infografía  | PNG (póster horizontal)         | `gpt-image-2` con visual brief |
| Cheatsheet  | _por definir_                   | _por definir_                  |

Los tres aceptan un **brand** (paleta, tipografías, logo) cargado desde `brands/<nombre>/`. Hay un brand `default` agnóstico que se usa si no se especifica.

## Quickstart

```bash
npm install
cp .env.example .env   # ANTHROPIC_API_KEY, OPENAI_API_KEY
npm run dev            # http://localhost:3000/studio/
```

CLI (a partir de Fase 2):
```bash
npm run generate -- input.md --service=slides --brand=thepower
npm run generate -- input.md --service=infographic --brand=default
```

## Stack

TypeScript + ESM + Express 5 + Vitest. Alineado con `ai-learning-engine` para migración futura sin reescritura.

## Estructura

```
brands/
  default/              ← brand agnóstico de fallback
  thepower/             ← brand de ejemplo
src/
  server.ts             ← entry point
  create-app.ts         ← Express factory (DI, testable)
  config.ts             ← env loader
  generate.ts           ← CLI (Fase 2+)
  lib/
    brand.ts            ← loadBrand(name) → objeto normalizado
    slides/             ← pipeline de slides (LLM HTML+CSS)
    infographic/        ← pipeline de infografía (gpt-image-2)
    cheatsheet/         ← TBD
frontend-studio/        ← SPA del editor
docs/
  architecture.md
  roadmap.md
```

## Documentación

- [`docs/architecture.md`](docs/architecture.md) — pipelines, contrato del brand, endpoints
- [`docs/roadmap.md`](docs/roadmap.md) — fases de construcción y orden

## Convenciones

- Commits en inglés, conventional (`feat:`, `fix:`, `refactor:`, `docs:`)
- CSS: solo variables CSS, nunca hex literal en código de plantillas
- Un único pipeline por servicio — sin variantes paralelas
