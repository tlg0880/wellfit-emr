import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Input } from "@wellfit-emr/ui/components/input";
import { Label } from "@wellfit-emr/ui/components/label";
import { SearchSelect } from "@wellfit-emr/ui/components/search-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@wellfit-emr/ui/components/select";
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  FilterX,
  Pencil,
  Plus,
  Search,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

const searchSchema = z.object({
  patientId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/appointments/")({
  component: AppointmentsPage,
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw new Error("UNAUTHORIZED");
    }
    return { session };
  },
  errorComponent: () => {
    window.location.href = "/login";
    return null;
  },
});

const WEEK_DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function getMonthData(year: number, month: number) {
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = firstDayOfMonth.getDay();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonthDays = Array.from({ length: startDayOfWeek }, (_, i) => ({
    date: new Date(year, month - 1, daysInPrevMonth - startDayOfWeek + i + 1),
    isCurrentMonth: false,
  }));

  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => ({
    date: new Date(year, month, i + 1),
    isCurrentMonth: true,
  }));

  const remainingCells =
    (7 - ((prevMonthDays.length + currentMonthDays.length) % 7)) % 7;
  const nextMonthDays = Array.from({ length: remainingCells }, (_, i) => ({
    date: new Date(year, month + 1, i + 1),
    isCurrentMonth: false,
  }));

  return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const statusConfig: Record<string, { color: string; label: string }> = {
  scheduled: { color: "bg-blue-500", label: "Programada" },
  confirmed: { color: "bg-emerald-500", label: "Confirmada" },
  cancelled: { color: "bg-slate-400", label: "Cancelada" },
  completed: { color: "bg-slate-700", label: "Completada" },
  "no-show": { color: "bg-amber-500", label: "No asistió" },
};

interface AppointmentFormValues {
  durationMinutes: number;
  notes: string;
  patientId: string;
  practitionerId: string;
  reason: string;
  scheduledAtDate: string;
  scheduledAtTime: string;
  serviceUnitId: string;
  siteId: string;
}

function AppointmentForm({
  initialDate,
  onCancel,
  onSuccess,
  defaultPatientId,
  editingId,
  initialValues,
}: {
  initialDate?: Date;
  onCancel: () => void;
  onSuccess: () => void;
  defaultPatientId?: string;
  editingId?: string;
  initialValues?: Partial<AppointmentFormValues>;
}) {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:00`;
  const [pendingConflicts, setPendingConflicts] = useState<
    Array<{
      appointmentId: string;
      scheduledAt: Date;
      durationMinutes: number;
      reason: string;
    }>
  >([]);
  const [confirmedDespiteConflicts, setConfirmedDespiteConflicts] =
    useState(false);

  const [patientSearch, setPatientSearch] = useState("");
  const [practitionerSearch, setPractitionerSearch] = useState("");
  const [siteSearch, setSiteSearch] = useState("");
  const [serviceUnitSearch, setServiceUnitSearch] = useState("");

  const { data: patientsData, isLoading: patientsLoading } = useQuery(
    orpc.patients.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: patientSearch || undefined,
      },
    })
  );

  const { data: defaultPatientData } = useQuery({
    ...orpc.patients.get.queryOptions({
      input: { id: defaultPatientId ?? "" },
    }),
    enabled: !!defaultPatientId,
  });

  const { data: practitionersData, isLoading: practitionersLoading } = useQuery(
    orpc.facilities.listPractitioners.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: practitionerSearch || undefined,
      },
    })
  );

  const { data: sitesData, isLoading: sitesLoading } = useQuery(
    orpc.facilities.listSites.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: siteSearch || undefined,
      },
    })
  );

  const { data: serviceUnitsData, isLoading: serviceUnitsLoading } = useQuery(
    orpc.facilities.listServiceUnits.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: serviceUnitSearch || undefined,
      },
    })
  );

  const form = useForm({
    defaultValues: {
      durationMinutes: initialValues?.durationMinutes ?? 30,
      notes: initialValues?.notes ?? "",
      patientId: initialValues?.patientId ?? defaultPatientId ?? "",
      practitionerId: initialValues?.practitionerId ?? "",
      reason: initialValues?.reason ?? "",
      scheduledAtDate:
        initialValues?.scheduledAtDate ??
        (initialDate ? initialDate.toISOString().split("T")[0] : dateStr),
      scheduledAtTime:
        initialValues?.scheduledAtTime ??
        (initialDate
          ? `${String(initialDate.getHours()).padStart(2, "0")}:00`
          : timeStr),
      serviceUnitId: initialValues?.serviceUnitId ?? "",
      siteId: initialValues?.siteId ?? "",
    },
    onSubmit: async ({ value }) => {
      const scheduledAt = new Date(
        `${value.scheduledAtDate}T${value.scheduledAtTime}:00`
      );

      if (value.practitionerId && !confirmedDespiteConflicts) {
        const result = await checkConflictsMutation.mutateAsync({
          practitionerId: value.practitionerId,
          scheduledAt,
          durationMinutes: value.durationMinutes,
          excludeAppointmentId: editingId || undefined,
        });
        if (result.hasConflict) {
          setPendingConflicts(result.conflicts);
          return;
        }
      }

      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          durationMinutes: value.durationMinutes,
          notes: value.notes || null,
          patientId: value.patientId,
          practitionerId: value.practitionerId || null,
          reason: value.reason,
          scheduledAt,
          serviceUnitId: value.serviceUnitId || null,
          siteId: value.siteId,
        });
      } else {
        await createMutation.mutateAsync({
          durationMinutes: value.durationMinutes,
          notes: value.notes || null,
          patientId: value.patientId,
          practitionerId: value.practitionerId || null,
          reason: value.reason,
          scheduledAt,
          serviceUnitId: value.serviceUnitId || null,
          siteId: value.siteId,
        });
      }
    },
    validators: {
      onSubmit: z.object({
        durationMinutes: z.number().min(5).max(480),
        notes: z.string(),
        patientId: z.string().min(1, "Requerido"),
        practitionerId: z.string(),
        reason: z.string().min(1, "Requerido"),
        scheduledAtDate: z.string().min(1, "Requerido"),
        scheduledAtTime: z.string().min(1, "Requerido"),
        serviceUnitId: z.string(),
        siteId: z.string().min(1, "Requerido"),
      }),
    },
  });

  const createMutation = useMutation({
    ...orpc.appointments.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Cita creada correctamente");
      queryClient.invalidateQueries({
        queryKey: orpc.appointments.list.key({ type: "query" }),
      });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear cita");
    },
  });

  const updateMutation = useMutation({
    ...orpc.appointments.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Cita actualizada correctamente");
      queryClient.invalidateQueries({
        queryKey: orpc.appointments.list.key({ type: "query" }),
      });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar cita");
    },
  });

  const checkConflictsMutation = useMutation({
    ...orpc.appointments.checkConflicts.mutationOptions(),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <form.Field name="patientId">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor={field.name}>Paciente *</Label>
              <SearchSelect
                emptyMessage="Escribe para buscar pacientes"
                loading={patientsLoading}
                onChange={(v) => field.handleChange(v)}
                onSearchChange={setPatientSearch}
                options={[
                  ...(defaultPatientData && defaultPatientId
                    ? [
                        {
                          value: defaultPatientData.id,
                          label: `${defaultPatientData.firstName} ${defaultPatientData.lastName1}`,
                          description: `${defaultPatientData.primaryDocumentType} ${defaultPatientData.primaryDocumentNumber}`,
                        },
                      ]
                    : []),
                  ...(patientsData?.patients ?? [])
                    .filter((p) => p.id !== defaultPatientId)
                    .map((p) => ({
                      value: p.id,
                      label: `${p.firstName} ${p.lastName1}`,
                      description: `${p.primaryDocumentType} ${p.primaryDocumentNumber}`,
                    })),
                ]}
                placeholder="Buscar paciente..."
                required
                search={patientSearch}
                value={field.state.value}
              />
              {field.state.meta.errors.map((error) => (
                <p className="text-destructive text-xs" key={String(error)}>
                  {String(error)}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="practitionerId">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor={field.name}>Profesional (opcional)</Label>
              <SearchSelect
                clearable
                emptyMessage="Escribe para buscar profesionales"
                loading={practitionersLoading}
                onChange={(v) => field.handleChange(v)}
                onSearchChange={setPractitionerSearch}
                options={
                  practitionersData?.practitioners.map((p) => ({
                    value: p.id,
                    label: p.fullName,
                    description: p.documentNumber,
                  })) ?? []
                }
                placeholder="Buscar profesional..."
                search={practitionerSearch}
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="siteId">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor={field.name}>Sede *</Label>
              <SearchSelect
                emptyMessage="Escribe para buscar sedes"
                loading={sitesLoading}
                onChange={(v) => field.handleChange(v)}
                onSearchChange={setSiteSearch}
                options={
                  sitesData?.sites.map((s) => ({
                    value: s.id,
                    label: s.name,
                    description: s.siteCode,
                  })) ?? []
                }
                placeholder="Buscar sede..."
                required
                search={siteSearch}
                value={field.state.value}
              />
              {field.state.meta.errors.map((error) => (
                <p className="text-destructive text-xs" key={String(error)}>
                  {String(error)}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="serviceUnitId">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor={field.name}>Unidad de servicio (opcional)</Label>
              <SearchSelect
                clearable
                emptyMessage="Escribe para buscar unidades"
                loading={serviceUnitsLoading}
                onChange={(v) => field.handleChange(v)}
                onSearchChange={setServiceUnitSearch}
                options={
                  serviceUnitsData?.serviceUnits.map((u) => ({
                    value: u.id,
                    label: u.name,
                    description: u.serviceCode,
                  })) ?? []
                }
                placeholder="Buscar unidad..."
                search={serviceUnitSearch}
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="scheduledAtDate">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor={field.name}>Fecha *</Label>
              <Input
                autoFocus
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                type="date"
                value={field.state.value}
              />
              {field.state.meta.errors.map((error) => (
                <p className="text-destructive text-xs" key={String(error)}>
                  {String(error)}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="scheduledAtTime">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor={field.name}>Hora *</Label>
              <Input
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                type="time"
                value={field.state.value}
              />
              {field.state.meta.errors.map((error) => (
                <p className="text-destructive text-xs" key={String(error)}>
                  {String(error)}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="durationMinutes">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor={field.name}>Duración (minutos) *</Label>
              <Input
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) =>
                  field.handleChange(Number.parseInt(e.target.value, 10) || 30)
                }
                type="number"
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="reason">
          {(field) => (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={field.name}>Motivo de consulta *</Label>
              <Input
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Motivo de la cita"
                value={field.state.value}
              />
              {field.state.meta.errors.map((error) => (
                <p className="text-destructive text-xs" key={String(error)}>
                  {String(error)}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="notes">
          {(field) => (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={field.name}>Notas (opcional)</Label>
              <Input
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Notas adicionales"
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>
      </div>

      {pendingConflicts.length > 0 && (
        <div className="space-y-2 border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
          <p className="flex items-center gap-1.5 font-medium text-amber-800 text-sm dark:text-amber-200">
            <AlertTriangle size={14} />
            Se encontraron conflictos de agenda
          </p>
          <div className="space-y-1">
            {pendingConflicts.map((c) => (
              <div
                className="text-amber-700 text-xs dark:text-amber-300"
                key={c.appointmentId}
              >
                <p className="font-medium">{c.reason}</p>
                <p className="text-amber-600 dark:text-amber-400">
                  {new Date(c.scheduledAt).toLocaleString("es-CO")} (
                  {c.durationMinutes} min)
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => {
                setPendingConflicts([]);
                setConfirmedDespiteConflicts(false);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              Modificar datos
            </Button>
            <Button
              onClick={() => {
                setConfirmedDespiteConflicts(true);
                form.handleSubmit();
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              Confirmar de todos modos
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onCancel} type="button" variant="outline">
          Cancelar
        </Button>
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              disabled={
                !canSubmit || isSubmitting || pendingConflicts.length > 0
              }
              type="submit"
            >
              {isSubmitting
                ? "Guardando..."
                : editingId
                  ? "Actualizar cita"
                  : "Guardar cita"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}

function AppointmentsPage() {
  const { patientId: defaultPatientId } = useSearch({
    from: "/_authenticated/appointments/",
  });
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [showForm, setShowForm] = useState(!!defaultPatientId);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [editingAppointment, setEditingAppointment] = useState<
    NonNullable<typeof data>["appointments"][number] | null
  >(null);
  const [filterPractitionerId, setFilterPractitionerId] = useState("");
  const [practitionerSearch, setPractitionerSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "" | "scheduled" | "confirmed" | "cancelled" | "completed" | "no-show"
  >("");
  const [searchValue, setSearchValue] = useState("");
  const [querySearch, setQuerySearch] = useState("");

  useEffect(() => {
    document.title = "Agenda | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowForm(false);
        setSelectedAppointmentId(null);
        setEditingAppointment(null);
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuerySearch(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const fromDate = new Date(currentYear, currentMonth, 1);
  const toDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

  const { data: practitionersData, isLoading: practitionersLoading } = useQuery(
    orpc.facilities.listPractitioners.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: practitionerSearch || undefined,
      },
    })
  );

  const { data, isLoading } = useQuery(
    orpc.appointments.list.queryOptions({
      input: {
        fromDate,
        limit: 500,
        offset: 0,
        practitionerId: filterPractitionerId || undefined,
        search: querySearch || undefined,
        sortBy: "scheduledAt",
        sortDirection: "asc",
        status: filterStatus || undefined,
        toDate,
      },
    })
  );

  const cancelMutation = useMutation({
    ...orpc.appointments.cancel.mutationOptions(),
    onSuccess: () => {
      toast.success("Cita cancelada");
      queryClient.invalidateQueries({
        queryKey: orpc.appointments.list.key({ type: "query" }),
      });
      setSelectedAppointmentId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al cancelar cita");
    },
  });

  const calendarDays = useMemo(
    () => getMonthData(currentYear, currentMonth),
    [currentMonth, currentYear]
  );

  const appointmentsByDay = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<typeof data>["appointments"][number][]
    >();
    if (!data) {
      return map;
    }

    for (const appt of data.appointments) {
      const dateKey = new Date(appt.scheduledAt).toDateString();
      const existing = map.get(dateKey) ?? [];
      existing.push(appt);
      map.set(dateKey, existing);
    }
    return map;
  }, [data]);

  function goToPrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  function goToToday() {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  }

  const selectedAppointment = useMemo(() => {
    if (!(selectedAppointmentId && data)) {
      return null;
    }
    return (
      data.appointments.find((a) => a.id === selectedAppointmentId) ?? null
    );
  }, [selectedAppointmentId, data]);

  const { data: selectedPatient } = useQuery({
    ...orpc.patients.get.queryOptions({
      input: { id: selectedAppointment?.patientId ?? "" },
    }),
    enabled: !!selectedAppointment?.patientId,
  });

  const { data: selectedPractitioner } = useQuery({
    ...orpc.facilities.getPractitioner.queryOptions({
      input: { id: selectedAppointment?.practitionerId ?? "" },
    }),
    enabled: !!selectedAppointment?.practitionerId,
  });

  const createEncounterMutation = useMutation({
    ...orpc.encounters.create.mutationOptions(),
    onSuccess: (encounter) => {
      if (!selectedAppointment) {
        toast.error("No se encontró la cita para vincular la atención");
        return;
      }
      updateAppointmentMutation.mutate({
        id: selectedAppointment.id,
        encounterId: encounter.id,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear atención");
    },
  });

  const updateAppointmentMutation = useMutation({
    ...orpc.appointments.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Cita convertida a atención");
      queryClient.invalidateQueries({
        queryKey: orpc.appointments.list.key({ type: "query" }),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.encounters.list.key({ type: "query" }),
      });
      setSelectedAppointmentId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar cita");
    },
  });

  function handleConvertToEncounter() {
    if (!selectedAppointment) {
      return;
    }
    if (!selectedAppointment.serviceUnitId) {
      toast.error("La cita no tiene unidad de servicio asignada");
      return;
    }
    createEncounterMutation.mutate({
      patientId: selectedAppointment.patientId,
      siteId: selectedAppointment.siteId,
      serviceUnitId: selectedAppointment.serviceUnitId,
      encounterClass: "01",
      careModality: "01",
      reasonForVisit: selectedAppointment.reason,
      startedAt: new Date(),
      status: "in-progress",
      admissionSource: null,
      causeExternalCode: null,
      finalidadConsultaCode: null,
      modalidadAtencionCode: null,
      vidaCode: null,
      condicionDestinoCode: null,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={goToToday} size="sm" variant="outline">
              <CalendarDays size={14} />
              <span className="ml-1.5">Hoy</span>
            </Button>
            <Button
              onClick={() => {
                setEditingAppointment(null);
                setSelectedDate(new Date());
                setShowForm(true);
              }}
              size="sm"
            >
              <Plus size={14} />
              Nueva cita
            </Button>
          </div>
        }
        description="Gestión de citas médicas programadas"
        icon={Calendar}
        iconBgClass="bg-rose-100 text-rose-600"
        title="Agenda"
      />

      <Card className="shadow-sm">
        <CardContent className="flex flex-wrap items-end gap-2 py-3">
          <div className="flex items-center gap-2">
            <Search className="text-muted-foreground" size={14} />
            <SearchSelect
              className="max-w-xs"
              clearable
              emptyMessage="Escribe para buscar profesionales"
              loading={practitionersLoading}
              onChange={(v) => setFilterPractitionerId(v)}
              onSearchChange={setPractitionerSearch}
              options={
                practitionersData?.practitioners.map((p) => ({
                  value: p.id,
                  label: p.fullName,
                  description: p.documentNumber,
                })) ?? []
              }
              placeholder="Filtrar por profesional..."
              search={practitionerSearch}
              value={filterPractitionerId}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Estado</Label>
            <Select
              onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}
              value={filterStatus}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="scheduled">Programada</SelectItem>
                <SelectItem value="confirmed">Confirmada</SelectItem>
                <SelectItem value="completed">Completada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
                <SelectItem value="no-show">No asistió</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Buscar</Label>
            <Input
              className="w-48"
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Motivo o notas..."
              value={searchValue}
            />
          </div>
          {(filterPractitionerId || filterStatus || searchValue) && (
            <Button
              onClick={() => {
                setFilterPractitionerId("");
                setPractitionerSearch("");
                setFilterStatus("");
                setSearchValue("");
              }}
              size="sm"
              variant="ghost"
            >
              <FilterX size={14} />
              Limpiar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                aria-label="Mes anterior"
                className="hover:bg-primary/10 hover:text-primary"
                onClick={goToPrevMonth}
                size="icon"
                variant="ghost"
              >
                <ChevronLeft size={16} />
              </Button>
              <h2 className="min-w-40 text-center font-semibold text-lg">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <Button
                aria-label="Mes siguiente"
                className="hover:bg-primary/10 hover:text-primary"
                onClick={goToNextMonth}
                size="icon"
                variant="ghost"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
            <div className="hidden items-center gap-3 text-xs sm:flex">
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <div className="flex items-center gap-1.5" key={key}>
                  <Circle className={cfg.color} fill="currentColor" size={12} />
                  <span>{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7">
            {WEEK_DAYS.map((day) => (
              <div
                className="border-r border-b bg-muted/30 py-2 text-center font-medium text-muted-foreground text-xs uppercase tracking-wider shadow-sm last:border-r-0"
                key={day}
              >
                {day}
              </div>
            ))}
            {isLoading
              ? Array.from({ length: 35 }).map((_, i) => (
                  <div
                    className="min-h-28 border-r border-b bg-background p-1.5 shadow-sm last:border-r-0"
                    key={`sk-${i}`}
                  >
                    <div className="mb-2 h-4 w-6 rounded-sm bg-muted" />
                    <div className="space-y-1">
                      <div className="h-4 w-full rounded-sm bg-muted" />
                      <div className="h-4 w-3/4 rounded-sm bg-muted" />
                    </div>
                  </div>
                ))
              : calendarDays.map(({ date, isCurrentMonth }) => {
                  const isToday = isSameDay(date, today);
                  const dateKey = date.toDateString();
                  const dayAppointments = appointmentsByDay.get(dateKey) ?? [];

                  function getDayNumberClass() {
                    if (isToday) {
                      return "inline-flex size-6 items-center justify-center bg-slate-900 font-bold text-white shadow-sm";
                    }
                    if (isCurrentMonth) {
                      return "font-medium text-foreground";
                    }
                    return "text-muted-foreground";
                  }

                  return (
                    <button
                      className={`min-h-28 cursor-pointer border-r border-b p-1.5 text-left shadow-sm transition-all duration-150 last:border-r-0 hover:shadow-md ${
                        isCurrentMonth ? "bg-background" : "bg-muted/30"
                      } ${isToday ? "bg-blue-50/70 dark:bg-blue-950/30" : ""} hover:bg-muted/40`}
                      key={dateKey}
                      onClick={() => {
                        setEditingAppointment(null);
                        setSelectedDate(date);
                        setShowForm(true);
                      }}
                      type="button"
                    >
                      <div
                        className={`mb-1 text-right text-xs ${getDayNumberClass()}`}
                      >
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayAppointments.slice(0, 3).map((appt) => {
                          const cfg = statusConfig[appt.status] ?? {
                            color: "bg-slate-500",
                            label: appt.status,
                          };
                          return (
                            <button
                              className={`flex w-full items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-left text-[10px] shadow-sm transition-all duration-150 hover:opacity-80 hover:shadow-md ${
                                appt.status === "cancelled"
                                  ? "bg-muted line-through opacity-60"
                                  : appt.status === "scheduled"
                                    ? "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                                    : appt.status === "confirmed"
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                      : appt.status === "no-show"
                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                              key={appt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAppointmentId(appt.id);
                              }}
                              type="button"
                            >
                              <span
                                className={`size-2.5 shrink-0 rounded-full ${cfg.color}`}
                              />
                              <span className="truncate">
                                {formatTime(new Date(appt.scheduledAt))}{" "}
                                {appt.reason}
                              </span>
                            </button>
                          );
                        })}
                        {dayAppointments.length > 3 && (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground shadow-sm">
                            +{dayAppointments.length - 3} más
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
          </div>
        </CardContent>
      </Card>

      {/* Create Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
        >
          <Card className="mx-4 max-h-[90vh] w-full max-w-lg overflow-auto shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-sm bg-rose-100 text-rose-600 shadow-sm">
                  <Calendar size={16} />
                </div>
                <CardTitle>
                  {editingAppointment ? "Editar cita" : "Nueva cita"}
                </CardTitle>
              </div>
              <Button
                aria-label="Cerrar"
                onClick={() => {
                  setShowForm(false);
                  setEditingAppointment(null);
                }}
                size="icon"
                variant="ghost"
              >
                <X size={16} />
              </Button>
            </CardHeader>
            <CardContent>
              <AppointmentForm
                defaultPatientId={defaultPatientId}
                editingId={editingAppointment?.id}
                initialDate={selectedDate}
                initialValues={
                  editingAppointment
                    ? {
                        durationMinutes: editingAppointment.durationMinutes,
                        notes: editingAppointment.notes ?? "",
                        patientId: editingAppointment.patientId,
                        practitionerId: editingAppointment.practitionerId ?? "",
                        reason: editingAppointment.reason,
                        scheduledAtDate: new Date(
                          editingAppointment.scheduledAt
                        )
                          .toISOString()
                          .split("T")[0],
                        scheduledAtTime: formatTime(
                          new Date(editingAppointment.scheduledAt)
                        ),
                        serviceUnitId: editingAppointment.serviceUnitId ?? "",
                        siteId: editingAppointment.siteId,
                      }
                    : undefined
                }
                key={editingAppointment?.id || "new"}
                onCancel={() => {
                  setShowForm(false);
                  setEditingAppointment(null);
                }}
                onSuccess={() => {
                  setShowForm(false);
                  setEditingAppointment(null);
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detail Modal */}
      {selectedAppointment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
        >
          <Card className="mx-4 w-full max-w-sm shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-sm bg-rose-100 text-rose-600 shadow-sm">
                  <Calendar size={16} />
                </div>
                <CardTitle>Detalle de cita</CardTitle>
              </div>
              <Button
                aria-label="Cerrar"
                onClick={() => setSelectedAppointmentId(null)}
                size="icon"
                variant="ghost"
              >
                <X size={16} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex size-7 items-center justify-center rounded-sm bg-primary/10 text-primary shadow-sm">
                    <Clock size={14} />
                  </div>
                  <span>
                    {new Date(
                      selectedAppointment.scheduledAt
                    ).toLocaleDateString("es-CO", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                    , {formatTime(new Date(selectedAppointment.scheduledAt))} (
                    {selectedAppointment.durationMinutes} min)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex size-7 items-center justify-center rounded-sm bg-teal-100 text-teal-600 shadow-sm">
                    <User size={14} />
                  </div>
                  <span>
                    Paciente:{" "}
                    {selectedPatient
                      ? `${selectedPatient.firstName} ${selectedPatient.lastName1}`
                      : `${selectedAppointment.patientId.slice(0, 8)}…`}
                  </span>
                </div>
                {selectedAppointment.practitionerId && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex size-7 items-center justify-center rounded-sm bg-violet-100 text-violet-600 shadow-sm">
                      <Stethoscope size={14} />
                    </div>
                    <span>
                      Profesional:{" "}
                      {selectedPractitioner
                        ? selectedPractitioner.fullName
                        : `${selectedAppointment.practitionerId.slice(0, 8)}…`}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex size-7 items-center justify-center rounded-sm bg-slate-100 text-slate-600 shadow-sm">
                    <span
                      className={`size-2.5 rounded-full ${
                        statusConfig[selectedAppointment.status]?.color ??
                        "bg-slate-500"
                      }`}
                    />
                  </div>
                  <span>
                    Estado:{" "}
                    {statusConfig[selectedAppointment.status]?.label ??
                      selectedAppointment.status}
                  </span>
                </div>
                <div className="rounded-sm border bg-card p-3 text-sm shadow-sm">
                  <p className="font-medium text-muted-foreground text-xs">
                    Motivo
                  </p>
                  <p className="mt-1">{selectedAppointment.reason}</p>
                </div>
                {selectedAppointment.notes && (
                  <div className="rounded-sm border bg-card p-3 text-sm shadow-sm">
                    <p className="font-medium text-muted-foreground text-xs">
                      Notas
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {selectedAppointment.notes}
                    </p>
                  </div>
                )}
                {selectedAppointment.cancelledReason && (
                  <div className="border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950">
                    <p className="font-medium text-red-700 text-xs dark:text-red-300">
                      Motivo de cancelación
                    </p>
                    <p className="mt-1 text-red-600 dark:text-red-300">
                      {selectedAppointment.cancelledReason}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={() => setSelectedAppointmentId(null)}
                  size="sm"
                  variant="outline"
                >
                  Cerrar
                </Button>
                {selectedAppointment.status !== "cancelled" &&
                  selectedAppointment.status !== "completed" && (
                    <Button
                      onClick={() => {
                        setSelectedAppointmentId(null);
                        setEditingAppointment(selectedAppointment);
                        setShowForm(true);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <Pencil size={14} />
                      <span className="ml-1.5">Editar</span>
                    </Button>
                  )}
                {selectedAppointment.status !== "cancelled" &&
                  selectedAppointment.status !== "completed" &&
                  !selectedAppointment.encounterId && (
                    <Button
                      disabled={
                        createEncounterMutation.isPending ||
                        updateAppointmentMutation.isPending
                      }
                      onClick={handleConvertToEncounter}
                      size="sm"
                      variant="default"
                    >
                      <Stethoscope size={14} />
                      <span className="ml-1.5">
                        {createEncounterMutation.isPending ||
                        updateAppointmentMutation.isPending
                          ? "Convirtiendo..."
                          : "Convertir a atención"}
                      </span>
                    </Button>
                  )}
                {selectedAppointment.status !== "cancelled" &&
                  selectedAppointment.status !== "completed" && (
                    <Button
                      disabled={cancelMutation.isPending}
                      onClick={() =>
                        cancelMutation.mutate({
                          cancelledReason: "Cancelada por el usuario",
                          id: selectedAppointment.id,
                        })
                      }
                      size="sm"
                      variant="destructive"
                    >
                      {cancelMutation.isPending
                        ? "Cancelando..."
                        : "Cancelar cita"}
                    </Button>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
