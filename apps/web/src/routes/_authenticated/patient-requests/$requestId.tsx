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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@wellfit-emr/ui/components/select";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute(
  "/_authenticated/patient-requests/$requestId"
)({
  component: PatientRequestDetailPage,
});

function PatientRequestDetailPage() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<
    "Recibida" | "En preparación" | "Entregada" | "Vencida"
  >("Recibida");

  const { data, isLoading, error, isError } = useQuery(
    orpc.patientCopyRequests.get.queryOptions({
      input: { id: requestId },
    })
  );

  const updateMutation = useMutation({
    ...orpc.patientCopyRequests.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Solicitud actualizada");
      queryClient.invalidateQueries({
        queryKey: orpc.patientCopyRequests.get.key({ type: "query" }),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.patientCopyRequests.list.key({ type: "query" }),
      });
      setEditing(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar");
    },
  });

  const updateStatusMutation = useMutation({
    ...orpc.patientCopyRequests.updateStatus.mutationOptions(),
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({
        queryKey: orpc.patientCopyRequests.get.key({ type: "query" }),
      });
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
      setConfirmDelete(false);
      queryClient.invalidateQueries({
        queryKey: orpc.patientCopyRequests.list.key({ type: "query" }),
      });
      navigate({ to: "/patient-requests" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar");
    },
  });

  useEffect(() => {
    if (data?.patientName) {
      document.title = `Solicitud de ${data.patientName} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [data?.patientName]);

  useEffect(() => {
    if (data?.status) {
      setSelectedStatus(
        data.status as "Recibida" | "En preparación" | "Entregada" | "Vencida"
      );
    }
  }, [data?.status]);

  useEffect(() => {
    if (!confirmDelete) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setConfirmDelete(false);
    }, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [confirmDelete]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4 p-6">
        <PageHeader backTo="/patient-requests" title="Error al cargar" />
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          <AlertTriangle className="text-destructive" size={20} />
          <p className="text-muted-foreground text-sm">
            {error?.message || "Ocurrió un error inesperado."}
          </p>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: orpc.patientCopyRequests.get.key({ type: "query" }),
              })
            }
            size="sm"
            variant="outline"
          >
            <RefreshCw size={12} />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4 p-6">
        <PageHeader
          backTo="/patient-requests"
          title="Solicitud no encontrada"
        />
        <p className="text-muted-foreground text-sm">
          La solicitud de copia no existe o fue eliminada.
        </p>
        <Link
          className="text-primary text-sm hover:underline"
          to="/patient-requests"
        >
          Volver al listado
        </Link>
      </div>
    );
  }

  const request = data;

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            {!editing && (
              <Button
                onClick={() => setEditing(true)}
                size="sm"
                variant="outline"
              >
                Editar
              </Button>
            )}
            <Button
              aria-label="Eliminar solicitud"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                if (confirmDelete) {
                  deleteMutation.mutate({ id: requestId });
                }
              }}
              size="sm"
              variant="destructive"
            >
              <Trash2 size={14} />
              <span className="ml-1.5">
                {confirmDelete ? "Confirmar eliminación" : "Eliminar"}
              </span>
            </Button>
          </div>
        }
        backTo="/patient-requests"
        description="Detalle y gestión de solicitud de copia"
        title={`Solicitud de ${request.patientName}`}
      />

      <div className="mx-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información de la solicitud</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <EditForm
                onCancel={() => setEditing(false)}
                onSubmit={(values) =>
                  updateMutation.mutate({
                    id: requestId,
                    ...values,
                  })
                }
                request={request}
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Paciente
                  </p>
                  <p className="mt-0.5 font-medium text-xs">
                    {request.patientName}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Solicitante
                  </p>
                  <p className="mt-0.5 font-medium text-xs">
                    {request.requester}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Alcance
                  </p>
                  <p className="mt-0.5 font-medium text-xs">{request.scope}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Canal de entrega
                  </p>
                  <p className="mt-0.5 font-medium text-xs">
                    {request.deliveryChannel}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Fecha límite
                  </p>
                  <p className="mt-0.5 font-medium text-xs">
                    {new Date(request.deadline).toLocaleDateString("es-CO", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Base legal
                  </p>
                  <p className="mt-0.5 font-medium text-xs">
                    {request.legalBasis}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Estado
                  </p>
                  <p className="mt-0.5 font-medium text-xs">{request.status}</p>
                </div>
                {request.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Notas
                    </p>
                    <p className="mt-0.5 font-medium text-xs">
                      {request.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cambiar estado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Select
                onValueChange={(v) =>
                  setSelectedStatus(
                    v as "Recibida" | "En preparación" | "Entregada" | "Vencida"
                  )
                }
                value={selectedStatus}
              >
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Recibida">Recibida</SelectItem>
                  <SelectItem value="En preparación">En preparación</SelectItem>
                  <SelectItem value="Entregada">Entregada</SelectItem>
                  <SelectItem value="Vencida">Vencida</SelectItem>
                </SelectContent>
              </Select>
              <Button
                disabled={
                  updateStatusMutation.isPending ||
                  selectedStatus === request.status
                }
                onClick={() =>
                  updateStatusMutation.mutate({
                    id: requestId,
                    status: selectedStatus,
                  })
                }
                size="sm"
              >
                Actualizar
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              El estado actual es <strong>{request.status}</strong>. Seleccione
              un nuevo estado y pulse Actualizar para cambiarlo.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EditForm({
  request,
  onCancel,
  onSubmit,
}: {
  request: {
    patientId: string;
    patientName: string;
    requester: string;
    scope: string;
    deliveryChannel: string;
    deadline: Date;
    legalBasis: string;
    notes: string | null;
    status: string;
  };
  onCancel: () => void;
  onSubmit: (values: {
    patientId: string;
    patientName: string;
    requester: string;
    scope: string;
    deliveryChannel: string;
    deadline: Date;
    legalBasis: string;
    notes: string | null;
    status: string;
  }) => void;
}) {
  const [form, setForm] = useState({
    patientId: request.patientId,
    patientName: request.patientName,
    requester: request.requester,
    scope: request.scope,
    deliveryChannel: request.deliveryChannel,
    deadline: new Date(request.deadline).toISOString().slice(0, 10),
    legalBasis: request.legalBasis,
    notes: request.notes ?? "",
    status: request.status,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      patientId: form.patientId,
      patientName: form.patientName,
      requester: form.requester,
      scope: form.scope,
      deliveryChannel: form.deliveryChannel,
      deadline: new Date(form.deadline),
      legalBasis: form.legalBasis,
      notes: form.notes || null,
      status: form.status,
    });
  };

  return (
    <form
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      onSubmit={handleSubmit}
    >
      <div className="space-y-1">
        <Label>Paciente ID</Label>
        <Input
          onChange={(e) => setForm({ ...form, patientId: e.target.value })}
          value={form.patientId}
        />
      </div>
      <div className="space-y-1">
        <Label>Nombre del paciente</Label>
        <Input
          onChange={(e) => setForm({ ...form, patientName: e.target.value })}
          value={form.patientName}
        />
      </div>
      <div className="space-y-1">
        <Label>Solicitante</Label>
        <Input
          onChange={(e) => setForm({ ...form, requester: e.target.value })}
          value={form.requester}
        />
      </div>
      <div className="space-y-1">
        <Label>Alcance</Label>
        <Input
          onChange={(e) => setForm({ ...form, scope: e.target.value })}
          value={form.scope}
        />
      </div>
      <div className="space-y-1">
        <Label>Canal de entrega</Label>
        <Input
          onChange={(e) =>
            setForm({ ...form, deliveryChannel: e.target.value })
          }
          value={form.deliveryChannel}
        />
      </div>
      <div className="space-y-1">
        <Label>Fecha límite</Label>
        <Input
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          type="date"
          value={form.deadline}
        />
      </div>
      <div className="space-y-1">
        <Label>Base legal</Label>
        <Input
          onChange={(e) => setForm({ ...form, legalBasis: e.target.value })}
          value={form.legalBasis}
        />
      </div>
      <div className="space-y-1">
        <Label>Estado</Label>
        <Select
          onValueChange={(v) => setForm({ ...form, status: v as string })}
          value={form.status}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Recibida">Recibida</SelectItem>
            <SelectItem value="En preparación">En preparación</SelectItem>
            <SelectItem value="Entregada">Entregada</SelectItem>
            <SelectItem value="Vencida">Vencida</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label>Notas</Label>
        <Input
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          value={form.notes}
        />
      </div>
      <div className="flex items-end gap-2 sm:col-span-2">
        <Button size="sm" type="submit">
          Guardar
        </Button>
        <Button onClick={onCancel} size="sm" type="button" variant="ghost">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
