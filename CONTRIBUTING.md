# Guía de contribución — WellFit EMR

Gracias por contribuir a un EMR con requisitos clínicos y regulatorios. Este flujo prioriza trazabilidad y cumplimiento sobre velocidad sin documentación.

## Antes de codificar

1. Revisar [`docs/governance/README.md`](docs/governance/README.md).
2. Confirmar [Definition of Ready](docs/governance/definition-of-ready.md) en el issue.
3. Elegir la plantilla correcta en GitHub (Seguridad, UX clínica, Interoperabilidad, Documentación, Bug regulatorio o Feature).

## Flujo de trabajo

1. Crear rama desde `main`: `feat/...`, `fix/...` o `docs/...`.
2. Implementar con patrones del repo (oRPC + TanStack Query; formularios con `@tanstack/react-form` + Zod).
3. Actualizar gobierno cuando corresponda:
   - [`docs/governance/compliance-matrix.md`](docs/governance/compliance-matrix.md) — cambios de alcance o estado regulatorio
   - [`docs/governance/risk-register.md`](docs/governance/risk-register.md) — cierre o nuevos riesgos P0/P1
   - [`AGENTS.md`](AGENTS.md) — avance funcional o arquitectónico
   - [`.env.example`](.env.example) — variables de entorno
4. Verificar localmente:

```bash
bun run check-types
bun x ultracite check
# Tests del área tocada, por ejemplo:
bun test packages/api/src/services/rips-generator.test.ts
```

5. Abrir PR usando la [plantilla](.github/pull_request_template.md) y enlazar issues (`Fixes #N`).

## Definition of Done

Todo merge a `main` para trabajo clínico/regulatorio debe cumplir [definition-of-done.md](docs/governance/definition-of-done.md).

## Commits

- Mensajes claros en español o inglés técnico consistente con el historial del repo.
- Enfocados en el *por qué* cuando el cambio es regulatorio o de seguridad.

## CI

El workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) debe pasar en verde antes del merge.

## Dudas de cumplimiento

Consultar la matriz por módulo y, para RIPS/FEV, la skill `.agents/skills/rips-generation-validation` en el repositorio.
