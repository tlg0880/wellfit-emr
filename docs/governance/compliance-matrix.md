# Matriz de cumplimiento regulatorio — WellFit EMR

**Versión:** 1.0.0 · **Fecha:** 2026-05-29

Leyenda de **estado**: `Implementado` · `Parcial` · `Planificado` · `Excluido` (con justificación explícita)

Normas abreviadas en columnas: **L23** Ley 23/1981 · **R1995** Res. 1995/1999 · **R3100** Res. 3100/2019 · **L2015** Ley 2015/2020 · **R866** Res. 866/2021 · **R1888** Res. 1888/2025 · **L1581** Ley 1581/2012 · **RIPS** Res. 2275/2023 y anexos · **FE** firma electrónica (Ley 527, Dec. 2364) · **RET** retención (Res. 839/2017, Ley 594, AGN)

---

## 1. Núcleo clínico-documental

| Módulo / área | Router / ruta | Normas | Obligación clave | Estado | Evidencia en repo | Auditoría / trazabilidad | Prueba | Decisión |
|---------------|---------------|--------|------------------|--------|-------------------|--------------------------|--------|----------|
| Pacientes (MPI) | `patients`, `/patients` | L23, R1995, L1581 | Identificación única, reserva, datos demográficos | Implementado | `packages/api/src/routers/patients.ts`, UI pacientes, autofill PDF | `auditEvents` en mutaciones sensibles | `patient-pdf-autofill.test.ts`, seed | — |
| Atenciones clínicas | `encounters`, `/encounters` | L23, R1995, R3100 | Cronología, autor, sede/servicio, cierre | Implementado | Router + tabs clínicos, cierre atención | Auditoría en flujos IA y escrituras | Seed + tests RIPS | — |
| Atenciones documentales | `encounters` (`documentary`) | RIPS, L2015 | Captura sin impacto facturación/RIPS/IHCE | Implementado | `encounter_type`, filtros `rips-generator`, banners UI | Exclusión en `billingItems`/`ihceBundles` | `rips-generator.test.ts` | **Exclusión explícita** de RIPS/IHCE/facturación |
| Registros clínicos (Dx, alergias, obs, proc) | `clinicalRecords` | L23, R1995 | Registro fechado, autor, CIE10/CUPS | Implementado | Tabs en `$encounterId` | `auditEvents` | Seed narrativo | — |
| Documentos clínicos versionados | `clinicalDocuments` | L23, R1995, L2015, FE | Inmutabilidad, firma, corrección trazable | Parcial | Versiones, hash SHA-256, `sign` actualiza estado | `auditEvents` | Test listado/filtro status | **FE certificada** planificada (ver RISK-003) |
| Evolución SOAP | UI + `clinicalDocuments` | R1995 | Nota estructurada vinculada a atención | Implementado | Tab evolución en encuentro | Igual que documentos | Manual + seed | — |
| Prescripciones | `medicationOrders` | L23, Dec. 2200/2005 | Orden completa, prescriptor, trazabilidad | Implementado | Router + UI + chat tools | Canal `ai-chat` en escrituras IA | Seed | **Interacciones medicamentosas** planificadas (RISK-002) |
| Órdenes y resultados | `serviceRequests` | R1995 | Orden–resultado–anexo | Implementado | Órdenes + reportes diagnósticos | Auditoría en mutaciones | Seed | — |
| Interconsultas | `interconsultations` | R1995, L2015 | Continuidad, referencia/contrarreferencia | Implementado | Router + vistas | Auditoría | Seed | — |
| Incapacidades | `incapacityCertificates` | L23 | Contenido mínimo certificable | Implementado | Router + UI | Auditoría | Seed | — |
| Anexos binarios | `attachments` | R1995, RET | Hash, metadatos, vínculo entidad | Implementado | S3 + `binary_object` + links | Auditoría | `attachments.test.ts` | — |
| Documentos adjuntos paciente | `patientDocuments`, upload API | L1581, L23 | Custodia, resumen IA conservador | Implementado | S3, resumen, tools chat | Sin texto crudo en contexto chat | Tests summary/PDF | Resumen **no sustituye** criterio médico (UI disclaimer) |

---

## 2. Consentimiento, datos personales y acceso

| Módulo / área | Router / ruta | Normas | Obligación clave | Estado | Evidencia | Auditoría | Prueba | Decisión |
|---------------|---------------|--------|------------------|--------|-----------|-----------|--------|----------|
| Consentimiento informado | `consents` (consent_record) | L23, R3100 | Separado de autorización de datos | Implementado | Tablas y UI `/consents` | `auditEvents` | Seed | — |
| Autorización divulgación datos | `consents` (data_disclosure) | L1581 | Finalidad, revocación, trazabilidad | Implementado | Router + tab divulgaciones | Auditoría | Seed | — |
| Solicitudes copia HC (demo) | `/patient-requests` (memoria) | Ley 1751, R1995 | Entrega en plazo, trazabilidad | Parcial | Contexto React en sesión | Sin persistencia DB | Manual | **Excluido de producción** hasta persistencia y flujo formal (RISK-007) |
| Autenticación | Better Auth | L1581, R3100 | Identidad, sesión, admin usuarios | Parcial | `packages/auth`, `/admin/users` | Sesión en endpoints | Manual | **RBAC clínico** planificado (RISK-004) |

---

## 3. Regulatorio: RIPS, IHCE, facturación

| Módulo / área | Router / ruta | Normas | Obligación clave | Estado | Evidencia | Auditoría | Prueba | Decisión |
|---------------|---------------|--------|------------------|--------|-----------|-----------|--------|----------|
| Catálogos SISPRO | `ripsReference` | RIPS, R866 | Sin hardcode; vigencia catálogos | Implementado | Sync SISPRO, seed obligatorio | — | Seed sync | — |
| Exportación RIPS-FEV | `ripsExports` | RIPS, Dec. 441/2022 | JSON desde HC, validación local | Parcial | `rips-generator`, preflight, UI detalle | Links errores → atención | `rips-generator.test.ts`, `rips-preflight-validator.test.ts` | **Envío CUV/MUV producción** planificado (RISK-008) |
| Items facturación | `billingItems` | RIPS | Valores por pagador/servicio | Implementado | Tab facturación encuentro | — | Tests generador | — |
| Bundles IHCE/RDA | `ihceBundles` | L2015, R866, R1888 | RDA trazable a encuentro clínico | Parcial | Router + UI; rechazo documentary | Auditoría | Seed | **FHIR R4 API y bundles compliant** planificados (RISK-001, RISK-005) |
| Tareas regulatorias | `/regulatory-tasks` | Transversal | Panel operativo cumplimiento | Implementado | Dashboard métricas SLA | Lectura agregada | Manual | — |

---

## 4. Infraestructura, archivo y cumplimiento

| Módulo / área | Router / ruta | Normas | Obligación clave | Estado | Evidencia | Auditoría | Prueba | Decisión |
|---------------|---------------|--------|------------------|--------|-----------|-----------|--------|----------|
| Eventos auditoría | `auditEvents` | L1581, L2015, R3100 | Bitácora consultable | Parcial | Router + `/audit-events` | Creación manual/API | Seed | **Auditoría automática lecturas** planificada (RISK-006) |
| Retención documental | `retentionRecords` | RET, Res. 839 | Clase retención, legal hold | Implementado | Router + UI | Metadatos en anexos | Manual | Política institucional parametrizable en despliegue |
| Almacenamiento S3 | `storage.ts`, RustFS | L1581 | Integridad objetos, no exposición keys | Implementado | `docker-compose`, download auth | — | `patient-documents.test.ts` | Producción: cifrado reposo según proveedor cloud |
| Chat médico IA | `/api/chat`, agent tools | L1581, R3100 | Alcance paciente, sin firma auto | Implementado | Contexto server-side, tools acotadas | Canal `ai-chat` | Manual | IA **no firma** documentos; borradores solo |
| Citas | `appointments` (si aplica) | R1995 | Agenda institucional | Implementado | Rutas appointments | — | Seed | — |
| Instalaciones / profesionales | `facilities` | R3100, RIPS | REPS, sedes, TH | Implementado | CRUD completo | — | Seed | — |

---

## 5. Resumen por norma (cobertura transversal)

| Norma | Módulos que la materializan | Brecha principal | Issue / riesgo |
|-------|----------------------------|------------------|----------------|
| **Ley 1581 / protección datos** | Consentimientos, auth, auditoría, IA, S3 | RBAC fino, auditoría lectura masiva | RISK-004, RISK-006 |
| **Resolución 1995** | Pacientes, encuentros, documentos, anexos, timeline | Portal paciente persistente | RISK-007 |
| **Resolución 3100 / habilitación** | Documentos firmados, consentimientos, archivo | Evidencia habilitación empaquetada | Roadmap 60d |
| **Ley 2015 / IHCE** | Documentos, bundles, encuentros clínicos | API FHIR nacional | RISK-001, RISK-005 |
| **RIPS / FEV** | `ripsExports`, billing, catálogos | CUV/MUV producción | RISK-008 |
| **IHCE/RDA (866, 1888)** | `ihceBundles`, catálogos | Intercambio FHIR certificado | RISK-001, RISK-005 |
| **Firma electrónica** | `clinicalDocuments.sign` | Certificado + timestamp cualificado | RISK-003 |
| **Retención documental** | `retentionRecords`, anexos, política archivo | Preservación largo plazo en cloud | Roadmap 90d |

---

## 6. Exclusiones explícitas (decisiones de producto)

| ID | Alcance excluido | Motivo | Revisión |
|----|------------------|--------|----------|
| EXC-001 | Encuentros `documentary` en RIPS/IHCE/facturación | Evitar reporte administrativo de captura documental | Por release |
| EXC-002 | `/patient-requests` como sistema de producción | Solo demo en memoria de sesión | Al implementar persistencia (RISK-007) |
| EXC-003 | Firma automática por IA | Riesgo jurídico y de habilitación | Permanente salvo ADR |
| EXC-004 | Validación interacciones medicamentosas (v1) | No implementado; bloqueo manual por clínico | RISK-002 |

---

*Próxima revisión:* cierre M1 (día 30 del [roadmap](./roadmap-30-60-90.md)).
