# Gobierno técnico y regulatorio — WellFit EMR

**Versión:** 1.0.0  
**Fecha:** 2026-05-29  
**Alcance:** Milestone M0 — fuente única de verdad para decisiones técnicas y regulatorias antes de producción.

Este directorio es la **fuente única de verdad (SSOT)** para cumplimiento, riesgos, criterios de trabajo y plan de avance. Todo milestone, issue o PR que toque módulos clínicos o regulatorios debe referenciar explícitamente los artefactos aquí listados.

## Índice de artefactos

| Artefacto | Propósito |
|-----------|-----------|
| [compliance-matrix.md](./compliance-matrix.md) | Matriz módulo × norma × estado × evidencia × auditoría |
| [risk-register.md](./risk-register.md) | Registro de riesgos P0–P3 con dueño, fecha objetivo y evidencia de cierre |
| [definition-of-ready.md](./definition-of-ready.md) | Definition of Ready (DoR) para trabajo clínico/regulatorio |
| [definition-of-done.md](./definition-of-done.md) | Definition of Done (DoD) para trabajo clínico/regulatorio |
| [roadmap-30-60-90.md](./roadmap-30-60-90.md) | Roadmap operativo 30 / 60 / 90 días |
| [milestones.md](./milestones.md) | Hitos posteriores con normas, riesgos y evidencia aplicables |
| [architecture-decisions.md](./architecture-decisions.md) | Decisiones técnicas y regulatorias registradas (ADR-lite) |

## Documentos relacionados en el repo

| Documento | Rol |
|-----------|-----|
| [AGENTS.md](../../AGENTS.md) | Estado de implementación y convenciones para agentes/desarrolladores |
| [DEVELOPMENT_SPEC.md](../../DEVELOPMENT_SPEC.md) | Especificación funcional y de datos (texto largo; citas externas depuradas) |
| [CONTRIBUTING.md](../../CONTRIBUTING.md) | Flujo de contribución y enlaces a DoR/DoD |
| [.github/](../../.github/) | Plantillas de issues, PR y CI |
| [resources/legal/](../../resources/legal/README.md) | Copias PDF e índice de fuentes normativas oficiales usadas por la matriz |

## Métricas de gobierno (M0)

| Métrica | Objetivo | Verificación |
|---------|----------|--------------|
| Módulos críticos con obligación o exclusión explícita | 100% | [compliance-matrix.md](./compliance-matrix.md) — columna *Decisión* |
| Riesgos P0/P1 con issue, dueño y criterio de cierre | 100% | [risk-register.md](./risk-register.md) |
| Módulos clínicos sin criterio de auditoría/prueba | 0 | Matriz — columnas *Auditoría* y *Prueba* |

## Cómo usar este paquete

1. **Antes de abrir un issue:** elegir plantilla en `.github/ISSUE_TEMPLATE/` y citar normas/riesgos de la matriz.
2. **Antes de iniciar desarrollo:** confirmar [DoR](./definition-of-ready.md).
3. **Antes de mergear:** confirmar [DoD](./definition-of-done.md) y actualizar matriz/riesgos si cambia el alcance regulatorio.
4. **En cada PR:** completar la plantilla de PR con referencias a normas y evidencia.

## Mantenimiento

- Revisión programada: al cierre de cada hito en [milestones.md](./milestones.md) y como mínimo trimestral.
- Responsable de actualización: mantenedor del repo (rol *Arquitectura / Cumplimiento*).
- Cambios sustantivos en exclusión regulatoria requieren entrada en [architecture-decisions.md](./architecture-decisions.md).
