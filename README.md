# WellFit EMR

Historia Clínica Electrónica (HCE) orientada al cumplimiento normativo colombiano: registro clínico reservado, trazabilidad, RIPS-FEV, interoperabilidad IHCE/RDA, protección de datos y gobierno técnico documentado.

## Marco regulatorio (referencia)

Ley 23 de 1981 · Resolución 1995 de 1999 · Ley 2015 de 2020 · Resoluciones 866/2021 y 1888/2025 (IHCE/RDA) · Ley 1581 de 2012 · Resolución 3100 de 2019 · RIPS (Res. 2275/2023 y anexos) · Retención documental (Res. 839/2017, Ley 594)

La **matriz de cumplimiento** y el **registro de riesgos** viven en [`docs/governance/`](docs/governance/README.md) (fuente única de verdad para decisiones técnicas y regulatorias).

## Capacidades implementadas (resumen)

| Área | Funcionalidad |
|------|----------------|
| **Asistencial** | Pacientes, atenciones (clínicas y documentales), diagnósticos, alergias, observaciones, procedimientos CUPS, evolución SOAP |
| **Documental** | Documentos clínicos versionados con firma lógica y hash; anexos S3; documentos de paciente con resumen IA |
| **Órdenes** | Prescripciones, órdenes de servicio, resultados, interconsultas, incapacidades |
| **Consentimiento** | Consentimiento informado y autorización de divulgación de datos (flujos separados) |
| **Regulatorio** | Exportación RIPS con generación y preflight local; bundles IHCE; catálogos SISPRO; tareas regulatorias |
| **Cumplimiento** | Auditoría de eventos, retención documental, panel de cumplimiento en dashboard |
| **IA clínica** | Chat con contexto server-side, herramientas acotadas al paciente, sin firma automática |

Estado detallado de routers, rutas y pendientes críticos: [`AGENTS.md`](AGENTS.md).

## Stack

- **Monorepo:** Turborepo + Bun  
- **Frontend:** React 19, Vite, TanStack Router, Tailwind CSS v4  
- **API:** oRPC + Hono + Zod  
- **Base de datos:** SQLite (libSQL) + Drizzle ORM  
- **Auth:** Better Auth  
- **Objetos:** RustFS (S3 local vía Docker Compose)

## Inicio rápido

```bash
# Dependencias
bun install

# Almacenamiento S3 local (opcional para adjuntos)
docker compose up -d

# Variables: copiar y ajustar según .env.example
cp .env.example apps/server/.env
# Editar apps/server/.env (DATABASE_URL, BETTER_AUTH_*, S3_*, etc.)

# Esquema de base de datos
bun run db:migrate

# Datos de demostración (requiere apps/server/.env; sincroniza catálogos SISPRO)
bun run seed

# Desarrollo
bun run dev
```

- **Web:** http://localhost:5173  
- **API:** http://localhost:3000  

## Calidad y CI

```bash
bun run check-types      # TypeScript en todo el monorepo
bun x ultracite check    # Lint/format (Biome)
bun x ultracite fix      # Auto-fix
```

Los pull requests ejecutan CI en GitHub Actions (typecheck, ultracite y tests RIPS). Ver [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Contribuir

Leer [CONTRIBUTING.md](CONTRIBUTING.md): plantillas de issue, Definition of Ready/Done y actualización de la matriz de cumplimiento en cambios clínicos o regulatorios.

## Estructura del repositorio

```
wellfit-emr/
├── apps/
│   ├── web/              # UI React + TanStack Router
│   └── server/           # Hono, oRPC, chat, uploads
├── packages/
│   ├── api/              # Routers oRPC, servicios RIPS, IA
│   ├── db/               # Schema Drizzle y migraciones
│   ├── auth/             # Better Auth
│   └── ui/               # Componentes compartidos
├── docs/governance/      # Matriz, riesgos, DoR/DoD, roadmap
├── DEVELOPMENT_SPEC.md   # Especificación funcional extendida
└── AGENTS.md             # Contexto para desarrollo y agentes
```

## Documentación

| Documento | Uso |
|-----------|-----|
| [docs/governance/README.md](docs/governance/README.md) | Gobierno M0, métricas, índice |
| [DEVELOPMENT_SPEC.md](DEVELOPMENT_SPEC.md) | Requisitos y modelo de datos (referencia larga) |
| [AGENTS.md](AGENTS.md) | Estado de implementación y convenciones |

## Licencia

Privado — uso institucional WellFit EMR.
