import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@wellfit-emr/ui/lib/utils";
import {
  Archive,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Eye,
  FileOutput,
  FileText,
  FlaskConical,
  Gavel,
  HeartPulse,
  Home,
  Mail,
  MessageSquare,
  Paperclip,
  Pill,
  ScrollText,
  Settings,
  Share2,
  ShieldCheck,
  Stethoscope,
  Unlock,
  Users,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  icon: React.ElementType;
  label: string;
  to: string;
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Principal",
    items: [
      { icon: Home, label: "Dashboard", to: "/" },
      { icon: MessageSquare, label: "Asistente IA", to: "/chat" },
    ],
  },
  {
    label: "Clínico",
    items: [
      { icon: Users, label: "Pacientes", to: "/patients" },
      { icon: Calendar, label: "Agenda", to: "/appointments" },
      { icon: Stethoscope, label: "Atenciones", to: "/encounters" },
      {
        icon: ScrollText,
        label: "Documentos clínicos",
        to: "/clinical-documents",
      },
      { icon: ShieldCheck, label: "Consentimientos", to: "/consents" },
      { icon: Pill, label: "Prescripciones", to: "/medication-orders" },
      {
        icon: FlaskConical,
        label: "Órdenes y resultados",
        to: "/service-requests",
      },
      { icon: Mail, label: "Interconsultas", to: "/interconsultations" },
      {
        icon: ClipboardList,
        label: "Incapacidades",
        to: "/incapacity-certificates",
      },
    ],
  },
  {
    label: "Documental",
    items: [
      { icon: Paperclip, label: "Anexos", to: "/attachments" },
      { icon: Eye, label: "Auditoría", to: "/audit-events" },
      {
        icon: Unlock,
        label: "Autorizaciones de datos",
        to: "/data-disclosures",
      },
    ],
  },
  {
    label: "Regulatorio",
    items: [
      { icon: Gavel, label: "Tareas regulatorias", to: "/regulatory-tasks" },
      {
        icon: Copy,
        label: "Solicitudes del paciente",
        to: "/patient-requests",
      },
      {
        icon: Archive,
        label: "Retención documental",
        to: "/retention-records",
      },
      { icon: FileOutput, label: "RIPS", to: "/rips-exports" },
      { icon: Share2, label: "IHCE", to: "/ihce-bundles" },
      { icon: FileText, label: "Catálogos RIPS", to: "/catalogs" },
    ],
  },
  {
    label: "Configuración",
    items: [
      {
        icon: Building2,
        label: "Institución",
        to: "/facilities/organizations",
      },
      {
        icon: Building2,
        label: "Pagadores",
        to: "/facilities/payers",
      },
      {
        icon: Building2,
        label: "Sedes",
        to: "/facilities/sites",
      },
      {
        icon: Building2,
        label: "Unidades de servicio",
        to: "/facilities/service-units",
      },
      {
        icon: Users,
        label: "Profesionales",
        to: "/facilities/practitioners",
      },
      {
        icon: Users,
        label: "Roles",
        to: "/facilities/practitioner-roles",
      },
    ],
  },
  {
    label: "Sistema",
    items: [{ icon: Settings, label: "Administración", to: "/admin/users" }],
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();

  return (
    <aside
      className={cn(
        "flex flex-col border-sidebar-border border-r bg-sidebar transition-all duration-200 ease-out",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-14 items-center justify-between border-sidebar-border border-b px-4">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center bg-sidebar-primary text-sidebar-primary-foreground">
              <HeartPulse size={16} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sidebar-foreground text-sm leading-none tracking-tight">
                WellFit EMR
              </span>
              <span className="mt-0.5 text-[9px] text-sidebar-foreground/50 uppercase leading-none tracking-wider">
                Sistema Hospitalario
              </span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex size-8 items-center justify-center bg-sidebar-primary text-sidebar-primary-foreground">
            <HeartPulse size={16} strokeWidth={2.5} />
          </div>
        )}
        <button
          className={cn(
            "inline-flex size-7 items-center justify-center text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
            collapsed && "mx-auto mt-2"
          )}
          onClick={() => setCollapsed((c) => !c)}
          type="button"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-auto py-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="mb-2 px-4 font-bold text-[10px] text-sidebar-foreground/40 uppercase tracking-widest">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.to || pathname.startsWith(`${item.to}/`);
                return (
                  <li key={item.to}>
                    <Link
                      className={cn(
                        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-all duration-150",
                        collapsed && "justify-center px-2",
                        isActive
                          ? "bg-sidebar-primary/10 font-medium text-sidebar-primary shadow-sm"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      to={item.to}
                    >
                      {isActive && (
                        <span className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 bg-sidebar-primary" />
                      )}
                      <div
                        className={cn(
                          "flex items-center justify-center transition-colors",
                          isActive
                            ? "text-sidebar-primary"
                            : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
                        )}
                      >
                        <item.icon size={17} />
                      </div>
                      {!collapsed && <span>{item.label}</span>}
                      {isActive && !collapsed && (
                        <div className="ml-auto size-1.5 rounded-full bg-sidebar-primary" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-sidebar-border border-t p-4">
        {!collapsed && (
          <div className="space-y-1">
            <div className="font-medium text-[10px] text-sidebar-foreground/70">
              WellFit EMR
            </div>
            <div className="text-[9px] text-sidebar-foreground/40">
              v1.0 · Resolución 1888 de 2025
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto size-2 bg-sidebar-foreground/20" />
        )}
      </div>
    </aside>
  );
}
