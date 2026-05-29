# Definition of Done (DoD) — trabajo clínico y regulatorio

Un ítem está **terminado** cuando cumple **todos** los criterios aplicables.

## Código y calidad

- [ ] Implementación fusionada en rama principal vía PR revisado.
- [ ] `bun run check-types` en verde.
- [ ] `bun x ultracite check` en verde (o solo archivos tocados justificados en PR).
- [ ] Tests automatizados añadidos o actualizados para comportamiento nuevo/regulatorio crítico.
- [ ] Sin `TODO` ligados al alcance del issue.

## Documentación y gobierno

- [ ] [compliance-matrix.md](./compliance-matrix.md) actualizada si cambia estado, exclusión o evidencia de un módulo.
- [ ] [risk-register.md](./risk-register.md) actualizada si se cierra o mitiga un riesgo.
- [ ] [AGENTS.md](../../AGENTS.md) actualizado si hay avance funcional/arquitectónico (regla del proyecto).
- [ ] [.env.example](../../.env.example) actualizado si hay variables nuevas o cambiadas.
- [ ] ADR en [architecture-decisions.md](./architecture-decisions.md) si hay decisión estructural o exclusión normativa.

## Seguridad y cumplimiento

- [ ] Mutaciones oRPC y rutas Hono con autenticación verificada.
- [ ] Eventos de auditoría registrados para escrituras clínicas y acciones IA (patrón existente).
- [ ] Datos sensibles no logueados en claro; resúmenes IA con disclaimers preservados.
- [ ] Encuentros documentales no alimentan RIPS/IHCE/facturación si el cambio toca esos flujos.

## UX y operación

- [ ] Strings de UI en español; estados vacío/error manejados.
- [ ] Navegación desde errores regulatorios (RIPS) preservada o mejorada si aplica.
- [ ] Seed o datos de demo actualizados si el flujo es demostrable en `bun run seed`.

## Regulatorio específico

### RIPS / facturación

- [ ] Generador sin placeholders inventados; errores con `path` accionables.
- [ ] Tests `rips-generator` / `rips-preflight-validator` pasan.
- [ ] Periodo RIPS normalizado (`rips-period`) respetado.

### Documentos clínicos

- [ ] Versionado inmutable; corrección por nueva versión con motivo.
- [ ] Firma actualiza estado documento padre (`signed`).

### IHCE

- [ ] Bundle rechazado en encuentros `documentary`.
- [ ] Trazabilidad encuentro–paciente verificada.

## Cierre del issue

- [ ] PR enlaza `Fixes #N` o `Closes #N` cuando corresponda.
- [ ] Comentario de cierre con evidencia (captura, comando de test, enlace a fila de matriz).
- [ ] Riesgo P0/P1: criterio de cierre del [risk-register](./risk-register.md) satisfecho.

**Aprobación DoD:** revisor de código + verificación de checklist en descripción del PR.
