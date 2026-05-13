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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@wellfit-emr/ui/components/select";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import { Building2, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute(
  "/_authenticated/facilities/payers/$payerId"
)({
  component: PayerDetailPage,
});

function PayerDetailPage() {
  const { payerId } = Route.useParams();
  const navigate = Route.useNavigate();

  const { data: payer, isLoading } = useQuery(
    orpc.payers.get.queryOptions({ input: { id: payerId } })
  );

  const deleteMutation = useMutation({
    ...orpc.payers.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Pagador eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.payers.list.key({ type: "query" }),
      });
      navigate({ to: "/facilities/payers" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar pagador");
    },
  });

  const updateMutation = useMutation({
    ...orpc.payers.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Pagador actualizado");
      queryClient.invalidateQueries({
        queryKey: orpc.payers.list.key({ type: "query" }),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.payers.get.key({ type: "query" }),
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar pagador");
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editPayerType, setEditPayerType] = useState("");
  const [editStatus, setEditStatus] = useState("");

  function startEditing() {
    if (!payer) {
      return;
    }
    setEditName(payer.name);
    setEditCode(payer.code);
    setEditPayerType(payer.payerType);
    setEditStatus(payer.status);
    setIsEditing(true);
  }

  function handleUpdate() {
    if (!payer) {
      return;
    }
    if (!(editName.trim() && editCode.trim() && editPayerType)) {
      toast.error("Complete todos los campos obligatorios");
      return;
    }
    updateMutation.mutate({
      id: payer.id,
      name: editName.trim(),
      code: editCode.trim(),
      payerType: editPayerType,
      status: editStatus || "active",
    });
  }

  const statusLabel =
    payer?.status === "active"
      ? "Activo"
      : payer?.status === "inactive"
        ? "Inactivo"
        : (payer?.status ?? "—");

  const statusClasses =
    payer?.status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-50 text-slate-700";

  useEffect(() => {
    if (payer) {
      document.title = `${payer.name} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [payer]);

  return (
    <div className="space-y-4">
      <PageHeader
        backTo="/facilities/payers"
        description="Detalle del pagador"
        title={isLoading ? "Cargando..." : (payer?.name ?? "Pagador")}
      />

      <div className="px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 size={16} />
              Información general
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </>
            ) : payer ? (
              isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Nombre</Label>
                      <Input
                        onChange={(e) => setEditName(e.target.value)}
                        value={editName}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Código</Label>
                      <Input
                        onChange={(e) => setEditCode(e.target.value)}
                        value={editCode}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Tipo</Label>
                      <Select
                        onValueChange={(v) => setEditPayerType(v as string)}
                        value={editPayerType}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EPS">EPS</SelectItem>
                          <SelectItem value="IPS">IPS</SelectItem>
                          <SelectItem value="SOAT">SOAT</SelectItem>
                          <SelectItem value="particular">Particular</SelectItem>
                          <SelectItem value="plan_complementario">
                            Plan complementario
                          </SelectItem>
                          <SelectItem value="arl">ARL</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Estado</Label>
                      <Select
                        onValueChange={(v) => setEditStatus(v as string)}
                        value={editStatus}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Activo</SelectItem>
                          <SelectItem value="inactive">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      onClick={() => setIsEditing(false)}
                      size="sm"
                      variant="outline"
                    >
                      Cancelar
                    </Button>
                    <Button
                      disabled={updateMutation.isPending}
                      onClick={handleUpdate}
                      size="sm"
                    >
                      {updateMutation.isPending ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        Nombre
                      </p>
                      <p className="font-medium">{payer.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        Código
                      </p>
                      <p className="font-medium">{payer.code}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Tipo</p>
                      <p className="font-medium">{payer.payerType}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        Estado
                      </p>
                      <span
                        className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${statusClasses}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button onClick={startEditing} size="sm" variant="outline">
                      <Pencil size={14} />
                      <span className="ml-1.5">Editar</span>
                    </Button>
                    <Button
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (
                          confirm("¿Eliminar este pagador permanentemente?")
                        ) {
                          deleteMutation.mutate({ id: payer.id });
                        }
                      }}
                      size="sm"
                      variant="destructive"
                    >
                      <Trash2 size={14} />
                      Eliminar
                    </Button>
                  </div>
                </>
              )
            ) : (
              <p className="text-muted-foreground">
                No se encontró el pagador.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
