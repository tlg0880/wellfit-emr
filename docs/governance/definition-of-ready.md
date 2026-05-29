# Definition of Ready (DoR) — trabajo clínico y regulatorio

Un ítem (issue, historia o tarea técnica) está **listo para desarrollo** cuando cumple **todos** los criterios aplicables según su tipo.

## Criterios universales

- [ ] Título y descripción en español claro (usuario/rol, necesidad, resultado esperado).
- [ ] Enlaza al menos una **norma** o **riesgo** en [compliance-matrix.md](./compliance-matrix.md) o [risk-register.md](./risk-register.md).
- [ ] Identifica **módulos** afectados (router oRPC, ruta web, servicio).
- [ ] Criterios de aceptación verificables (no ambiguos).
- [ ] Impacto en **auditoría** declarado (¿nuevo evento?, ¿lectura sensible?).
- [ ] Impacto en **datos personales** declarado (¿datos sensibles?, ¿nueva finalidad?).
- [ ] Sin dependencias bloqueantes sin plan (API externa, credenciales, catálogo).
- [ ] Etiquetas de plantilla correctas (seguridad, UX clínica, interoperabilidad, etc.).

## Criterios adicionales — funcionalidad clínica

- [ ] Flujo asistencial descrito (antes / durante / después de la atención).
- [ ] Roles que interactúan (médico, enfermería, archivo, etc.) — aunque RBAC fino esté pendiente.
- [ ] Comportamiento ante **encuentro documental** vs **clínico** definido si aplica.
- [ ] Catálogos SISPRO requeridos listados (tabla `ripsReference`).
- [ ] Estados del registro (borrador, firmado, cerrado, revocado) definidos.

## Criterios adicionales — regulatorio (RIPS / IHCE / retención)

- [ ] Operación RIPS o tipo RDA especificado con referencia a skill `.agents/skills/rips-generation-validation` si aplica.
- [ ] Reglas RVG/RVC o perfil FHIR afectados identificados.
- [ ] Evidencia de prueba: archivo de test existente o nuevo (`*.test.ts`) nombrado.
- [ ] Comportamiento ante datos faltantes: **fallar con errores accionables**, no placeholders (patrón `RipsGenerationError`).

## Criterios adicionales — seguridad y datos

- [ ] Modelo de amenaza breve (confidencialidad, integridad, disponibilidad).
- [ ] Autenticación/autorización en **cada** mutación server-side considerada.
- [ ] Sin exposición de secretos, keys S3 ni texto clínico completo en logs.

## Criterios adicionales — UX clínica

- [ ] Wireframe o descripción de estados: carga, vacío, error, éxito.
- [ ] Copy en español (Colombia); códigos RIPS traducidos o con etiqueta legible.
- [ ] Accesibilidad mínima: labels, foco, mensajes de error asociados a campos.

## Excepciones

Si un ítem es **spike** de investigación (< 2 días), puede omitir criterios de prueba a cambio de entregable: nota en `docs/governance/architecture-decisions.md` o comentario en issue con hallazgos.

**Aprobación DoR:** autor del issue + una revisión de *Cumplimiento* o *Arquitectura* (comentario explícito en GitHub).
