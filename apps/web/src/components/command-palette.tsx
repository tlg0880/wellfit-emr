import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@wellfit-emr/ui/components/dialog";
import { Input } from "@wellfit-emr/ui/components/input";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import {
  Calendar,
  FileText,
  FlaskConical,
  Home,
  Mail,
  Pill,
  ScrollText,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { orpc } from "@/utils/orpc";

interface QuickAction {
  description: string;
  icon: React.ElementType;
  id: string;
  label: string;
  to: string;
  type: "nav";
}

const quickActions: QuickAction[] = [
  {
    id: "nav-dashboard",
    label: "Dashboard",
    description: "Ir al panel principal",
    icon: Home,
    to: "/",
    type: "nav",
  },
  {
    id: "nav-patients",
    label: "Pacientes",
    description: "Ver listado de pacientes",
    icon: Users,
    to: "/patients",
    type: "nav",
  },
  {
    id: "nav-encounters",
    label: "Atenciones",
    description: "Ver atenciones clínicas",
    icon: Stethoscope,
    to: "/encounters",
    type: "nav",
  },
  {
    id: "nav-appointments",
    label: "Agenda",
    description: "Ver citas programadas",
    icon: Calendar,
    to: "/appointments",
    type: "nav",
  },
  {
    id: "nav-documents",
    label: "Documentos clínicos",
    description: "Ver documentos clínicos",
    icon: ScrollText,
    to: "/clinical-documents",
    type: "nav",
  },
  {
    id: "nav-prescriptions",
    label: "Prescripciones",
    description: "Ver órdenes de medicamentos",
    icon: Pill,
    to: "/medication-orders",
    type: "nav",
  },
  {
    id: "nav-orders",
    label: "Órdenes y resultados",
    description: "Ver órdenes de servicio",
    icon: FlaskConical,
    to: "/service-requests",
    type: "nav",
  },
  {
    id: "nav-consents",
    label: "Consentimientos",
    description: "Ver consentimientos informados",
    icon: ShieldCheck,
    to: "/consents",
    type: "nav",
  },
  {
    id: "nav-interconsultations",
    label: "Interconsultas",
    description: "Ver solicitudes de interconsulta",
    icon: Mail,
    to: "/interconsultations",
    type: "nav",
  },
  {
    id: "nav-regulatory",
    label: "Tareas regulatorias",
    description: "Ver pendientes de cumplimiento",
    icon: FileText,
    to: "/regulatory-tasks",
    type: "nav",
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const trimmedQuery = query.trim();

  const { data: patientsData, isLoading: patientsLoading } = useQuery(
    orpc.patients.list.queryOptions({
      input: {
        limit: 5,
        offset: 0,
        search: trimmedQuery.length >= 2 ? trimmedQuery : undefined,
      },
      enabled: trimmedQuery.length >= 2,
    })
  );

  const patientResults =
    patientsData?.patients.map((p) => ({
      id: `patient-${p.id}`,
      label: `${p.firstName} ${p.lastName1} ${p.lastName2 ?? ""}`.trim(),
      description: `${p.primaryDocumentType} ${p.primaryDocumentNumber}`,
      icon: Users,
      to: `/patients/${p.id}`,
      type: "patient" as const,
    })) ?? [];

  const filteredActions =
    trimmedQuery.length > 0
      ? quickActions.filter(
          (a) =>
            a.label.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
            a.description.toLowerCase().includes(trimmedQuery.toLowerCase())
        )
      : quickActions;

  const allResults = useMemo(
    () => [...filteredActions, ...patientResults],
    [filteredActions, patientResults]
  );

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const handleSelect = useCallback(
    (item: { to: string }) => {
      handleClose();
      navigate({ to: item.to });
    },
    [handleClose, navigate]
  );

  const handleArrowDown = useCallback((itemsLength: number) => {
    setSelectedIndex((currentIndex) =>
      currentIndex < itemsLength - 1 ? currentIndex + 1 : itemsLength - 1
    );
  }, []);

  const handleArrowUp = useCallback(() => {
    setSelectedIndex((currentIndex) =>
      currentIndex > 0 ? currentIndex - 1 : 0
    );
  }, []);

  const handleToggleShortcut = useCallback(
    (event: KeyboardEvent): boolean => {
      const isToggleShortcut =
        (event.metaKey || event.ctrlKey) && event.key === "k";
      if (!isToggleShortcut) {
        return false;
      }

      event.preventDefault();
      if (open) {
        handleClose();
        return true;
      }

      handleOpen();
      return true;
    },
    [handleClose, handleOpen, open]
  );

  const handleEscapeShortcut = useCallback(
    (event: KeyboardEvent): boolean => {
      if (event.key !== "Escape" || !open) {
        return false;
      }

      handleClose();
      return true;
    },
    [handleClose, open]
  );

  const handleNavigationShortcut = useCallback(
    (event: KeyboardEvent): boolean => {
      if (!open) {
        return false;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        handleArrowDown(allResults.length);
        return true;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        handleArrowUp();
        return true;
      }

      if (event.key !== "Enter") {
        return false;
      }

      if (allResults.length === 0) {
        return true;
      }

      event.preventDefault();
      const item = allResults[selectedIndex];
      if (item) {
        handleSelect(item);
      }
      return true;
    },
    [
      allResults,
      handleArrowDown,
      handleArrowUp,
      handleSelect,
      open,
      selectedIndex,
    ]
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (handleToggleShortcut(event)) {
        return;
      }

      if (handleEscapeShortcut(event)) {
        return;
      }
      handleNavigationShortcut(event);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleEscapeShortcut, handleNavigationShortcut, handleToggleShortcut]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Búsqueda global</DialogTitle>
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="text-muted-foreground" size={16} />
          <Input
            className="h-8 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Buscar pacientes, rutas o acciones..."
            ref={inputRef}
            value={query}
          />
          <kbd className="hidden rounded-none border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-auto">
          {patientsLoading && (
            <div className="space-y-2 p-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}

          {allResults.length === 0 &&
            trimmedQuery.length >= 2 &&
            !patientsLoading && (
              <div className="flex flex-col items-center gap-2 py-8">
                <Search className="text-muted-foreground" size={20} />
                <p className="text-muted-foreground text-sm">
                  No se encontraron resultados para "{trimmedQuery}"
                </p>
              </div>
            )}

          {allResults.length === 0 && trimmedQuery.length < 2 && (
            <div className="flex flex-col items-center gap-2 py-8">
              <p className="text-muted-foreground text-sm">
                Escribe para buscar pacientes o selecciona una acción rápida
              </p>
            </div>
          )}

          {allResults.length > 0 && (
            <div className="py-2">
              {filteredActions.length > 0 && patientResults.length > 0 && (
                <div className="px-3 pt-1 pb-1">
                  <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                    {patientResults.length > 0 ? "Acciones" : ""}
                  </p>
                </div>
              )}

              {allResults.map((item, index) => (
                <button
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs outline-none transition-colors ${
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-accent/50"
                  }`}
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  type="button"
                >
                  <item.icon size={14} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  {item.type === "patient" && (
                    <span className="text-[10px] text-muted-foreground">
                      Paciente
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-4 py-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded-none border bg-muted px-1 py-0.5 font-mono">
                ↵
              </kbd>{" "}
              seleccionar
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded-none border bg-muted px-1 py-0.5 font-mono">
                ↑↓
              </kbd>{" "}
              navegar
            </span>
          </div>
          <span>
            {allResults.length} resultado{allResults.length === 1 ? "" : "s"}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
