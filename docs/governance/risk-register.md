# Registro de riesgos técnico-regulatorios

**Versión:** 1.0.0 · **Fecha:** 2026-05-29

Escala de severidad: **P0** crítico (bloqueo producción / exposición legal alta) · **P1** alto · **P2** medio · **P3** bajo

| ID | Riesgo | Sev. | Prob. | Dueño | Fecha objetivo | Evidencia esperada de cierre | Issue GitHub | Estado |
|----|--------|------|-------|-------|----------------|------------------------------|--------------|--------|
| RISK-001 | Ausencia de API FHIR R4 para interoperabilidad nacional (Res. 866/1888) | P0 | Alta | Arquitectura / Interoperabilidad | 2026-08-29 | Endpoints FHIR documentados, pruebas contra perfiles RDA, ADR publicado | [#10](https://github.com/tlg0880/wellfit-emr/issues/10) | Abierto |
| RISK-002 | Sin validación de interacciones medicamentosas en prescripción | P0 | Media | Producto clínico / Farmacia | 2026-07-30 | Reglas o integración ATC con bloqueo/alerta documentado y tests | [#11](https://github.com/tlg0880/wellfit-emr/issues/11) | Abierto |
| RISK-003 | Firma de documentos sin certificado digital ni timestamp cualificado | P0 | Alta | Seguridad / Cumplimiento | 2026-08-15 | Flujo firma con proveedor PKI, evidencia no repudio, actualización matriz | [#12](https://github.com/tlg0880/wellfit-emr/issues/12) | Abierto |
| RISK-004 | Autorización solo por sesión Better Auth; sin RBAC clínico por rol/finalidad | P1 | Alta | Seguridad | 2026-07-15 | Middleware roles, matrices en matriz cumplimiento, tests acceso denegado | [#13](https://github.com/tlg0880/wellfit-emr/issues/13) | Abierto |
| RISK-005 | Bundles IHCE no validados como FHIR R4 conformes | P1 | Media | Interoperabilidad | 2026-08-29 | Validador FHIR + ejemplos RDA aprobados por perfil | [#14](https://github.com/tlg0880/wellfit-emr/issues/14) | Abierto |
| RISK-006 | Auditoría de lecturas de datos sensibles no automática en todos los routers | P1 | Media | Seguridad / Backend | 2026-07-01 | Middleware auditoría lectura, muestra en `/audit-events` | [#15](https://github.com/tlg0880/wellfit-emr/issues/15) | Abierto |
| RISK-007 | Portal/solicitudes copia HC solo en memoria (demo) | P1 | Media | Producto / Archivo clínico | 2026-06-30 | Persistencia DB, plazos Ley 1751, trazabilidad entrega | [#16](https://github.com/tlg0880/wellfit-emr/issues/16) | Abierto |
| RISK-008 | RIPS sin envío a MUV ni obtención de CUV en producción | P1 | Alta | Facturación / RIPS | 2026-08-01 | Integración API Docker/cliente-servidor, registro `cuv` en export | [#17](https://github.com/tlg0880/wellfit-emr/issues/17) | Abierto |
| RISK-009 | Modelo IA y proveedor no configurables por entorno | P2 | Media | Plataforma | 2026-06-15 | Variables env documentadas, sin hardcode en agent | — | Abierto |
| RISK-010 | Timestamps inconsistentes en tablas clínicas legacy | P2 | Baja | Backend | 2026-09-01 | Migración `createdAt`/`updatedAt` homogénea | — | Abierto |

> **Issues P0/P1:** #10–#17 (creados 2026-05-29). Usar plantillas *Seguridad*, *Interoperabilidad* o *Bug regulatorio* para trabajo derivado.

## Criterios de cierre por severidad

| Sev. | Criterio mínimo de cierre |
|------|---------------------------|
| P0 | Implementación verificada + prueba automatizada o evidencia de certificación externa + matriz actualizada + ADR si aplica |
| P1 | Implementación + prueba + documentación en `docs/governance` + revisión en PR con enlace al riesgo |
| P2 | Issue cerrado con evidencia en repo o exclusión documentada en matriz |
| P3 | Aceptación explícita en milestone o diferido con fecha |

## Mitigaciones transitorias (M0)

| ID | Mitigación actual |
|----|-------------------|
| RISK-001 | Bundles JSON internos; catálogos SISPRO; exclusión encuentros documentales |
| RISK-002 | Validación campos prescripción; revisión humana obligatoria |
| RISK-003 | Firma lógica con hash y estado `signed`; sin PKI |
| RISK-004 | Auth en layout `_authenticated`; admin plugin |
| RISK-005 | Creación bundle por atención clínica con validaciones de negocio |
| RISK-006 | `auditEvents` en escrituras y canal IA; listado manual |
| RISK-007 | Disclaimer UI sesión; flujo demo para capacitación |
| RISK-008 | Generación + preflight local; UI errores accionables |

## Issues de seguimiento (P0/P1)

| Riesgo | Issue |
|--------|-------|
| RISK-001 | [#10](https://github.com/tlg0880/wellfit-emr/issues/10) |
| RISK-002 | [#11](https://github.com/tlg0880/wellfit-emr/issues/11) |
| RISK-003 | [#12](https://github.com/tlg0880/wellfit-emr/issues/12) |
| RISK-004 | [#13](https://github.com/tlg0880/wellfit-emr/issues/13) |
| RISK-005 | [#14](https://github.com/tlg0880/wellfit-emr/issues/14) |
| RISK-006 | [#15](https://github.com/tlg0880/wellfit-emr/issues/15) |
| RISK-007 | [#16](https://github.com/tlg0880/wellfit-emr/issues/16) |
| RISK-008 | [#17](https://github.com/tlg0880/wellfit-emr/issues/17) |
