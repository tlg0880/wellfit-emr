import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
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
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Plus,
  X,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  computeStatus,
  createRequest,
  type PatientCopyRequest,
  usePatientRequests,
} from "@/contexts/patient-requests-context";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/patient-requests/")({
  component: PatientRequestsPage,
});

/* ─── helpers ─── */

function formatEsCO(date: Date): string {
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatEsCODatetime(date: Date): string {
  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadgeClasses(
  status: "Recibida" | "En preparación" | "Entregada" | "Vencida"
): string {
  switch (status) {
    case "Recibida":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "En preparación":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "Entregada":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Vencida":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

/* ─── schema ─── */

const patientRequestSchema = z.object({
  patientId: z.string().min(1, "El paciente es obligatorio"),
  scope: z.string().min(1, "El alcance es obligatorio"),
  deliveryChannel: z.string().min(1, "El canal de entrega es obligatorio"),
  requester: z.string().min(1, "El solicitante es obligatorio"),
  legalBasis: z.string().min(1, "La base legal es obligatoria"),
  notes: z.string(),
});

/* ─── form component ─── */

function CreateRequestForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const [patientSearch, setPatientSearch] = useState("");

  const { data: patientsData, isLoading: patientsLoading } = useQuery(
    orpc.patients.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: patientSearch || undefined,
      },
    })
  );

  const patientOptions =
    patientsData?.patients.map((p) => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName1}`,
      description: `${p.primaryDocumentType} ${p.primaryDocumentNumber}`,
    })) ?? [];

  const { addRequest } = usePatientRequests();

  const form = useForm({
    defaultValues: {
      patientId: "",
      scope: "",
      deliveryChannel: "",
      requester: "",
      legalBasis: "",
      notes: "",
    },
    onSubmit: ({ value }) => {
      const selectedPatient = patientOptions.find(
        (o) => o.value === value.patientId
      );
      const request = createRequest({
        patientId: value.patientId,
        patientName: selectedPatient?.label ?? "Paciente desconocido",
        scope: value.scope,
        deliveryChannel: value.deliveryChannel,
        requester: value.requester,
        legalBasis: value.legalBasis,
        notes: value.notes,
      });
      addRequest(request);
      onSubmit();
    },
    validators: {
      onSubmit: patientRequestSchema,
    },
  });

  return (
    <Card className="mx-6">
      <CardHeader>
        <CardTitle>Nueva solicitud de copia</CardTitle>
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
                  emptyMessage="No se encontraron pacientes"
                  loading={patientsLoading}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setPatientSearch}
                  options={patientOptions}
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

          <form.Field name="scope">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Alcance</Label>
                <select
                  className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  value={field.state.value}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Completa">Completa</option>
                  <option value="Parcial">Parcial</option>
                  <option value="Resumen">Resumen</option>
                </select>
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="deliveryChannel">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Canal de entrega</Label>
                <select
                  className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  value={field.state.value}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Físico">Físico</option>
                  <option value="Correo electrónico">Correo electrónico</option>
                  <option value="Portal del paciente">
                    Portal del paciente
                  </option>
                </select>
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="requester">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Solicitante</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Nombre del solicitante"
                  required
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

          <form.Field name="legalBasis">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Base legal</Label>
                <select
                  className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  value={field.state.value}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Ley 23 de 1981">Ley 23 de 1981</option>
                  <option value="Ley 1581 de 2012">Ley 1581 de 2012</option>
                  <option value="Resolución 1995 de 1999">
                    Resolución 1995 de 1999
                  </option>
                  <option value="Ley 2015 de 2020">Ley 2015 de 2020</option>
                  <option value="Resolución 866 de 2021">
                    Resolución 866 de 2021
                  </option>
                  <option value="Resolución 1888 de 2025">
                    Resolución 1888 de 2025
                  </option>
                </select>
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
              <div className="space-y-1 md:col-span-3">
                <Label htmlFor={field.name}>Notas (opcional)</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  value={field.state.value}
                />
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
                  {isSubmitting ? "Guardando..." : "Crear solicitud"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── status badge ─── */

function StatusBadge({
  status,
}: {
  status: "Recibida" | "En preparación" | "Entregada" | "Vencida";
}) {
  return (
    <span
      className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${getStatusBadgeClasses(status)}`}
    >
      {status}
    </span>
  );
}

/* ─── page ─── */

function PatientRequestsPage() {
  const { requests, expandedId, setExpandedId, updateRequestStatus } =
    usePatientRequests();
  const [showForm, setShowForm] = useState(false);

  function handleCreate() {
    setShowForm(false);
  }

  function handleCancelForm() {
    setShowForm(false);
  }

  const columns = [
    {
      header: "Paciente",
      accessor: (row: PatientCopyRequest) => (
        <span className="font-medium">{row.patientName}</span>
      ),
    },
    {
      header: "Alcance",
      accessor: (row: PatientCopyRequest) => row.scope,
    },
    {
      header: "Canal",
      accessor: (row: PatientCopyRequest) => row.deliveryChannel,
    },
    {
      header: "Fecha límite",
      accessor: (row: PatientCopyRequest) => (
        <span className="inline-flex items-center gap-1">
          <Clock size={12} />
          {formatEsCO(row.deadline)}
        </span>
      ),
    },
    {
      header: "Estado",
      accessor: (row: PatientCopyRequest) => (
        <StatusBadge status={computeStatus(row)} />
      ),
    },
    {
      header: "Solicitante",
      accessor: (row: PatientCopyRequest) => row.requester,
    },
    {
      header: "Base legal",
      accessor: (row: PatientCopyRequest) => row.legalBasis,
    },
    {
      header: "Acciones",
      accessor: (row: PatientCopyRequest) => {
        const currentStatus = computeStatus(row);
        return (
          <div className="flex items-center gap-1">
            {currentStatus === "Recibida" && (
              <Button
                onClick={() => updateRequestStatus(row.id, "En preparación")}
                size="xs"
                variant="outline"
              >
                Preparar
              </Button>
            )}
            {currentStatus === "En preparación" && (
              <Button
                onClick={() => updateRequestStatus(row.id, "Entregada")}
                size="xs"
                variant="outline"
              >
                Entregar
              </Button>
            )}
            <Button
              onClick={() =>
                setExpandedId(expandedId === row.id ? null : row.id)
              }
              size="icon-xs"
              variant="ghost"
            >
              {expandedId === row.id ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </Button>
          </div>
        );
      },
      className: "w-24",
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <Button onClick={() => setShowForm((s) => !s)} size="sm">
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancelar" : "Nueva solicitud de copia"}
          </Button>
        }
        description="Solicitudes de copia de historia clínica del paciente"
        title="Solicitudes del paciente"
      />

      {/* Session disclaimer */}
      <div className="mx-6 flex items-start gap-2 border border-amber-200 bg-amber-50 px-4 py-2">
        <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={14} />
        <p className="text-amber-800 text-xs">
          Las solicitudes mostradas se almacenan únicamente en memoria durante
          esta sesión. Se perderán al recargar la página.
        </p>
      </div>

      {showForm && (
        <CreateRequestForm
          onCancel={handleCancelForm}
          onSubmit={handleCreate}
        />
      )}

      <div className="px-6">
        {requests.length === 0 ? (
          <EmptyState
            actionLabel="Nueva solicitud de copia"
            description="No hay solicitudes de copia registradas. Cree la primera solicitud para comenzar."
            onAction={() => setShowForm(true)}
            title="No hay solicitudes de copia registradas"
          />
        ) : (
          <div className="space-y-2">
            <DataTable
              columns={columns}
              data={requests}
              emptyDescription="No hay solicitudes de copia registradas."
              emptyTitle="Sin solicitudes"
              isLoading={false}
              keyExtractor={(row) => row.id}
            />
            {/* Detail expansion rows */}
            {expandedId && (
              <Card className="mx-0">
                <CardContent className="p-4">
                  {(() => {
                    const req = requests.find((r) => r.id === expandedId);
                    if (!req) {
                      return null;
                    }
                    return (
                      <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                        <div>
                          <span className="text-muted-foreground">
                            Paciente:
                          </span>{" "}
                          <span className="font-medium">{req.patientName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            ID paciente:
                          </span>{" "}
                          <span className="font-mono">{req.patientId}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Alcance:
                          </span>{" "}
                          {req.scope}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Canal:</span>{" "}
                          {req.deliveryChannel}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Solicitante:
                          </span>{" "}
                          {req.requester}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Base legal:
                          </span>{" "}
                          {req.legalBasis}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Fecha creación:
                          </span>{" "}
                          {formatEsCODatetime(req.createdAt)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Fecha límite:
                          </span>{" "}
                          {formatEsCODatetime(req.deadline)}
                        </div>
                        {req.notes && (
                          <div className="md:col-span-2">
                            <span className="text-muted-foreground">
                              Notas:
                            </span>{" "}
                            {req.notes}
                          </div>
                        )}
                        <div className="md:col-span-2">
                          <span className="text-muted-foreground">
                            Estado actual:
                          </span>{" "}
                          <StatusBadge status={computeStatus(req)} />
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
