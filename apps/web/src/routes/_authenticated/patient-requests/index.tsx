import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  FilterX,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

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

function computeStatus(
  row: {
    status: string;
    deadline: Date;
  },
  now = new Date()
): "Recibida" | "En preparación" | "Entregada" | "Vencida" {
  if (row.status === "Entregada") {
    return "Entregada";
  }
  if (new Date(row.deadline) < now) {
    return "Vencida";
  }
  return row.status as "Recibida" | "En preparación" | "Entregada" | "Vencida";
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

function RequestForm({
  onCancel,
  onSubmit,
  editingId,
  initialValues,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  editingId?: string;
  initialValues?: {
    patientId: string;
    patientName: string;
    scope: string;
    deliveryChannel: string;
    requester: string;
    legalBasis: string;
    notes: string | null;
    deadline: Date;
    status: string;
  };
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

  const createMutation = useMutation({
    ...orpc.patientCopyRequests.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Solicitud de copia creada");
      queryClient.invalidateQueries({
        queryKey: orpc.patientCopyRequests.list.key({ type: "query" }),
      });
      onSubmit();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear solicitud");
    },
  });

  const updateMutation = useMutation({
    ...orpc.patientCopyRequests.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Solicitud actualizada");
      queryClient.invalidateQueries({
        queryKey: orpc.patientCopyRequests.list.key({ type: "query" }),
      });
      onSubmit();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar solicitud");
    },
  });

  const form = useForm({
    defaultValues: {
      patientId: initialValues?.patientId ?? "",
      scope: initialValues?.scope ?? "",
      deliveryChannel: initialValues?.deliveryChannel ?? "",
      requester: initialValues?.requester ?? "",
      legalBasis: initialValues?.legalBasis ?? "",
      notes: initialValues?.notes ?? "",
    },
    onSubmit: ({ value }) => {
      const selectedPatient = patientOptions.find(
        (o) => o.value === value.patientId
      );
      const fallbackPatientName =
        initialValues?.patientName ?? "Paciente desconocido";
      const patientName = selectedPatient?.label ?? fallbackPatientName;
      if (editingId) {
        updateMutation.mutate({
          id: editingId,
          patientId: value.patientId,
          patientName,
          scope: value.scope,
          deliveryChannel: value.deliveryChannel,
          requester: value.requester,
          legalBasis: value.legalBasis,
          notes: value.notes || null,
          deadline: initialValues?.deadline ?? new Date(),
          status: initialValues?.status ?? "Recibida",
        });
      } else {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 5);
        createMutation.mutate({
          patientId: value.patientId,
          patientName,
          scope: value.scope,
          deliveryChannel: value.deliveryChannel,
          requester: value.requester,
          legalBasis: value.legalBasis,
          notes: value.notes || null,
          deadline,
          status: "Recibida",
        });
      }
    },
    validators: {
      onSubmit: patientRequestSchema,
    },
  });

  return (
    <Card className="mx-6">
      <CardHeader>
        <CardTitle>
          {editingId ? "Editar solicitud de copia" : "Nueva solicitud de copia"}
        </CardTitle>
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
                <Label htmlFor={field.name}>Alcance *</Label>
                <Select
                  onValueChange={(v) => field.handleChange(v as string)}
                  value={field.state.value}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Completa">Completa</SelectItem>
                    <SelectItem value="Parcial">Parcial</SelectItem>
                    <SelectItem value="Resumen">Resumen</SelectItem>
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

          <form.Field name="deliveryChannel">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Canal de entrega *</Label>
                <Select
                  onValueChange={(v) => field.handleChange(v as string)}
                  value={field.state.value}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Físico">Físico</SelectItem>
                    <SelectItem value="Correo electrónico">
                      Correo electrónico
                    </SelectItem>
                    <SelectItem value="Portal del paciente">
                      Portal del paciente
                    </SelectItem>
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

          <form.Field name="requester">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Solicitante *</Label>
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
                <Label htmlFor={field.name}>Base legal *</Label>
                <Select
                  onValueChange={(v) => field.handleChange(v as string)}
                  value={field.state.value}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ley 23 de 1981">
                      Ley 23 de 1981
                    </SelectItem>
                    <SelectItem value="Ley 1581 de 2012">
                      Ley 1581 de 2012
                    </SelectItem>
                    <SelectItem value="Resolución 1995 de 1999">
                      Resolución 1995 de 1999
                    </SelectItem>
                    <SelectItem value="Ley 2015 de 2020">
                      Ley 2015 de 2020
                    </SelectItem>
                    <SelectItem value="Resolución 866 de 2021">
                      Resolución 866 de 2021
                    </SelectItem>
                    <SelectItem value="Resolución 1888 de 2025">
                      Resolución 1888 de 2025
                    </SelectItem>
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
                  disabled={
                    !canSubmit ||
                    isSubmitting ||
                    createMutation.isPending ||
                    updateMutation.isPending
                  }
                  size="sm"
                  type="submit"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Guardando..."
                    : editingId
                      ? "Actualizar solicitud"
                      : "Crear solicitud"}
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
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [filterPatientId, setFilterPatientId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [queryPatientSearch, setQueryPatientSearch] = useState("");
  const LIMIT = 25;

  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryPatientSearch(patientSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  useEffect(() => {
    document.title = "Solicitudes del paciente | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  const { data: patientsData } = useQuery(
    orpc.patients.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: queryPatientSearch || undefined,
      },
    })
  );

  const patientOptions =
    patientsData?.patients.map((p) => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName1}`,
    })) ?? [];

  const { data, isLoading } = useQuery(
    orpc.patientCopyRequests.list.queryOptions({
      input: {
        limit: LIMIT,
        offset,
        sortDirection: "desc",
        patientId: filterPatientId || undefined,
        status: filterStatus || undefined,
      },
    })
  );

  const updateStatusMutation = useMutation({
    ...orpc.patientCopyRequests.updateStatus.mutationOptions(),
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({
        queryKey: orpc.patientCopyRequests.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar estado");
    },
  });

  const deleteMutation = useMutation({
    ...orpc.patientCopyRequests.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Solicitud eliminada");
      setDeleteConfirmId(null);
      queryClient.invalidateQueries({
        queryKey: orpc.patientCopyRequests.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar solicitud");
    },
  });

  useEffect(() => {
    if (!deleteConfirmId) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setDeleteConfirmId(null);
    }, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [deleteConfirmId]);

  function handleCreate() {
    setShowForm(false);
    setEditingId(null);
  }

  function handleCancelForm() {
    setShowForm(false);
    setEditingId(null);
  }

  function startEdit(row: Row) {
    setEditingId(row.id);
    setShowForm(true);
  }

  type Row = NonNullable<typeof data>["items"][0];

  const columns = [
    {
      header: "Paciente",
      accessor: (row: Row) => (
        <span className="font-medium">{row.patientName}</span>
      ),
    },
    {
      header: "Alcance",
      accessor: (row: Row) => row.scope,
    },
    {
      header: "Canal",
      accessor: (row: Row) => row.deliveryChannel,
    },
    {
      header: "Fecha límite",
      accessor: (row: Row) => (
        <span className="inline-flex items-center gap-1">
          <Clock size={12} />
          {formatEsCO(row.deadline)}
        </span>
      ),
    },
    {
      header: "Estado",
      accessor: (row: Row) => <StatusBadge status={computeStatus(row)} />,
    },
    {
      header: "Solicitante",
      accessor: (row: Row) => row.requester,
    },
    {
      header: "Base legal",
      accessor: (row: Row) => row.legalBasis,
    },
    {
      header: "",
      accessor: (row: Row) => (
        <div className="flex items-center gap-1">
          <Link
            aria-label="Ver solicitud"
            className="inline-flex text-muted-foreground hover:text-foreground"
            params={{ requestId: row.id }}
            to="/patient-requests/$requestId"
          >
            <Eye size={14} />
          </Link>
          <Button
            aria-label="Editar solicitud"
            onClick={() => startEdit(row)}
            size="icon-xs"
            variant="ghost"
          >
            <Pencil size={12} />
          </Button>
        </div>
      ),
      className: "w-20",
    },
    {
      header: "Acciones",
      accessor: (row: Row) => {
        const currentStatus = computeStatus(row);
        return (
          <div className="flex items-center gap-1">
            {currentStatus === "Recibida" && (
              <Button
                onClick={() =>
                  updateStatusMutation.mutate({
                    id: row.id,
                    status: "En preparación",
                  })
                }
                size="xs"
                variant="outline"
              >
                Preparar
              </Button>
            )}
            {currentStatus === "En preparación" && (
              <Button
                onClick={() =>
                  updateStatusMutation.mutate({
                    id: row.id,
                    status: "Entregada",
                  })
                }
                size="xs"
                variant="outline"
              >
                Entregar
              </Button>
            )}
            <Button
              aria-label={
                expandedId === row.id ? "Colapsar detalle" : "Expandir detalle"
              }
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
            <Button
              aria-label="Eliminar solicitud"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteConfirmId !== row.id) {
                  setDeleteConfirmId(row.id);
                  return;
                }
                if (deleteConfirmId === row.id) {
                  deleteMutation.mutate({ id: row.id });
                }
              }}
              size="icon-xs"
              variant={deleteConfirmId === row.id ? "destructive" : "ghost"}
            >
              <Trash2 size={12} />
            </Button>
          </div>
        );
      },
      className: "w-28",
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <Button
            onClick={() => {
              if (showForm) {
                setEditingId(null);
                setShowForm(false);
              } else {
                setShowForm(true);
              }
            }}
            size="sm"
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancelar" : "Nueva solicitud de copia"}
          </Button>
        }
        description="Solicitudes de copia de historia clínica del paciente"
        icon={Copy}
        iconBgClass="bg-sky-50 text-sky-600"
        title="Solicitudes del paciente"
      />

      {/* Filters */}
      <div className="mx-6 flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-[10px]">Paciente</Label>
          <SearchSelect
            emptyMessage="No se encontraron pacientes"
            loading={false}
            onChange={(v) => {
              setFilterPatientId(v);
              setOffset(0);
            }}
            onSearchChange={setPatientSearch}
            options={patientOptions}
            placeholder="Buscar paciente..."
            search={patientSearch}
            value={filterPatientId}
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
              <SelectItem value="Recibida">Recibida</SelectItem>
              <SelectItem value="En preparación">En preparación</SelectItem>
              <SelectItem value="Entregada">Entregada</SelectItem>
              <SelectItem value="Vencida">Vencida</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(filterPatientId || filterStatus) && (
          <Button
            onClick={() => {
              setFilterPatientId("");
              setPatientSearch("");
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

      {showForm && (
        <RequestForm
          editingId={editingId ?? undefined}
          initialValues={
            editingId
              ? (() => {
                  const row = data?.items.find((r) => r.id === editingId);
                  return row
                    ? {
                        patientId: row.patientId,
                        patientName: row.patientName,
                        scope: row.scope,
                        deliveryChannel: row.deliveryChannel,
                        requester: row.requester,
                        legalBasis: row.legalBasis,
                        notes: row.notes,
                        deadline: row.deadline,
                        status: row.status,
                      }
                    : undefined;
                })()
              : undefined
          }
          key={editingId || "new"}
          onCancel={handleCancelForm}
          onSubmit={handleCreate}
        />
      )}

      <div className="px-6">
        {(data?.items ?? []).length === 0 && !isLoading ? (
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
              data={data?.items ?? []}
              emptyDescription={
                filterPatientId || filterStatus
                  ? "Ninguna solicitud coincide con los filtros aplicados."
                  : "No hay solicitudes de copia registradas."
              }
              emptyTitle={
                filterPatientId || filterStatus
                  ? "Sin resultados"
                  : "Sin solicitudes"
              }
              isLoading={isLoading}
              keyExtractor={(row) => row.id}
              onRowClick={(row) => {
                navigate({
                  to: "/patient-requests/$requestId",
                  params: { requestId: row.id },
                });
              }}
              pagination={
                data
                  ? {
                      limit: LIMIT,
                      offset,
                      total: data.total,
                      onPageChange: setOffset,
                    }
                  : undefined
              }
            />
            {/* Detail expansion rows */}
            {expandedId && (
              <Card className="mx-0">
                <CardContent className="p-4">
                  {(() => {
                    const req = data?.items.find((r) => r.id === expandedId);
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
                          <span className="font-mono">
                            {req.patientId.slice(0, 8)}…
                          </span>
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
