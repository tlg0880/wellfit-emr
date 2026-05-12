import { useLocation } from "@tanstack/react-router";
import { HeartPulse } from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

function getPageTitle(pathname: string): string {
  if (pathname === "/") {
    return "Panel principal";
  }

  const titles: Record<string, string> = {
    "/patients": "Pacientes",
    "/appointments": "Agenda",
    "/encounters": "Atenciones",
    "/clinical-documents": "Documentos clínicos",
    "/consents": "Consentimientos",
    "/medication-orders": "Prescripciones",
    "/service-requests": "Órdenes y resultados",
    "/interconsultations": "Interconsultas",
    "/incapacity-certificates": "Incapacidades",
    "/attachments": "Anexos",
    "/audit-events": "Auditoría",
    "/regulatory-tasks": "Tareas regulatorias",
    "/patient-requests": "Solicitudes del paciente",
    "/rips-exports": "RIPS",
    "/ihce-bundles": "IHCE",
    "/catalogs": "Catálogos RIPS",
    "/facilities/organizations": "Organización",
    "/facilities/sites": "Sedes",
    "/facilities/service-units": "Unidades de servicio",
    "/facilities/practitioners": "Profesionales",
    "/admin/users": "Administración",
  };

  for (const [path, title] of Object.entries(titles)) {
    if (pathname.startsWith(path)) {
      return title;
    }
  }

  return "WellFit EMR";
}

export function Topbar() {
  const { pathname } = useLocation();
  const title = getPageTitle(pathname);

  return (
    <header className="flex h-14 items-center justify-between border-border/60 border-b bg-card/80 px-6 shadow-md backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-sm bg-primary text-primary-foreground shadow-md lg:hidden">
          <HeartPulse size={16} strokeWidth={2.5} />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-px bg-border" />
          <h2 className="font-semibold text-foreground/90 text-sm tracking-tight">
            {title}
          </h2>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <div className="h-4 w-px bg-border" />
        <UserMenu />
      </div>
    </header>
  );
}
