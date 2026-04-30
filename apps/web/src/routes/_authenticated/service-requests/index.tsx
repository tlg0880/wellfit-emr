import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
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
import { FileCheck, FlaskConical, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/service-requests/")({
  component: ServiceRequestsListPage,
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

function CreateServiceRequestForm({ onCancel }: { onCancel: () => void }) {
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

  const { data: encountersData, isLoading: encountersLoading } = useQuery(
    orpc.encounters.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: encounterSearch || undefined,
      },
    })
  );

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
      patientId: "",
      encounterId: "",
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
                <Label htmlFor={field.name}>Paciente</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar pacientes"
                  loading={patientsLoading}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setPatientSearch}
                  options={
                    patientsData?.patients.map((p) => ({
                      value: p.id,
                      label: `${p.firstName} ${p.lastName1}`,
                      description: `${p.primaryDocumentType} ${p.primaryDocumentNumber}`,
                    })) ?? []
                  }
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
                <Label htmlFor={field.name}>Atención</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar atenciones"
                  loading={encountersLoading}
                  onChange={(v) => field.handleChange(v)}
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
                <Label htmlFor={field.name}>Tipo de solicitud</Label>
                <select
                  className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  value={field.state.value}
                >
                  <option value="laboratory">Laboratorio</option>
                  <option value="imaging">Imagenología</option>
                  <option value="procedure">Procedimiento</option>
                  <option value="consultation">Consulta</option>
                </select>
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
                <Label htmlFor={field.name}>Código CUPS</Label>
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
                <Label htmlFor={field.name}>Prioridad</Label>
                <select
                  className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  value={field.state.value}
                >
                  <option value="routine">Rutina</option>
                  <option value="urgent">Urgente</option>
                  <option value="stat">STAT</option>
                </select>
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
                <Label htmlFor={field.name}>Solicitado por</Label>
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
                <Label htmlFor={field.name}>Fecha solicitud</Label>
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
          <Button onClick={onClose} size="icon" variant="ghost">
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
  const [encounterId, setEncounterId] = useState("");
  const [encounterSearch, setEncounterSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [showForm, setShowForm] = useState(false);

  const { data: encountersData, isLoading: encountersLoading } = useQuery(
    orpc.encounters.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: encounterSearch || undefined,
      },
    })
  );

  const { data, isLoading } = useQuery(
    orpc.serviceRequests.list.queryOptions({
      input: {
        limit,
        offset,
        encounterId: encounterId || undefined,
        sortDirection: "desc",
      },
    })
  );

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
      header: "Reporte",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <ServiceRequestRowActions row={row} />
      ),
      className: "w-16",
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
        title="Órdenes de servicio"
      />

      {showForm && (
        <CreateServiceRequestForm onCancel={() => setShowForm(false)} />
      )}

      <div className="px-6">
        <div className="mb-3 flex items-center gap-2">
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
                description: new Date(e.startedAt).toLocaleDateString("es-CO"),
              })) ?? []
            }
            placeholder="Filtrar por atención..."
            search={encounterSearch}
            value={encounterId}
          />
        </div>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          emptyDescription="No se encontraron órdenes de servicio."
          emptyTitle="Sin órdenes"
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
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
