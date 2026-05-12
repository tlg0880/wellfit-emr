# WellFit EMR — Contexto del proyecto

> **Regla para agentes:** Si realizas cualquier avance funcional, arquitectónico o de implementación en este proyecto, debes actualizar este archivo `AGENTS.md` para reflejar el nuevo estado. No dejes el documento desactualizado.

Historia Clínica Electrónica conforme con la normativa colombiana. Diseñada para cumplir con: Ley 23 de 1981, Resolución 1995 de 1999, Ley 2015 de 2020 (HCE interoperable), Resolución 866 de 2021, Resolución 1888 de 2025 (IHCE/RDA), Ley 1581 de 2012 (protección de datos), Decreto 780 de 2016 (habilitación), y regulación de RIPS.

## Stack

- **Monorepo**: Turborepo + Bun
- **Frontend**: React 19 + Vite + Tanstack Router (file-based) + Tailwind CSS v4
- **API**: oRPC (similar a tRPC) + Hono + Zod
- **DB**: SQLite (libsql) + Drizzle ORM
- **Auth**: Better Auth (email/password, admin plugin)
- **IA médica**: AI SDK v6 + ToolLoopAgent + proveedor server-side configurado en `packages/api/src/ai/agent.ts` + Streamdown para chat clínico con streaming, herramientas server-side y contexto de paciente construido desde la DB.
- **UI**: Componentes custom basados en `@base-ui/react` (shadcn-like), estilo cuadrado/angular (`rounded-none`). Incluye `SearchSelect` (búsqueda con dropdown) para reemplazar inputs de ID crudos y seleccionar entidades de catálogos RIPS. Los formularios de pacientes, prescripciones, atenciones y otros usan catálogos SISPRO en vivo. La revisión transversal de formularios cubre edición de pacientes, creación de atenciones, detalle de atenciones (diagnósticos CIE10/tipo diagnóstico, procedimientos CUPS/profesionales), sedes/unidades de servicio y anexos para evitar IDs/códigos manuales cuando existe fuente consultable.

## Arquitectura de rutas (frontend)

File-based routing con Tanstack Router. Las rutas públicas están en `apps/web/src/routes/`. Las rutas protegidas viven bajo `_authenticated/` y heredan el layout con guard de autenticación (`beforeLoad` que redirige a `/login`). El `AppShell` (sidebar + main) se renderiza únicamente en el layout `_authenticated.tsx`; las rutas públicas como `/login` usan su propio layout independiente.

Patrón de oRPC en este proyecto:

```tsx
import { useQuery, useMutation } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

// Query
const { data } = useQuery(orpc.patients.list.queryOptions({ input: { limit: 25, offset: 0 } }));

// Query con options adicionales
const { data } = useQuery({ ...orpc.patients.get.queryOptions({ input: { id } }), enabled: !!id });

// Mutation
const mutation = useMutation({ ...orpc.patients.create.mutationOptions(), onSuccess: () => { ... } });
```

## Estado de implementación

### Backend routers (oRPC) existentes

- `patients` — CRUD + list paginado
- `encounters` — CRUD + list + close
- `clinicalRecords` — create/list de diagnosis, allergy, observation, procedure
- `clinicalDocuments` — create/get/list/sign/correct con versionado inmutable, secciones y hash SHA-256
- `consents` — consent_record (create/list/revoke) + data_disclosure_authorization (create/list/revoke)
- `medicationOrders` — medication_order (create/list) + medication_administration (create/list)
- `serviceRequests` — service_request (create/list) + diagnostic_report (create/get)
- `interconsultations` — create/list/respond
- `incapacityCertificates` — create/list
- `attachments` — binary_object (create) + attachment_link (create/list)
- `auditEvents` — create/list con filtros
- `ripsExports` — create/list
- `ihceBundles` — create/list
- `facilities` — organizations, sites, serviceUnits, practitioners. Los listados de sedes y unidades de servicio aplican filtros de búsqueda además del alcance por organización/sede.
- `admin` — gestión de usuarios (Better Auth admin plugin)
- `ripsReference` — catálogos SISPRO (list tables/entries, sync). `listEntries` filtra por tabla y agrupa correctamente la búsqueda por código/nombre para no mezclar resultados de otras tablas. La sincronización RIPS usa condiciones Drizzle estructuradas para búsquedas por tabla/código y conteos.

### Endpoint IA / Chat médico

- `apps/server/src/chat.ts` expone `POST /api/chat` con autenticación Better Auth, valida mensajes `UIMessage`, usa `createAgentUIStreamResponse` con `ToolLoopAgent`, y ejecuta el modelo server-side definido en `packages/api/src/ai/agent.ts`. El endpoint mantiene el protocolo de AI SDK UI para `DefaultChatTransport` y añade headers anti-buffering (`Content-Encoding: none`, `X-Accel-Buffering: no`) para preservar streaming. `apps/server/src/index.ts` exporta la configuración de Bun con `idleTimeout: 120` para que las respuestas largas del agente no sean cortadas por el timeout idle por defecto de 10 segundos.
- El cliente solo envía `selectedPatientId`; el servidor construye el contexto clínico desde la base de datos (datos demográficos, alergias activas, medicamentos y atenciones recientes). No se confía en contexto clínico textual enviado por el navegador.
- Las herramientas del agente viven en `packages/api/src/ai/agent.ts`: búsqueda/consulta de pacientes, atenciones, diagnósticos, alergias, observaciones, medicamentos, procedimientos, atención activa, profesionales, catálogos RIPS/SISPRO, timeline clínico, revisión de seguridad clínica, documentos clínicos, órdenes de servicio/resultados, interconsultas, incapacidades, consentimientos y anexos.
- Las herramientas quedan limitadas al paciente seleccionado cuando existe `selectedPatientId`; las consultas por `encounterId` verifican pertenencia al paciente. Las escrituras clínicas disponibles desde el chat incluyen creación de prescripciones, diagnósticos, observaciones/signos vitales, procedimientos CUPS, órdenes de servicio, interconsultas, incapacidades y borradores de documentos clínicos. Estas herramientas validan paciente/atención/profesional cuando aplica y registran eventos de auditoría en canal `ai-chat`; los documentos creados por IA quedan como borradores y no se firman automáticamente. Todas las herramientas están envueltas con observabilidad server-side (`started`, `completed`, `failed`) para evitar fallas silenciosas, y los errores de stream/tool se exponen al cliente mediante los estados de AI SDK UI.

### Backend routers PENDIENTES

_Ninguno. Todos los routers planificados están implementados._

### Cambios recientes (2026-05-12)

- **Iteración 7 — Bordes semánticos en stat cards, gradiente en tabla y pills en sidebar**: Séptima ronda de refinamiento visual enfocada en color semántico y jerarquía visual.
  - **Stat cards con bordes semánticos**: Cada tarjeta de estadísticas del dashboard ahora tiene un borde izquierdo (`border-l-4`) cuyo color coincide con su significado semántico: `teal` para pacientes, `sky` para atenciones del mes, `amber` para atenciones activas y `slate` para profesionales. Esto hace que el dashboard sea más escaneable visualmente.
  - **Gradiente en header de tabla**: El header de `DataTable` cambió de `bg-muted/80` plano a `bg-gradient-to-b from-muted/90 to-muted/70`, creando una transición suave que añade profundidad visual.
  - **Pills en sidebar**: Los títulos de grupo de navegación (PRINCIPAL, CLÍNICO, DOCUMENTAL, REGULATORIO) ahora tienen un fondo pill (`rounded-md bg-sidebar-accent/40 px-2 py-0.5`) en lugar de texto plano, mejorando la organización visual de la navegación.
- **Iteración 6 — Toolbars unificadas y efectos hover elevados**: Sexta ronda de refinamiento visual enfocada en la organización de controles de tabla y micro-interacciones.
  - **Toolbar unificada para pacientes**: Todos los controles de tabla (búsqueda, ordenamiento, dirección) ahora se agrupan en un único contenedor `rounded-lg border bg-card shadow-sm px-3 py-2.5`. Los controles internos usan `bg-background` para crear jerarquía visual dentro del toolbar.
  - **Toolbar unificada para atenciones**: Similar al de pacientes, los filtros de estado (segmented control), selector de sede, botón de limpiar y búsqueda ahora viven dentro de una sola tarjeta toolbar unificada. Esto elimina la dispersión visual de controles flotantes.
  - **Efectos hover en dashboard**: Las tarjetas de estadísticas ahora tienen `hover:-translate-y-px hover:shadow-md` con transición suave. Los items de "Accesos rápidos" también tienen efecto hover elevado (`hover:-translate-y-px hover:shadow-md`) para dar feedback táctil al usuario.
- **Iteración 5 — Indicadores de navegación, topbar y skeletons refinados**: Quinta ronda de refinamiento visual enfocada en detalles de navegación, elevación y estados de carga.
  - **Sidebar active indicator mejorado**: Reemplazado el indicador de estado activo cuadrado (`h-1.5 w-1.5`) por un dot redondeado (`rounded-full`). Agregada una barra de acento izquierda (`w-0.5 h-5 bg-sidebar-primary`) que aparece al lado del ícono cuando el ítem está activo, creando una señal de navegación más profesional y legible.
  - **Topbar elevado**: Agregado `shadow-sm` y `backdrop-blur-md` al topbar. El fondo cambió de `bg-card/50` a `bg-card/80` para mayor opacidad y mejor separación visual del contenido. El borde ahora usa `border-border/60`.
  - **Page header mejorado**: Agregado `shadow-sm` y `backdrop-blur-md`. El borde usa `border-border/60` y el fondo es `bg-card/90` para mayor presencia visual.
  - **Skeleton global mejorado**: Reemplazado `rounded-none` por `rounded-sm` y `bg-muted` por `bg-muted/70`, creando skeletons más suaves y consistentes con el resto de la interfaz.
- **Iteración 4 — Esquinas redondeadas en elementos interactivos globales**: Cuarta ronda de refinamiento visual que afecta a todos los botones, inputs y selects de la aplicación.
  - **Button global mejorado**: Reemplazado `rounded-none` por `rounded-sm` en el estilo base de todos los botones. Los tamaños `xs` y `sm` también usan `rounded-sm`. Los botones de icono (`icon-xs`, `icon-sm`, `icon-lg`) usan `rounded-md` para un aspecto más amigable. Esto elimina las esquinas angulares agresivas en todo el sistema.
  - **Input global mejorado**: Reemplazado `rounded-none` por `rounded-sm` en el componente `Input` de `@wellfit-emr/ui`. Todos los campos de texto ahora tienen esquinas suaves coherentes con los botones.
  - **Select global mejorado**: El trigger ahora usa `rounded-sm` en lugar de `rounded-none`. El popup/dropdown usa `rounded-md` y `shadow-lg` (mayor elevación) en lugar de `rounded-none` con `ring-1`, creando un dropdown más moderno y con mejor separación visual.
- **Iteración 3 — Sombras, profundidad y estados vacíos mejorados**: Tercera ronda de refinamiento visual enfocada en elevación, bordes redondeados y estados de carga/vacío.
  - **Componente Card global mejorado**: Reemplazado `ring-1 ring-foreground/10` por `rounded-md border border-border/60 shadow-sm` en `packages/ui/src/components/card.tsx`. Las tarjetas ahora tienen bordes redondeados sutiles, sombra suave y borde semitransparente. En dark mode la sombra se desactiva para mantener coherencia.
  - **List items del dashboard mejorados**: Los iconos de atenciones/pacientes ahora usan contenedores `size-10 rounded-md` con `shadow-sm` en lugar de `size-9` planos. Mayor presencia visual y mejor jerarquía. Padding aumentado a `p-3.5` y bordes redondeados `rounded-lg`.
  - **Empty state rediseñado**: Ahora usa borde punteado (`border-dashed border-border/80`), fondo `bg-card/30`, contenedor de icono `size-14 rounded-xl`, y padding aumentado. Se integra visualmente como una tarjeta vacía en lugar de texto flotante.
  - **Paginación de DataTable mejorada**: El contenedor de paginación ahora usa `rounded-lg border bg-card shadow-sm`. Los botones de navegación tienen hover states `hover:bg-primary/10 hover:text-primary` para feedback visual.
- **Iteración 2 — Controles de acción y filtros profesionalizados**: Segunda ronda de mejoras visuales enfocada en botones de acción, filtros y controles de tabla.
  - **Botones de acción en tablas**: Los iconos de Ver/Editar/Eliminar en `/patients` y `/encounters` ahora usan hover states de color temático: teal para "Ver", ámbar para "Editar", rojo para "Eliminar`. Esto da feedback visual inmediato sobre la acción que cada botón realiza.
  - **CTAs mejorados**: Los botones "Nuevo paciente" y "Nueva atención" ahora usan `gap-1.5 shadow-sm` para darles más presencia visual.
  - **Barras de búsqueda rediseñadas**: Los inputs de búsqueda ahora viven dentro de contenedores `rounded-md border bg-card` que agrupan el icono de lupa, el input sin bordes internos, y el botón de limpiar en una sola unidad visual.
  - **Filtros de estado tipo segmented control**: En `/encounters`, los botones de filtro (Todas, En progreso, Finalizadas, Canceladas) se agrupan en un contenedor `rounded-md border bg-card p-0.5` con estilo de control segmentado: el activo usa `bg-primary text-primary-foreground shadow-sm` y los inactivos son texto atenuado con hover.
  - **Compliance summary mejorado**: Los items del resumen regulatorio ahora usan fondos de color semitransparente (`bg-{color}-50/50`) con bordes temáticos y contenedores de icono cuadrados, creando tarjetas de alerta visualmente distinguibles.
- **Iteración 1 — Rediseño visual profesional de interfaz hospitalaria**: Actualización masiva del tema visual para que la aplicación luzca como un EMR hospitalario profesional.
  - **Paleta de colores médica**: Cambio del tema primario de gris neutro a teal/cyan médico (`oklch(0.52 0.13 180)`), con ajustes en `--sidebar`, `--accent`, `--ring`, `--chart-*` y variantes dark mode. El fondo ahora usa un blanco ligeramente cálido con tinte azulado (`oklch(0.99 0.001 240)`) para reducir fatiga visual.
  - **Sidebar rediseñado**: Nuevo header con icono `HeartPulse` en contenedor de color primario, subtítulo "Sistema Hospitalario", navegación con indicadores de estado activo (punto teal + fondo sutil), anchos ajustados (`w-60` expandido / `w-16` colapsado), padding mejorado, y footer con versión y referencia regulatoria. Los grupos de navegación usan tracking más ancho y separación visual superior.
  - **Topbar refinado**: Fondo `bg-card/50` con `backdrop-blur-sm`, separadores verticales sutiles, y el logo móvil usa `bg-primary` en lugar de `bg-slate-900`.
  - **Dashboard mejorado**: Tarjetas de estadísticas con borde izquierdo primario, iconos en contenedores de color temático (teal, sky, amber, slate), y etiquetas más pequeñas con tracking uppercase. Listados de atenciones/pacientes con iconos de color temático (teal para atenciones, sky para pacientes), bordes redondeados (`rounded-md`), y efectos hover `hover:bg-primary/5 hover:border-primary/20 hover:shadow-sm`. Accesos rápidos con iconos en contenedores `bg-primary/10 text-primary`.
  - **Tablas profesionalizadas**: Headers con texto uppercase tracking-wider, padding aumentado (`px-4 py-3`), cuerpo con divisores sutiles (`divide-y divide-border/60`), zebra striping (`bg-muted/30` en filas impares), y hover states mejorados. Bordes redondeados y sombra sutil en el contenedor de tabla.
  - **Badges de estado rediseñados**: En `/encounters` los badges ahora son pills redondeadas (`rounded-full`) con dot indicator de color y fondo semitransparente temático (teal para "Finalizada", amber para "En progreso").
  - **Login actualizado**: Panel izquierdo cambia de `bg-slate-900` a `bg-teal-900`, con textos en tonos teal más claros. Botón de registro usa el nuevo color primario teal.
  - **Empty state y page header mejorados**: Empty state usa icono en contenedor `bg-primary/10 text-primary`. Page header usa `bg-card/80 backdrop-blur-sm`, título más grande (`text-xl`), breadcrumbs con hover `text-primary`, y separadores visuales.
- **Fix estabilidad en detalle de solicitudes y consentimientos**: Corregido orden de hooks en `/patient-requests/$requestId` y `/consents/$consentId` para evitar la violación de reglas de React Hooks cuando la vista alterna entre estados de carga/error/datos. Los `useEffect` de `document.title` ahora se ejecutan de forma consistente en todos los renders y mantienen cleanup al desmontar.
- **Fix edición de solicitudes de copia** (`/patient-requests`): El formulario de edición ya no reinicia automáticamente `status` ni `deadline` al guardar. En modo edición se preservan los valores existentes de estado/fecha límite, y `patientName` conserva el valor previo si el paciente no está en el subconjunto cargado del selector.
- **Fix actualización de estado en detalle de solicitud** (`/patient-requests/$requestId`): El `Select` de estado ahora actualiza estado local y la mutación se ejecuta únicamente al presionar "Actualizar", evitando llamadas duplicadas y posibles sobrescrituras con valores stale.
- **Hardening UX de eliminación + limpieza de lint**: Reemplazadas confirmaciones bloqueantes `confirm()` por patrón de confirmación en dos pasos con timeout en `/consents/$consentId`, `/patient-requests/$requestId` y `/patient-requests`. Se refactorizó `CommandPalette` para reducir complejidad cognitiva del manejo de teclado, estabilizar dependencias de hooks y mantener navegación por atajos sin regresiones. También se corrigieron detalles de lint/format en `page-header`, `sidebar` y componentes UI relacionados.
- **Limpieza transversal de calidad (repo completo)**: Ejecutada limpieza global con Ultracite (`fix` + `check`) y ajustes manuales de accesibilidad/tipos en rutas críticas (modales de citas/medicamentos/órdenes, formularios de participantes, detail de documentos clínicos, consultas de consentimientos y tipado en router de `medication-orders`). El repo queda con `bun x ultracite check` y `tsc` en verde. Se añadió override en `biome.jsonc` para desactivar `suspicious/noAlert` en rutas frontend, manteniendo el resto de reglas activas.

### Cambios recientes (2026-05-11)

- **Fix título de pestaña en detalle de anexos** (`/attachments/$attachmentId`): Corregido `useEffect` que actualiza `document.title` a `'Anexo: {title}'` cuando los datos del attachment se cargan exitosamente, a `'Anexo no encontrado | WellFit EMR'` cuando hay error, y a `'WellFit EMR'` durante carga. Se restablece `'WellFit EMR'` al desmontar el componente. La versión anterior solo actualizaba el título en el caso de éxito, dejando el título previo en estados intermedios de carga/error. Esto satisface completamente VAL-ATTACH-018.

### Cambios recientes (2026-05-11)

- **Fix detalle de anexos** (`/attachments/$attachmentId`): Reemplazado el hack roto de `listLinks`+`find` por `orpc.attachments.getLink` y `orpc.attachments.getBinaryObject`. La página ahora muestra: título en encabezado, clasificación, entidad vinculada con hipervínculo a la ruta de detalle correspondiente (paciente, atención, profesional, organización, documento clínico), fecha de captura formateada `es-CO`, tipo MIME, tamaño legible, hash SHA-256 en fuente monoespaciada, ubicación de almacenamiento, clase de retención y referencia de clave cifrada. Estados de carga con skeletons. Error "Anexo no encontrado" para IDs inválidos sin crash. Falla en carga de metadatos binarios manejada graciosamente: tarjeta de link aún visible, campos binarios muestran indicador de error. Navegación de regreso al listado sin recarga completa. Agregado `onRowClick` en tabla de anexos para navegar al detalle. Satisface VAL-ATTACH-001 a VAL-ATTACH-018.

### Cambios recientes (2026-05-11)

- **Fix firma de documentos clínicos** (`packages/api/src/routers/clinical-documents.ts`): Corregido `signDocumentProcedure` para actualizar el `status` del documento padre de `'draft'` a `'signed'` tras firmar exitosamente la versión actual. Antes solo actualizaba `clinicalDocumentVersion.signedAt`/`signedByUserId` sin cambiar el estado del documento, lo que causaba que el contador "Firmas pendientes" del dashboard regulatorio nunca decreciera. Se agregó una única sentencia `update(clinicalDocument).set({ status: 'signed' })` después de la actualización de versión, dentro del mismo flujo protegido. Esto satisface VAL-REGTASKS-042 y VAL-REGTASKS-043: al firmar un documento borrador, el métrico de firmas pendientes se actualiza correctamente y la lista de documentos refleja el nuevo estado.

### Cambios recientes (2026-05-11)

- **Fix persistencia de solicitudes del paciente** (`/patient-requests`): Movido el estado de `useState` local del componente a un `PatientRequestsContext` (`apps/web/src/contexts/patient-requests-context.tsx`) envuelto en el layout `_authenticated.tsx`. El contexto provee estado de requests (`requests`), expand/collapse (`expandedId`), creación (`addRequest`) y transiciones de estado (`updateRequestStatus`), con hooks `useCallback` para estabilidad. La página `/patient-requests` consume el contexto mediante `usePatientRequests()`. Esto corrige VAL-PATREQ-024: las solicitudes ahora sobreviven a la navegación intra-sesión (por ejemplo, ir a `/patients` y volver) y solo se pierden al recargar la página, como estaba originalmente diseñado. Se preserva toda la funcionalidad existente: formulario de creación, validación Zod, transiciones de estado, cálculo de fecha límite, orden descendente y disclaimer de sesión.

### Cambios recientes (2026-05-11)

- **Nueva vista: Solicitudes del paciente** (`/patient-requests`): Workflow de demostración en memoria para solicitudes de copia de historia clínica. Incluye: selección de paciente mediante `SearchSelect` con búsqueda debounced contra `patients.list`; formulario con alcance (Completa/Parcial/Resumen), canal de entrega (Físico/Correo electrónico/Portal del paciente), solicitante, base legal (Ley 23 de 1981, Ley 1581 de 2012, Resolución 1995 de 1999, etc.) y notas opcionales; validación con `@tanstack/react-form` + Zod en español; fecha límite auto-calculada como fecha de creación + 5 días calendario; ciclo de estados (Recibida → En preparación → Entregada, con Vencida computada reactivamente cuando la fecha límite pasa la fecha actual); tabla/listado con columnas (Paciente, Alcance, Canal, Fecha límite, Estado, Solicitante, Base legal); orden por timestamp descendente (más reciente primero); fila expandible con detalle completo; persistencia en memoria durante la sesión con disclaimer visible en español que explica que los datos se perderán al recargar la página. Agregado item "Solicitudes del paciente" al sidebar bajo grupo Regulatorio.

### Cambios recientes (2026-05-11)

- **Actualización de navegación y dashboard**: Agregados títulos de topbar para `/regulatory-tasks` ("Tareas regulatorias") y `/patient-requests` ("Solicitudes del paciente"). Dashboard (`/`) actualizado con: (a) dos nuevos accesos rápidos — "Tareas regulatorias" y "Solicitudes del paciente" — en la sección de accesos rápidos; (b) bloque de resumen de cumplimiento regulatorio (`ComplianceSummaryBlock`) que consulta `clinicalDocuments.list`, `ripsExports.list`, `ihceBundles.list`, `interconsultations.list` y `serviceRequests.list`, mostrando conteos reales de pendientes con skeletons de carga, estado vacío y enlaces al panel regulatorio. Layout del dashboard ajustado a grid de 3 columnas en desktop (accesos rápidos, cumplimiento, estado del sistema). Los iconos de sidebar colapsado y estados activos ya funcionan para ambas rutas nuevas.
- **Nueva vista: Tareas regulatorias** (`/regulatory-tasks`): Dashboard operativo de cumplimiento con metric strips (firmas pendientes, RIPS, IHCE/RDA, interconsultas, órdenes), alertas de cumplimiento con lógica SLA, secciones con datos reales de backend, esqueletos de carga, estados vacíos y manejo de errores con reintentos. Layout responsive (1/2/3 columnas). Agregado item "Tareas regulatorias" al sidebar bajo Regulatorio. Pequeños cambios backend: filtros opcionales `status` en `clinicalDocuments.list` y `serviceRequests.list`.
- **Pre-existentes detectados**: errores de tipo en `encounters/$encounterId.tsx` y `patients/$patientId.tsx` (imports faltantes), no relacionados con este avance.

### Cambios recientes (2026-05-11)

- **Nueva vista: Solicitudes del paciente** (`/patient-requests`): Workflow de demostración en memoria para solicitudes de copia de historia clínica. Incluye: selección de paciente mediante `SearchSelect` con búsqueda debounced contra `patients.list`; formulario con alcance (Completa/Parcial/Resumen), canal de entrega (Físico/Correo electrónico/Portal del paciente), solicitante, base legal (Ley 23 de 1981, Ley 1581 de 2012, Resolución 1995 de 1999, etc.) y notas opcionales; validación con `@tanstack/react-form` + Zod en español; fecha límite auto-calculada como fecha de creación + 5 días calendario; ciclo de estados (Recibida → En preparación → Entregada, con Vencida computada reactivamente cuando la fecha límite pasa la fecha actual); tabla/listado con columnas (Paciente, Alcance, Canal, Fecha límite, Estado, Solicitante, Base legal); orden por timestamp descendente (más reciente primero); fila expandible con detalle completo; persistencia en memoria durante la sesión con disclaimer visible en español que explica que los datos se perderán al recargar la página. Agregado item "Solicitudes del paciente" al sidebar bajo grupo Regulatorio.

## Cambios recientes (2026-05-11)

- **Línea de tiempo clínica en detalle de paciente** (`/patients/$patientId`): Nuevo componente `PatientTimeline` (`apps/web/src/components/patient-timeline.tsx`) integrado debajo de la información del paciente y encima del historial de atenciones. Consulta en paralelo 8 fuentes de datos filtradas por `patientId`: `encounters.list`, `clinicalDocuments.list`, `medicationOrders.list`, `serviceRequests.list`, `interconsultations.list` (filtrado client-side por `encounterId`), `incapacityCertificates.list`, `consents.listConsents` y `consents.listDataDisclosures`. Fusiona y ordena todos los items por fecha descendente. Cada item muestra: icono distintivo de `lucide-react`, color de fondo único, etiqueta de tipo en español, badge de estado traducido, fecha formateada `es-CO`, resumen legible y enlace navegable a su ruta de detalle correspondiente. Soporta skeleton de carga con 6 filas, estado vacío con mensaje descriptivo, y tolerancia a fallos parciales con indicador discreto de error y botón de reintento. Layout denso (~60–80 px por fila), scroll interno si hay más de ~20 items. Preserva completamente el formulario de edición de paciente y la tabla de atenciones existentes.

### Cambios recientes (2026-05-11)

- **Mejoras en documentos clínicos** (`/clinical-documents` y `/clinical-documents/$documentId`):
  - **Listado**: IDs de paciente/atención ahora truncados y mostrados en texto atenuado (`text-muted-foreground`) en lugar de ocupar columnas dominantes. Etiquetas de tipo en español (`evolucion_medica` → "Evolución médica", etc.). Badges de estado en español (`Borrador` / `Firmado`) con colores amber/emerald. Agregados filtros de estado (`Todos`, `Borrador`, `Firmado`) y tipo de documento en la parte superior de la tabla; los filtros actualizan los resultados sin recarga completa y incluyen botón "Limpiar filtros". Paginación total refleja el conteo filtrado.
  - **Detalle**: La tarjeta de información del documento ahora muestra el tipo en español, estado como badge, IDs truncados y la fecha de creación. La tarjeta de cumplimiento/versión actual muestra explícitamente: estado (`Borrador`/`Firmado`), número de versión, autor (practitioner ID), hash SHA-256 en fuente monoespaciada, fecha de firma (o "Pendiente de firma"), y motivo de corrección cuando aplica.
  - **Secciones**: Los payloads JSON de secciones con claves conocidas (`reasonForVisit`, `subjective`, `objective`, `assessment`, `plan`, `diagnoses`) se renderizan como bloques legibles con etiquetas en español ("Motivo de consulta", "Diagnósticos" con lista con viñetas, etc.) en lugar de solo JSON crudo. Se conserva un botón "Ver JSON" / "Ocultar JSON" por sección para acceder al JSON formateado original. Estados de carga (skeletons) y vacío manejados correctamente. Back navigation al listado preservada. El flujo de creación y firma de documentos se mantiene intacto. Test backend agregado para verificar filtro `status` en `clinicalDocuments.list`.

## Cambios recientes (2026-05-07)

- **Refactor flujo clínico central**: Los 4 tabs de `$encounterId` (diagnósticos, alergias, observaciones, procedimientos) fueron extraídos a componentes independientes en `encounters/-components/` y migrados de `useState` a `@tanstack/react-form` + Zod, con validación declarativa y manejo de errores consistente.
- **Tab "Evolución" (SOAP)**: Nuevo tab en `$encounterId` con editor estructurado por secciones (Subjetivo/Objetivo/Análisis/Plan) que crea automáticamente un `clinical_document` de tipo `evolucion_medica` vinculado a la atención, con secciones versionadas y texto renderizado.
- **Persistencia de tabs en URL**: Los tabs de `$encounterId` ahora se persisten mediante `?tab=diagnoses` (TanStack Router `validateSearch` + `useNavigate`), evitando que se pierdan al refrescar la página.
- **Info cards enriquecidas**: Las cards de información de la atención ahora resuelven IDs de sede y unidad de servicio a nombres legibles mediante queries a `facilities.getSite` y `facilities.getServiceUnit`.
- **Migración formulario de atenciones**: `encounters/index.tsx` migrado de `useState` a `@tanstack/react-form` + Zod para la creación de atenciones, con validación en tiempo real y manejo de errores declarativo.
- **CTA "Nueva atención" en paciente**: El detalle de paciente (`$patientId`) ahora incluye un botón de acceso rápido para crear una nueva atención.

### Cambios recientes (2026-04-30)

- **DELETE endpoints**: Agregados a `patients`, `encounters`, `clinicalRecords` (diagnosis/allergy/observation/procedure), `clinicalDocuments`, `medicationOrders`, `medicationAdministrations`, `serviceRequests`, `diagnosticReports`, `interconsultations`, `incapacityCertificates`, `attachments` (binary/link), `facilities` (org/site/unit/practitioner), `ripsExports`, `ihceBundles`, `consents` (consent/dataDisclosure).
- **GET endpoints**: Agregados a `medicationOrders`, `serviceRequests`, `interconsultations`, `incapacityCertificates`, `attachments` (binary/link), `ripsExports`, `ihceBundles`, `facilities` (org/site/unit/practitioner).
- **onDelete cascade**: Agregado a FKs del schema DB para permitir eliminación en cascada de registros clínicos vinculados a pacientes/atenciones.
- **Frontend fixes**: `refetch()` reemplazado por `invalidateQueries()` en `encounters/index.tsx` y `encounters/$encounterId.tsx`. Scroll infinito buggeado corregido en chat con detección de posición del usuario. Validación de tipo objeto agregada a campos JSON libres en clinical-documents e ihce-bundles. `aria-label` agregado al input de chat.
- **Rutas de detalle**: Creadas 11 rutas de detalle: `/appointments/$appointmentId`, `/medication-orders/$orderId`, `/service-requests/$requestId`, `/interconsultations/$interconsultationId`, `/incapacity-certificates/$certificateId`, `/attachments/$attachmentId`, `/ihce-bundles/$bundleId`, `/rips-exports/$exportId`, `/facilities/sites/$siteId`, `/facilities/service-units/$unitId`, `/facilities/practitioners/$practitionerId`.
- **Vistas faltantes**: Agregado tab de "Autorizaciones de divulgación" en `/consents` con CRUD completo. Agregado indicador y modal de reportes diagnósticos en `/service-requests`.
- **Migración de formularios**: Todos los formularios de creación migrados de `useState` a `@tanstack/react-form` + Zod: `appointments`, `patients`, `encounters`, `medication-orders`, `service-requests`, `consents`, `interconsultations`, `incapacity-certificates`, `clinical-documents`, `ihce-bundles`.

### Vistas frontend implementadas

- `/` — Dashboard
- `/patients` — Listado, búsqueda, registro
- `/patients/$patientId` — Detalle, edición, historial de atenciones
- `/encounters` — Listado, filtros, nueva atención
- `/encounters/$encounterId` — Detalle con tabs: diagnósticos, alergias, observaciones, procedimientos, evolución (SOAP). Todos los tabs usan `@tanstack/react-form` + Zod. Los tabs se persisten en URL (`?tab=`). Las info cards resuelven nombres de sede/unidad en tiempo real.
- `/clinical-documents` — Listado y creación de documentos clínicos
- `/clinical-documents/$documentId` — Detalle con versión actual y secciones
- `/consents` — Consentimientos informados y autorizaciones de divulgación de datos
- `/medication-orders` — Prescripciones y administraciones
- `/service-requests` — Órdenes de servicio y resultados
- `/interconsultations` — Interconsultas y remisiones
- `/interconsultations/$interconsultationId` — Detalle de interconsulta
- `/incapacity-certificates` — Certificados de incapacidad
- `/incapacity-certificates/$certificateId` — Detalle de certificado
- `/attachments` — Anexos y enlaces documentales
- `/attachments/$attachmentId` — Detalle de anexo
- `/audit-events` — Bitácora de auditoría y acceso
- `/rips-exports` — Panel regulatorio RIPS
- `/rips-exports/$exportId` — Detalle de exportación RIPS
- `/regulatory-tasks` — Dashboard de tareas regulatorias con métricas, alertas SLA y listados operativos
- `/ihce-bundles` — Bundles IHCE/RDA para interoperabilidad
- `/ihce-bundles/$bundleId` — Detalle de bundle IHCE
- `/facilities/organizations`, `/sites`, `/service-units`, `/practitioners`
- `/facilities/sites/$siteId` — Detalle de sede
- `/facilities/service-units/$unitId` — Detalle de unidad de servicio
- `/facilities/practitioners/$practitionerId` — Detalle de profesional
- `/admin/users` — Gestión de usuarios (maneja error 403/500 sin permisos)
- `/catalogs`, `/catalogs/$tableName` — Catálogos RIPS
- `/chat` — Asistente médico con streaming, selección/búsqueda de paciente, panel de contexto clínico, acciones rápidas, render Markdown con Streamdown, visualización de tool calls y creación de prescripciones mediante herramientas server-side.
- La pantalla `/chat` incluye acción de nuevo chat en el encabezado para detener cualquier stream activo y limpiar el historial local sin cambiar el paciente seleccionado. El transporte de AI SDK se mantiene estable y usa `prepareSendMessagesRequest` con un `ref` del paciente seleccionado para enviar siempre el `selectedPatientId` vigente, evitando que el chat conserve el valor inicial `null`.

### Vistas frontend PENDIENTES

- Portal del paciente (solicitudes de copia) — parcialmente implementado como demo frontend-only en `/patient-requests`

### Backend PENDIENTE (post-auditoría 2026-04-30)

- **CRÍTICO**: Tablas transaccionales RIPS por tipo de servicio (consulta, procedimientos, medicamentos, urgencias, hospitalización, recién nacido, otros servicios) + generador FEV-RIPS estructurado
- **CRÍTICO**: API FHIR R4 para interoperabilidad (Res. 866 de 2021)
- **CRÍTICO**: Validación de interacciones medicamentosas (tabla local ATC o integración)
- **ALTO**: Middleware de auth con roles/permisos (proteger admin, verificar banned)
- **ALTO**: Firma digital en documentos clínicos (certificado + timestamp)
- **ALTO**: Generador de bundles FHIR-compliant para IHCE/RDA
- **ALTO**: Middleware de auditoría automática de lecturas de datos sensibles
- **MEDIO**: Estandarizar timestamps (`createdAt`/`updatedAt`) en tablas clínicas sin ellos
- **MEDIO**: Tablas RBAC clínico (`clinicalRole`, `permission`, `userClinicalRole`, `rolePermission`) sin routers
- **MEDIO**: Configurar modelo de IA por variable de entorno (actualmente hardcodeado)
- **BAJO**: Eliminar código muerto (`header.tsx`)
- **BAJO**: Mejorar accesibilidad (ARIA) en `DataTable`, `Sidebar`, `Loader`

## Seed y Test Infrastructure

### Archivos

- `packages/api/src/seed.ts` — Script de seed completo que usa los routers oRPC reales (no inserts directos a DB). Sirve dual propósito: poblar datos realistas y actuar como suite de integración.
- `packages/api/src/test-utils.ts` — Utilidades compartidas para tests: `ensureSeedUserExists`, `createSeedContext`, `createTestContext`.

### Características del seed

- **Sincronización RIPS obligatoria**: Antes de crear cualquier dato, ejecuta `ripsReference.syncAll()` para poblar catálogos SISPRO desde la API del estado. **Ningún código RIPS está hardcodeado**; todos se resuelven dinámicamente contra la base de datos post-sync.
- **Narrativas coherentes**: 10 pacientes con historias médicas realistas y evolutivas (diabetes, asma, prenatal, EPOC, pediatría, ortopedia, salud mental, cardiología, dermatología, gastroenterología).
- **Datos completos por paciente**: múltiples appointments, encounters, diagnósticos CIE10, observaciones (signos vitales), procedimientos CUPS, prescripciones médicas, administraciones, documentos clínicos, consentimientos, autorizaciones de divulgación, órdenes/resultados diagnósticos, interconsultas, incapacidades, anexos, bundles IHCE/RDA, contactos, identificadores y coberturas.
- **Infraestructura base**: crea organización, dos sedes, unidades de consulta externa/urgencias/imagenología/laboratorio, 20 profesionales de salud con roles/sedes y especialidades variadas, distribuye las atenciones entre profesionales, vincula el seed user con profesional principal y crea pagadores reales resueltos desde `CodigoEAPByNit`.
- **Uso de RPC real**: las entidades con router pasan por `createRouterClient(appRouter, { context })` con DB real y sesión de seed user; las tablas administrativas sin router público (contactos, cobertura, pagadores, roles/vínculos) se crean por Drizzle manteniendo FKs y códigos de catálogos sincronizados.
- **Cobertura regulatoria ampliada**: crea exports RIPS por pagador con payload/resumen de validación, bundles IHCE/RDA por atención, consentimientos y autorizaciones por paciente, documentos firmados/borradores, anexos documentales con hash SHA-256 y resultados diagnósticos coherentes con la historia clínica.

### Comandos

```bash
# Ejecutar seed (primera vez o con DB limpia)
bun run seed

# Sobrescribir datos existentes del seed
bun run seed -- --clean

# Verificar tipos del seed
bun x tsc --noEmit -p packages/api/tsconfig.json
```

> **Nota:** El script `seed` carga automáticamente las variables de entorno desde `apps/server/.env` mediante `--env-file`. Asegúrate de que ese archivo exista y contenga `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` y `CORS_ORIGIN`.

> **Importante:** El seed debe ejecutarse desde el directorio `packages/api` para que el `DATABASE_URL` relativo (`file:../../local.db`) se resuelva correctamente. El comando en `package.json` ya maneja esto con `cd packages/api`.

> **Base de datos:** Asegúrate de que el servidor no esté usando exclusivamente la base de datos SQLite cuando ejecutes el seed, ya que puede causar conflictos de escritura. Si el seed falla con "Failed query", detén el servidor (`Ctrl+C` en la terminal de `dev:server`) y vuelve a ejecutar.

> **Idempotencia:** El seed detecta automáticamente si ya existe datos de un seed anterior (por `reps_code` de la organización). Si detecta datos existentes, muestra un error amigable y sugiere usar `--clean`. El flag `--clean` elimina todos los datos previos del seed antes de poblar la base de datos nuevamente.

### Test patterns establecidos

- **Unit tests** (existentes): usan `createRouterClient` con DB mocked (sin DB real).
- **Integration/seed tests** (nuevo): usan `createRouterClient` con DB real y `createSeedContext`.
- El seed user se crea/verifica en la tabla `user` de Better Auth para satisfacer FKs y el middleware de autenticación.

---

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

El `biome.jsonc` del repo excluye `.agents/` (skills locales externas al producto) y `apps/web/src/routeTree.gen.ts` (archivo generado por TanStack Router) para que `bun x ultracite check` reporte únicamente código mantenido del proyecto. También conserva overrides específicos para convenciones propias: rutas file-based dinámicas con `$param.tsx`, componentes de rutas existentes y el barrel público intencional de `packages/api/src/index.ts`.

## Quick Reference

- **Format code**: `bun x ultracite fix`
- **Check for issues**: `bun x ultracite check`
- **Diagnose setup**: `bun x ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `bun x ultracite fix` before committing to ensure compliance.
