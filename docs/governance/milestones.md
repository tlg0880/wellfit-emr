# Hitos y trazabilidad normativa

Cada hito enlaza **normas**, **riesgos** y **evidencia** esperada. Los issues de GitHub deben usar prefijo de milestone en título o etiqueta `milestone:M*`.

---

## M0 — Gobierno técnico y matriz de cumplimiento ✅

| Campo | Valor |
|-------|-------|
| **Issue** | [#1](https://github.com/tlg0880/wellfit-emr/issues/1) |
| **Fecha objetivo** | 2026-05-29 |
| **Normas** | Transversal (marco L23, R1995, L2015, L1581, RIPS, IHCE) |
| **Riesgos tratados** | Identificación P0/P1 (registro inicial) |
| **Evidencia** | `docs/governance/*`, `.github/ISSUE_TEMPLATE/*`, CI, README, `DEVELOPMENT_SPEC.md` depurado |
| **Métricas** | Matriz versionada; DoR/DoD; roadmap 30/60/90 |

---

## M1 — Trazabilidad y acceso paciente (día 30)

| Campo | Valor |
|-------|-------|
| **Normas** | Ley 1751, R1995, L1581 |
| **Riesgos** | RISK-006, RISK-007, RISK-009 |
| **Evidencia** | Middleware auditoría; router solicitudes HC; env IA documentado |
| **Criterio de cierre** | DoD en [definition-of-done.md](./definition-of-done.md); filas matriz actualizadas |

---

## M2 — Seguridad clínica y prescripción (día 60)

| Campo | Valor |
|-------|-------|
| **Normas** | R3100, Dec. 2200/2005, L1581 |
| **Riesgos** | RISK-002, RISK-004 |
| **Evidencia** | RBAC; servicio interacciones; export habilitación |
| **Criterio de cierre** | Tests denegación rol; alerta prescripción documentada |

---

## M3 — Interoperabilidad y RIPS producción (día 90)

| Campo | Valor |
|-------|-------|
| **Normas** | L2015, R866, R1888, RIPS (2275), FE |
| **Riesgos** | RISK-001, RISK-003, RISK-005, RISK-008 |
| **Evidencia** | API FHIR MVP; validador IHCE; CUV en export; piloto firma |
| **Criterio de cierre** | ADR por cada P0 cerrado o diferido firmado |

---

## Plantilla para hitos futuros (M4+)

```markdown
## M{N} — {nombre}

| Campo | Valor |
|-------|-------|
| **Normas** | |
| **Riesgos** | |
| **Evidencia** | |
| **Issues** | |
| **Criterio de cierre** | |
```

Al crear M4+, copiar plantilla y enlazar desde [roadmap-30-60-90.md](./roadmap-30-60-90.md).
