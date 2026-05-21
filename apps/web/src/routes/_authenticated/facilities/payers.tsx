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
import { Eye, FilterX, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/facilities/payers")({
  component: PayersPage,
});

const LIMIT = 50;

function PayersPage() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [payerType, setPayerType] = useState("");

  useEffect(() => {
    document.title = "Pagadores | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuerySearch(search);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery(
    orpc.payers.list.queryOptions({
      input: {
        limit: LIMIT,
        offset,
        search: querySearch || undefined,
        status: filterStatus || undefined,
      },
    })
  );

  const createMutation = useMutation({
    ...orpc.payers.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Pagador creado correctamente");
      queryClient.invalidateQueries({
        queryKey: orpc.payers.list.key({ type: "query" }),
      });
      setShowForm(false);
      setName("");
      setCode("");
      setPayerType("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear pagador");
    },
  });

  const deleteMutation = useMutation({
    ...orpc.payers.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Pagador eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.payers.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar pagador");
    },
  });

  const updateMutation = useMutation({
    ...orpc.payers.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Pagador actualizado");
      setEditingId(null);
      setName("");
      setCode("");
      setPayerType("");
      setShowForm(false);
      queryClient.invalidateQueries({
        queryKey: orpc.payers.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar pagador");
    },
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setCode("");
    setPayerType("");
  }

  function startEdit(row: {
    id: string;
    name: string;
    code: string;
    payerType: string;
    status: string;
  }) {
    setEditingId(row.id);
    setName(row.name);
    setCode(row.code);
    setPayerType(row.payerType);
    setShowForm(true);
  }

  function handleCreate() {
    if (!(name && code && payerType)) {
      toast.error("Complete todos los campos obligatorios");
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name,
        code,
        payerType,
        status: "active",
      });
    } else {
      createMutation.mutate({
        name,
        code,
        payerType,
        status: "active",
      });
    }
  }

  const columns = [
    {
      header: "Nombre",
      accessor: (row: { name: string; payerType: string }) => (
        <span className="font-medium">{row.name}</span>
      ),
    },
    {
      header: "Tipo",
      accessor: (row: { payerType: string }) => row.payerType,
    },
    {
      header: "Código",
      accessor: (row: { code: string }) => row.code,
    },
    {
      header: "Estado",
      accessor: (row: { status: string }) => (
        <span
          className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${
            row.status === "active"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {row.status === "active" ? "Activo" : row.status}
        </span>
      ),
    },
    {
      header: "Acciones",
      accessor: (row: {
        id: string;
        name: string;
        code: string;
        payerType: string;
        status: string;
      }) => (
        <div className="flex items-center gap-1">
          <Link
            aria-label="Ver pagador"
            className="inline-flex text-muted-foreground hover:text-foreground"
            params={{ payerId: row.id }}
            to="/facilities/payers/$payerId"
          >
            <Eye size={14} />
          </Link>
          <Button
            aria-label="Editar pagador"
            onClick={() => startEdit(row)}
            size="icon-xs"
            variant="ghost"
          >
            <Pencil size={12} />
          </Button>
          <Button
            aria-label="Eliminar pagador"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar este pagador permanentemente?")) {
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
            <Plus size={14} />
            {showForm ? "Cancelar" : "Nuevo pagador"}
          </Button>
        }
        description="Administración de pagadores y aseguradoras"
        title="Pagadores"
      />

      <div className="mx-6 flex flex-wrap items-end gap-2">
        <Input
          className="max-w-sm"
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          placeholder="Buscar pagador..."
          value={search}
        />
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
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="inactive">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(search || filterStatus) && (
          <Button
            onClick={() => {
              setSearch("");
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
        <Card className="mx-6" key={editingId || "new"} size="sm">
          <CardHeader>
            <CardTitle>
              {editingId ? "Editar pagador" : "Nuevo pagador"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              onSubmit={handleCreate}
            >
              <div className="space-y-1">
                <Label>Nombre *</Label>
                <Input
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre del pagador"
                  required
                  value={name}
                />
              </div>
              <div className="space-y-1">
                <Label>Código *</Label>
                <Input
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Código único"
                  required
                  value={code}
                />
              </div>
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select
                  onValueChange={(v) => setPayerType(v as string)}
                  value={payerType}
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
          emptyDescription="No hay pagadores registrados."
          emptyTitle="Sin pagadores"
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          onRowClick={(row) =>
            navigate({
              to: "/facilities/payers/$payerId",
              params: { payerId: row.id },
            })
          }
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
