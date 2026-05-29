# Roadmap 30 / 60 / 90 días

**Inicio de referencia:** 2026-05-29 (cierre M0)  
**Objetivo:** Pasar de gobierno documentado a evidencia operativa auditable en entorno pre-producción.

---

## Días 1–30 — Consolidación y trazabilidad

| Entrega | Normas / riesgos | Evidencia |
|---------|------------------|-----------|
| CI obligatorio en PR (`check-types`, ultracite) | R3100 (procesos) | `.github/workflows/ci.yml` verde |
| Cerrar RISK-006: middleware auditoría lecturas en routers clínicos prioritarios | L1581, L2015 | Tests + muestras en `/audit-events` |
| Cerrar RISK-007: persistencia solicitudes copia HC | Ley 1751, R1995 | Router + migración + UI sin disclaimer sesión |
| Variables IA por entorno (RISK-009) | L1581 | `.env.example`, `packages/api/src/ai/agent.ts` |
| Homologar timestamps tablas críticas (inicio RISK-010) | RET, trazabilidad | Migración Drizzle documentada |
| Revisión matriz cumplimiento post-implementación | Transversal | PR actualiza `compliance-matrix.md` |

**Hito M1:** 100% P1 con plan de sprint asignado; 0 módulos clínicos sin fila en matriz.

---

## Días 31–60 — Seguridad y prescripción

| Entrega | Normas / riesgos | Evidencia |
|---------|------------------|-----------|
| RBAC clínico mínimo (RISK-004) | L1581, R3100 | Tablas rol/permiso o middleware + tests denegación |
| Alertas interacciones medicamentosas v1 (RISK-002) | Dec. 2200/2005 | Servicio + bloqueo/override auditado |
| Paquete evidencia habilitación (export auditoría, políticas retención) | R3100, RET | Script o vista export PDF/JSON |
| Mejora portal paciente (si no cerrado en 30d) | Ley 1751 | SLA 5 días, acuse entrega |
| Pruebas integración seed ampliadas RIPS | RIPS | Benchmark + regresión en CI |

**Hito M2:** Matriz con ≥80% ítems *Implementado* en núcleo clínico-documental; P0 restantes con fecha < día 90.

---

## Días 61–90 — Interoperabilidad y producción RIPS

| Entrega | Normas / riesgos | Evidencia |
|---------|------------------|-----------|
| Diseño + MVP API FHIR R4 (RISK-001) | L2015, R866, R1888 | ADR + endpoints lectura/Composition |
| Validador bundles IHCE FHIR (RISK-005) | R1888 | Tests con perfiles oficiales |
| Integración envío MUV / CUV (RISK-008) | RIPS, Res. 2275 | Campo `cuv` poblado en export `sent` |
| Piloto firma electrónica (RISK-003) | FE, R3100 | Integración PKI staging |
| Plan preservación largo plazo S3/archivo | RET, Ley 594 | ADR + configuración backup/archive |
| Auditoría externa simulada (checklist R3100) | R3100 | Informe en `docs/governance/` |

**Hito M3:** Listo para piloto institucional con lista de exclusiones residuales firmada por cumplimiento.

---

## Dependencias externas

| Dependencia | Impacto en roadmap |
|-------------|-------------------|
| Credenciales IHCE / MinSalud | Días 61–90 |
| Proveedor firma digital | Día 75+ |
| Catálogo interacciones (ATC) | Día 31–60 |
| Ambiente MUV (Docker/API) | Día 61–90 |

---

Cada ítem de sprint debe citar: **norma** → fila en [compliance-matrix.md](./compliance-matrix.md); **riesgo** → [risk-register.md](./risk-register.md); **evidencia** → [milestones.md](./milestones.md).
