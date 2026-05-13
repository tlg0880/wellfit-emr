import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
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
  Eye,
  FileCheck,
  FilterX,
  FlaskConical,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

const searchSchema = z.object({
  encounterId: z.string().optional(),
  patientId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/service-requests/")({
  component: ServiceRequestsListPage,
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

function CreateServiceRequestForm({
  onCancel,
  defaultPatientId,
  defaultEncounterId,
}: {
  onCancel: () => void;
  defaultPatientId?: string;
  defaultEncounterId?: string;
}) {
  const [patientSearch, setPatientSearch] = useState("");
  const [encounterSearch, setEncounterSearch] = useState("");
  const [practitionerSearch, setPractitionerSearch] = useState("");
  const [cupsSearch, setCupsSearch] = useState("");

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

  const { data: encountersData, isLoading: encountersLoading } = useQuery(
    orpc.encounters.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: encounterSearch || undefined,
      },
    })
  );

  const { data: defaultEncounterData } = useQuery({
    ...orpc.encounters.get.queryOptions({
      input: { id: defaultEncounterId ?? "" },
    }),
    enabled: !!defaultEncounterId,
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

  const { data: cupsData, isLoading: cupsLoading } = useQuery(
    orpc.ripsReference.listEntries.queryOptions({
      input: {
        tableName: "CUPSRips",
        limit: 20,
        search: cupsSearch || undefined,
      },
    })
  );

  const create = useMutation({
    ...orpc.serviceRequests.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Orden de servicio creada");
      queryClient.invalidateQueries({
        queryKey: orpc.serviceRequests.list.key({ type: "query" }),
      });
      onCancel();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear orden");
    },
  });

  const form = useForm({
    defaultValues: {
      patientId: defaultPatientId ?? "",
      encounterId: defaultEncounterId ?? "",
      requestType: "laboratory",
      requestCode: "",
      priority: "routine",
      requestedBy: "",
      requestedAt: new Date().toISOString().slice(0, 16),
    },
    onSubmit: async ({ value }) => {
      await create.mutateAsync({
        patientId: value.patientId,
        encounterId: value.encounterId,
        requestType: value.requestType,
        requestCode: value.requestCode,
        priority: value.priority,
        requestedBy: value.requestedBy,
        requestedAt: new Date(value.requestedAt),
        status: "active",
      });
    },
    validators: {
      onSubmit: z.object({
        patientId: z.string().min(1, "Requerido"),
        encounterId: z.string().min(1, "Requerido"),
        requestType: z.string().min(1, "Requerido"),
        requestCode: z.string().min(1, "Requerido"),
        priority: z.string().min(1, "Requerido"),
        requestedBy: z.string().min(1, "Requerido"),
        requestedAt: z.string().min(1, "Requerido"),
      }),
    },
  });

  return (
    <Card className="mx-6">
      <CardHeader>
        <CardTitle>Nueva orden de servicio</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field name="patientId">
            {(field) => (
              <div className="space-y-1">
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

          <form.Field name="encounterId">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Atención *</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar atenciones"
                  loading={encountersLoading}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setEncounterSearch}
                  options={[
                    ...(defaultEncounterData && defaultEncounterId
                      ? [
                          {
                            value: defaultEncounterData.id,
                            label:
                              defaultEncounterData.reasonForVisit ||
                              "Sin motivo",
                            description: new Date(
                              defaultEncounterData.startedAt
                            ).toLocaleDateString("es-CO"),
                          },
                        ]
                      : []),
                    ...(encountersData?.encounters ?? [])
                      .filter((e) => e.id !== defaultEncounterId)
                      .map((e) => ({
                        value: e.id,
                        label: e.reasonForVisit || "Sin motivo",
                        description: new Date(e.startedAt).toLocaleDateString(
                          "es-CO"
                        ),
                      })),
                  ]}
                  placeholder="Buscar atención..."
                  required
                  search={encounterSearch}
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

          <form.Field name="requestType">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Tipo de solicitud *</Label>
                <Select
                  onValueChange={(v) => field.handleChange(v as string)}
                  value={field.state.value}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laboratory">Laboratorio</SelectItem>
                    <SelectItem value="imaging">Imagenología</SelectItem>
                    <SelectItem value="procedure">Procedimiento</SelectItem>
                    <SelectItem value="consultation">Consulta</SelectItem>
                  </SelectContent>
                </Select>
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="requestCode">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Código CUPS *</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar en CUPS"
                  loading={cupsLoading}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setCupsSearch}
                  options={
                    cupsData?.entries.map((e) => ({
                      value: e.code,
                      label: e.name,
                      description: e.code,
                    })) ?? []
                  }
                  placeholder="Buscar CUPS..."
                  required
                  search={cupsSearch}
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

          <form.Field name="priority">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Prioridad *</Label>
                <Select
                  onValueChange={(v) => field.handleChange(v as string)}
                  value={field.state.value}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Rutina</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="requestedBy">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Solicitado por *</Label>
                <SearchSelect
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
                  required
                  search={practitionerSearch}
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

          <form.Field name="requestedAt">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Fecha solicitud *</Label>
                <Input
                  autoFocus
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  type="datetime-local"
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

          <div className="flex items-end gap-2 md:col-span-3">
            <Button
              onClick={onCancel}
              size="sm"
              type="button"
              variant="outline"
            >
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
                  disabled={!canSubmit || isSubmitting}
                  size="sm"
                  type="submit"
                >
                  {isSubmitting ? "Guardando..." : "Guardar orden"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── Diagnostic Report Modal ─── */

function DiagnosticReportModal({
  requestId,
  encounterId,
  onClose,
}: {
  requestId: string;
  encounterId: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const { data: report, isLoading } = useQuery(
    orpc.serviceRequests.getReport.queryOptions({
      input: { requestId },
    })
  );

  const createReport = useMutation({
    ...orpc.serviceRequests.createReport.mutationOptions(),
    onSuccess: () => {
      toast.success("Reporte diagnóstico creado");
      queryClient.invalidateQueries({
        queryKey: orpc.serviceRequests.getReport.key({ type: "query" }),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.serviceRequests.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear reporte");
    },
  });

  const form = useForm({
    defaultValues: {
      reportType: "",
      conclusionText: "",
      issuedAt: new Date().toISOString().slice(0, 16),
    },
    onSubmit: async ({ value }) => {
      await createReport.mutateAsync({
        requestId,
        encounterId,
        reportType: value.reportType,
        conclusionText: value.conclusionText || null,
        issuedAt: new Date(value.issuedAt),
        status: "final",
        performerOrgId: null,
      });
    },
    validators: {
      onSubmit: z.object({
        reportType: z.string().min(1, "Requerido"),
        conclusionText: z.string(),
        issuedAt: z.string().min(1, "Requerido"),
      }),
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
    >
      <Card className="mx-4 max-h-[90vh] w-full max-w-lg overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>Reporte diagnóstico</CardTitle>
          <Button
            aria-label="Cerrar"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X size={16} />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Cargando...</p>
          ) : report ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Tipo</p>
                  <p className="font-medium">{report.reportType}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Estado</p>
                  <p className="font-medium">{report.status}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Fecha emisión
                  </p>
                  <p className="font-medium">
                    {new Date(report.issuedAt).toLocaleString("es-CO")}
                  </p>
                </div>
              </div>
              <div className="border p-3">
                <p className="text-[10px] text-muted-foreground">Conclusión</p>
                <p className="mt-1 whitespace-pre-wrap">
                  {report.conclusionText ?? "Sin conclusión"}
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={onClose} size="sm" variant="outline">
                  Cerrar
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
            >
              <form.Field name="reportType">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Tipo de reporte</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Ej: laboratorio, imagenología"
                      required
                      value={field.state.value}
                    />
                    {field.state.meta.errors.map((error) => (
                      <p
                        className="text-destructive text-xs"
                        key={String(error)}
                      >
                        {String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Field name="conclusionText">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Conclusión</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Describa los hallazgos"
                      value={field.state.value}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="issuedAt">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Fecha de emisión</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      type="datetime-local"
                      value={field.state.value}
                    />
                    {field.state.meta.errors.map((error) => (
                      <p
                        className="text-destructive text-xs"
                        key={String(error)}
                      >
                        {String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={onClose} type="button" variant="outline">
                  Cancelar
                </Button>
                <form.Subscribe
                  selector={(state) => ({
                    canSubmit: state.canSubmit,
                    isSubmitting: state.isSubmitting,
                  })}
                >
                  {({ canSubmit, isSubmitting }) => (
                    <Button disabled={!canSubmit || isSubmitting} type="submit">
                      {isSubmitting ? "Guardando..." : "Guardar reporte"}
                    </Button>
                  )}
                </form.Subscribe>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Service Request Row with Report Indicator ─── */

function ServiceRequestRowActions({
  row,
}: {
  row: {
    id: string;
    encounterId: string;
    requestType: string;
    requestCode: string;
    priority: string;
    status: string;
    requestedAt: Date;
  };
}) {
  const [showModal, setShowModal] = useState(false);

  const { data: report } = useQuery(
    orpc.serviceRequests.getReport.queryOptions({
      input: { requestId: row.id },
    })
  );

  const hasReport = !!report;

  return (
    <>
      <Button
        aria-label="Ver reporte diagnóstico"
        onClick={() => setShowModal(true)}
        size="icon-xs"
        variant={hasReport ? "default" : "ghost"}
      >
        <FileCheck
          className={hasReport ? "text-white" : "text-muted-foreground"}
          size={14}
        />
      </Button>

      {showModal && (
        <DiagnosticReportModal
          encounterId={row.encounterId}
          onClose={() => setShowModal(false)}
          requestId={row.id}
        />
      )}
    </>
  );
}

/* ─── Main Page ─── */

function ServiceRequestsListPage() {
  const navigate = useNavigate();
  const { encounterId: defaultEncounterId, patientId: defaultPatientId } =
    useSearch({
      from: "/_authenticated/service-requests/",
    });
  const [encounterId, setEncounterId] = useState(defaultEncounterId ?? "");
  const [encounterSearch, setEncounterSearch] = useState("");
  const [queryEncounterSearch, setQueryEncounterSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [showForm, setShowForm] = useState(
    !!(defaultEncounterId || defaultPatientId)
  );
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryEncounterSearch(encounterSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [encounterSearch]);

  useEffect(() => {
    document.title = "Órdenes de servicio | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  const { data: encountersData, isLoading: encountersLoading } = useQuery(
    orpc.encounters.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: queryEncounterSearch || undefined,
      },
    })
  );

  const { data, isLoading } = useQuery(
    orpc.serviceRequests.list.queryOptions({
      input: {
        limit,
        offset,
        encounterId: encounterId || undefined,
        status: filterStatus || undefined,
        sortDirection: "desc",
      },
    })
  );

  const deleteMutation = useMutation({
    ...orpc.serviceRequests.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Orden eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.serviceRequests.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar orden");
    },
  });

  const columns = [
    {
      header: "Tipo",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <FlaskConical size={14} />
          {row.requestType}
        </span>
      ),
    },
    {
      header: "Código",
      accessor: (row: NonNullable<typeof data>["items"][0]) => row.requestCode,
    },
    {
      header: "Prioridad",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span
          className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${
            row.priority === "stat"
              ? "border-red-200 bg-red-50 text-red-700"
              : row.priority === "urgent"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {row.priority}
        </span>
      ),
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>["items"][0]) => row.status,
    },
    {
      header: "Fecha solicitud",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.requestedAt).toLocaleString("es-CO"),
    },
    {
      header: "Acciones",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <div className="flex items-center gap-1">
          <ServiceRequestRowActions row={row} />
          <Link
            aria-label="Ver orden"
            className="inline-flex text-muted-foreground hover:text-foreground"
            params={{ requestId: row.id }}
            to="/service-requests/$requestId"
          >
            <Eye size={14} />
          </Link>
          <Button
            aria-label="Eliminar orden"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar esta orden permanentemente?")) {
                deleteMutation.mutate({ id: row.id });
              }
            }}
            size="icon-xs"
            variant="ghost"
          >
            <Trash2 size={12} />
          </Button>
        </div>
      ),
      className: "w-24",
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <Button onClick={() => setShowForm((s) => !s)} size="sm">
            <Plus size={14} />
            {showForm ? "Cancelar" : "Nueva orden"}
          </Button>
        }
        description="Órdenes de laboratorio, imagenología y procedimientos"
        icon={FlaskConical}
        iconBgClass="bg-teal-50 text-teal-600"
        title="Órdenes de servicio"
      />

      {showForm && (
        <CreateServiceRequestForm
          defaultEncounterId={defaultEncounterId}
          defaultPatientId={defaultPatientId}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="px-6">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <div className="flex items-center gap-2">
            <Search className="text-muted-foreground" size={14} />
            <SearchSelect
              className="max-w-xs"
              clearable
              emptyMessage="Escribe para buscar atenciones"
              loading={encountersLoading}
              onChange={(v) => {
                setEncounterId(v);
                setOffset(0);
              }}
              onSearchChange={setEncounterSearch}
              options={
                encountersData?.encounters.map((e) => ({
                  value: e.id,
                  label: e.reasonForVisit || "Sin motivo",
                  description: new Date(e.startedAt).toLocaleDateString(
                    "es-CO"
                  ),
                })) ?? []
              }
              placeholder="Filtrar por atención..."
              search={encounterSearch}
              value={encounterId}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Estado</Label>
            <Select
              onValueChange={(v) => {
                setFilterStatus(v as string);
                setOffset(0);
              }}
              value={filterStatus}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="completed">Completada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(encounterId || filterStatus) && (
            <Button
              onClick={() => {
                setEncounterId("");
                setEncounterSearch("");
                setFilterStatus("");
                setOffset(0);
              }}
              size="sm"
              variant="ghost"
            >
              <FilterX size={14} />
              Limpiar filtros
            </Button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          emptyDescription={
            encounterId || filterStatus
              ? "Ninguna orden coincide con los filtros aplicados."
              : "No se encontraron órdenes de servicio."
          }
          emptyTitle={
            encounterId || filterStatus ? "Sin resultados" : "Sin órdenes"
          }
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => {
            navigate({
              to: "/service-requests/$requestId",
              params: { requestId: row.id },
            });
          }}
          pagination={
            data
              ? {
                  limit,
                  offset,
                  total: data.total,
                  onPageChange: setOffset,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
