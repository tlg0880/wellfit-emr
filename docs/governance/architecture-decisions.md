# Registro de decisiones (ADR-lite)

Decisiones técnicas y regulatorias con impacto en cumplimiento. Formato: **ADR-NNN**.

---

## ADR-001 — SSOT de gobierno en `docs/governance/`

| | |
|---|---|
| **Estado** | Aceptado |
| **Fecha** | 2026-05-29 |
| **Contexto** | README plantilla y `DEVELOPMENT_SPEC.md` con citas rotas no servían como auditoría. |
| **Decisión** | Centralizar matriz, riesgos, DoR/DoD y roadmap en `docs/governance/`; `AGENTS.md` para estado de código. |
| **Consecuencias** | PRs clínicos deben actualizar matriz; revisión trimestral programada. |

---

## ADR-002 — Encuentros documentales excluidos de RIPS/IHCE/facturación

| | |
|---|---|
| **Estado** | Aceptado |
| **Fecha** | 2026-05-28 |
| **Normas** | RIPS, L2015 |
| **Contexto** | Captura inicial/actualización documental sin acto asistencial facturable. |
| **Decisión** | `encounter_type = documentary` no alimenta `rips-generator`, `billingItems` ni `ihceBundles`. |
| **Evidencia** | `packages/api/src/services/rips-generator.ts`, routers billing/IHCE |
| **Riesgo mitigado** | Reporte administrativo indebido (matriz EXC-001) |

---

## ADR-003 — Contexto clínico de chat solo server-side

| | |
|---|---|
| **Estado** | Aceptado |
| **Fecha** | 2026-05 (implementación) |
| **Normas** | L1581 |
| **Decisión** | Cliente envía solo `selectedPatientId`; servidor construye contexto desde DB. |
| **Consecuencias** | Menor fuga de datos; IA no firma documentos (borradores). |

---

## ADR-004 — RIPS sin placeholders en generación

| | |
|---|---|
| **Estado** | Aceptado |
| **Fecha** | 2026-05-26 |
| **Normas** | RIPS |
| **Decisión** | `RipsGenerationError` con issues accionables; fallar antes de persistir payload inválido. |
| **Evidencia** | `rips-generator.test.ts`, UI errores con enlaces a atención |

---

## ADR-005 — Consentimiento clínico ≠ autorización de datos (modelo separado)

| | |
|---|---|
| **Estado** | Aceptado (diseño) |
| **Normas** | L23, L1581 |
| **Decisión** | Tablas y flujos UI separados en router `consents`. |
| **Referencia** | `DEVELOPMENT_SPEC.md` § requisitos |

---

## Pendientes de ADR (disparadores)

| Tema | Disparador | Riesgo |
|------|------------|--------|
| Proveedor firma digital | Selección PKI institucional | RISK-003 |
| Estrategia FHIR (REST vs bundle-only) | Inicio M3 | RISK-001 |
| Motor interacciones medicamentosas | Licencia/API ATC | RISK-002 |

Nuevas ADR: PR con sección en este archivo + enlace desde issue.
