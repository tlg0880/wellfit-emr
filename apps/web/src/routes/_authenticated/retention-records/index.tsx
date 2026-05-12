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
import { Archive, Eye, FilterX, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/retention-records/")({
  component: RetentionRecordsPage,
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

const LIMIT = 50;

function RetentionRecordsPage() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [retentionClass, setRetentionClass] = useState("");
  const [triggerDate, setTriggerDate] = useState("");
  const [disposalDate, setDisposalDate] = useState("");
  const [legalHold, setLegalHold] = useState("false");

  const [filterEntityType, setFilterEntityType] = useState("");
  const [filterEntityId, setFilterEntityId] = useState("");
  const [filterLegalHold, setFilterLegalHold] = useState("");

  useEffect(() => {
    document.title = "Retención documental | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  const { data, isLoading } = useQuery(
    orpc.retentionRecords.list.queryOptions({
      input: {
        limit: LIMIT,
        offset,
        sortDirection: "asc",
        entityType: filterEntityType || undefined,
        entityId: filterEntityId || undefined,
        legalHoldFlag:
          filterLegalHold === "" ? undefined : filterLegalHold === "true",
      },
    })
  );

  const createMutation = useMutation({
    ...orpc.retentionRecords.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Registro de retención creado");
      queryClient.invalidateQueries({
        queryKey: orpc.retentionRecords.list.key({ type: "query" }),
      });
      setShowForm(false);
      setEntityType("");
      setEntityId("");
      setRetentionClass("");
      setTriggerDate("");
      setDisposalDate("");
      setLegalHold("false");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear registro");
    },
  });

  const deleteMutation = useMutation({
    ...orpc.retentionRecords.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Registro eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.retentionRecords.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar registro");
    },
  });

  const updateMutation = useMutation({
    ...orpc.retentionRecords.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Registro actualizado");
      setEditingId(null);
      setEntityType("");
      setEntityId("");
      setRetentionClass("");
      setTriggerDate("");
      setDisposalDate("");
      setLegalHold("false");
      setShowForm(false);
      queryClient.invalidateQueries({
        queryKey: orpc.retentionRecords.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar registro");
    },
  });

  function resetForm() {
    setEditingId(null);
    setEntityType("");
    setEntityId("");
    setRetentionClass("");
    setTriggerDate("");
    setDisposalDate("");
    setLegalHold("false");
  }

  function startEdit(row: NonNullable<typeof data>["items"][0]) {
    setEditingId(row.id);
    setEntityType(row.entityType);
    setEntityId(row.entityId);
    setRetentionClass(row.retentionClass);
    setTriggerDate(new Date(row.triggerDate).toISOString().slice(0, 10));
    setDisposalDate(
      new Date(row.disposalEligibilityDate).toISOString().slice(0, 10)
    );
    setLegalHold(row.legalHoldFlag ? "true" : "false");
    setShowForm(true);
  }

  function handleCreate() {
    if (
      !(entityType && entityId && retentionClass && triggerDate && disposalDate)
    ) {
      toast.error("Complete todos los campos obligatorios");
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        entityType,
        entityId,
        retentionClass,
        triggerDate: new Date(triggerDate),
        disposalEligibilityDate: new Date(disposalDate),
        legalHoldFlag: legalHold === "true",
      });
    } else {
      createMutation.mutate({
        entityType,
        entityId,
        retentionClass,
        triggerDate: new Date(triggerDate),
        disposalEligibilityDate: new Date(disposalDate),
        legalHoldFlag: legalHold === "true",
      });
    }
  }

  const columns = [
    {
      header: "Entidad",
      accessor: (row: { entityType: string; entityId: string }) => (
        <div className="space-y-0.5">
          <span className="font-medium text-xs">{row.entityType}</span>
          <p className="font-mono text-[10px] text-muted-foreground">
            {row.entityId.slice(0, 12)}…
          </p>
        </div>
      ),
    },
    {
      header: "Clase",
      accessor: (row: { retentionClass: string }) => row.retentionClass,
    },
    {
      header: "Fecha disparador",
      accessor: (row: { triggerDate: Date }) =>
        new Date(row.triggerDate).toLocaleDateString("es-CO"),
    },
    {
      header: "Disposición elegible",
      accessor: (row: {
        disposalEligibilityDate: Date;
        legalHoldFlag: boolean;
      }) => (
        <span className="inline-flex items-center gap-1.5">
          <span>
            {new Date(row.disposalEligibilityDate).toLocaleDateString("es-CO")}
          </span>
          {row.legalHoldFlag && (
            <span className="inline-flex border border-red-200 bg-red-50 px-1.5 py-0.5 font-medium text-[10px] text-red-700">
              Legal hold
            </span>
          )}
        </span>
      ),
    },
    {
      header: "Estado",
      accessor: (row: {
        disposalEligibilityDate: Date;
        legalHoldFlag: boolean;
      }) => {
        const isEligible =
          !row.legalHoldFlag &&
          new Date(row.disposalEligibilityDate) < new Date();
        return (
          <span
            className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${
              isEligible
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : row.legalHoldFlag
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {isEligible
              ? "Elegible disposición"
              : row.legalHoldFlag
                ? "Retención legal"
                : "Vigente"}
          </span>
        );
      },
    },
    {
      header: "Acciones",
      accessor: (row: { id: string }) => (
        <div className="flex items-center gap-1">
          <Link
            aria-label="Ver registro de retención"
            className="inline-flex text-muted-foreground hover:text-foreground"
            params={{ recordId: row.id }}
            to="/retention-records/$recordId"
          >
            <Eye size={14} />
          </Link>
          <Button
            aria-label="Editar registro de retención"
            onClick={() =>
              startEdit(row as NonNullable<typeof data>["items"][0])
            }
            size="icon-xs"
            variant="ghost"
          >
            <Pencil size={12} />
          </Button>
          <Button
            aria-label="Eliminar registro de retención"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (
                confirm("¿Eliminar este registro de retencion permanentemente?")
              ) {
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
          <Button
            onClick={() => {
              if (showForm) {
                resetForm();
                setShowForm(false);
              } else {
                setShowForm(true);
              }
            }}
            size="sm"
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancelar" : "Nuevo registro"}
          </Button>
        }
        description="Control de retención y disposición documental"
        icon={Archive}
        iconBgClass="bg-slate-100 text-slate-600"
        title="Retención documental"
      />

      {/* Filters */}
      <div className="mx-6 flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-[10px]">Tipo entidad</Label>
          <Select
            onValueChange={(v) => {
              setFilterEntityType(v as string);
              setOffset(0);
            }}
            value={filterEntityType}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="patient">Paciente</SelectItem>
              <SelectItem value="encounter">Atención</SelectItem>
              <SelectItem value="clinical_document">
                Documento clínico
              </SelectItem>
              <SelectItem value="attachment">Anexo</SelectItem>
              <SelectItem value="rips_export">RIPS</SelectItem>
              <SelectItem value="ihce_bundle">IHCE</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">ID entidad</Label>
          <Input
            className="w-48"
            onChange={(e) => {
              setFilterEntityId(e.target.value);
              setOffset(0);
            }}
            placeholder="Buscar ID..."
            value={filterEntityId}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Legal hold</Label>
          <Select
            onValueChange={(v) => {
              setFilterLegalHold(v as string);
              setOffset(0);
            }}
            value={filterLegalHold}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="true">Sí</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(filterEntityType || filterEntityId || filterLegalHold) && (
          <Button
            onClick={() => {
              setFilterEntityType("");
              setFilterEntityId("");
              setFilterLegalHold("");
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
        <Card className="mx-6" key={editingId || "new"} size="sm">
          <CardHeader>
            <CardTitle>
              {editingId
                ? "Editar registro de retención"
                : "Nuevo registro de retención"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              onSubmit={handleCreate}
            >
              <div className="space-y-1">
                <Label htmlFor="rr-entity-type">Tipo de entidad *</Label>
                <Select
                  onValueChange={(v) => setEntityType(v as string)}
                  value={entityType}
                >
                  <SelectTrigger id="rr-entity-type">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">Paciente</SelectItem>
                    <SelectItem value="encounter">Atención</SelectItem>
                    <SelectItem value="clinical_document">
                      Documento clínico
                    </SelectItem>
                    <SelectItem value="attachment">Anexo</SelectItem>
                    <SelectItem value="rips_export">RIPS</SelectItem>
                    <SelectItem value="ihce_bundle">IHCE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rr-entity-id">ID entidad *</Label>
                <Input
                  autoFocus
                  id="rr-entity-id"
                  onChange={(e) => setEntityId(e.target.value)}
                  placeholder="UUID de la entidad"
                  required
                  value={entityId}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rr-retention-class">Clase de retención *</Label>
                <Select
                  onValueChange={(v) => setRetentionClass(v as string)}
                  value={retentionClass}
                >
                  <SelectTrigger id="rr-retention-class">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hc_paper">HC papel</SelectItem>
                    <SelectItem value="hc_digital">HC digital</SelectItem>
                    <SelectItem value="rips">RIPS</SelectItem>
                    <SelectItem value="interoperabilidad">
                      Interoperabilidad
                    </SelectItem>
                    <SelectItem value="imagenes">Imágenes</SelectItem>
                    <SelectItem value="administrativo">
                      Administrativo
                    </SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rr-trigger-date">Fecha disparador *</Label>
                <Input
                  id="rr-trigger-date"
                  onChange={(e) => setTriggerDate(e.target.value)}
                  required
                  type="date"
                  value={triggerDate}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rr-disposal-date">
                  Fecha elegible disposición *
                </Label>
                <Input
                  id="rr-disposal-date"
                  onChange={(e) => setDisposalDate(e.target.value)}
                  required
                  type="date"
                  value={disposalDate}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rr-legal-hold">Legal hold</Label>
                <Select
                  onValueChange={(v) => setLegalHold(v as string)}
                  value={legalHold}
                >
                  <SelectTrigger id="rr-legal-hold">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Sí</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 sm:col-span-3">
                <Button
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  size="sm"
                  type="submit"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Guardando..."
                    : editingId
                      ? "Actualizar"
                      : "Guardar"}
                </Button>
                <Button
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="px-6">
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          emptyDescription="No hay registros de retención documental."
          emptyTitle="Sin registros"
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => {
            navigate({
              to: "/retention-records/$recordId",
              params: { recordId: row.id },
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
      </div>
    </div>
  );
}
