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
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute(
  "/_authenticated/facilities/organizations"
)({
  component: OrganizationsPage,
});

const LIMIT = 50;

function OrganizationsPage() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [repsCode, setRepsCode] = useState("");
  const [taxId, setTaxId] = useState("");

  useEffect(() => {
    document.title = "Organizaciones | WellFit EMR";
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

  const { data, isLoading, refetch } = useQuery(
    orpc.facilities.listOrganizations.queryOptions({
      input: {
        limit: LIMIT,
        offset,
        search: querySearch || undefined,
      },
    })
  );

  const createMutation = useMutation({
    ...orpc.facilities.createOrganization.mutationOptions(),
    onSuccess: () => {
      toast.success("Organizacion creada correctamente");
      setName("");
      setRepsCode("");
      setTaxId("");
      setShowForm(false);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Error al crear organizacion: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    ...orpc.facilities.deleteOrganization.mutationOptions(),
    onSuccess: () => {
      toast.success("Organizacion eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.facilities.listOrganizations.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar organizacion: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    ...orpc.facilities.updateOrganization.mutationOptions(),
    onSuccess: () => {
      toast.success("Organizacion actualizada");
      setEditingId(null);
      setName("");
      setRepsCode("");
      setTaxId("");
      setShowForm(false);
      queryClient.invalidateQueries({
        queryKey: orpc.facilities.listOrganizations.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar organizacion: ${error.message}`);
    },
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setRepsCode("");
    setTaxId("");
  }

  function startEdit(row: Org) {
    setEditingId(row.id);
    setName(row.name);
    setRepsCode(row.repsCode ?? "");
    setTaxId(row.taxId ?? "");
    setShowForm(true);
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: name.trim(),
        repsCode: repsCode.trim() || null,
        taxId: taxId.trim() || null,
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        repsCode: repsCode.trim() || null,
        taxId: taxId.trim() || null,
        status: "active",
      });
    }
  };

  type Org = NonNullable<typeof data>["organizations"][0];

  return (
    <div className="flex flex-col">
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
            <span className="ml-1.5">{showForm ? "Cancelar" : "Nueva"}</span>
          </Button>
        }
        description="Administre las organizaciones de salud registradas"
        title="Organizaciones"
      />

      <div className="p-6">
        {showForm && (
          <Card className="mb-6" key={editingId || "new"}>
            <CardHeader>
              <CardTitle>
                {editingId ? "Editar organizacion" : "Nueva organizacion"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                onSubmit={handleCreate}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="org-name">Nombre *</Label>
                  <Input
                    id="org-name"
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre de la organizacion"
                    required
                    value={name}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-reps">Codigo REPS</Label>
                  <Input
                    id="org-reps"
                    onChange={(e) => setRepsCode(e.target.value)}
                    placeholder="Codigo REPS"
                    value={repsCode}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-tax">NIT</Label>
                  <Input
                    id="org-tax"
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="NIT"
                    value={taxId}
                  />
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
                    variant="ghost"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="mb-4 flex items-center gap-2">
          <Input
            className="max-w-xs"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, REPS o NIT..."
            value={search}
          />
        </div>

        <DataTable
          columns={[
            {
              header: "Nombre",
              accessor: (row: Org) => row.name,
            },
            {
              header: "REPS",
              accessor: (row: Org) => row.repsCode ?? "—",
            },
            {
              header: "NIT",
              accessor: (row: Org) => row.taxId ?? "—",
            },
            {
              header: "Estado",
              accessor: (row: Org) => (
                <span
                  className={`inline-flex items-center border px-1.5 py-0.5 font-medium text-[10px] ${
                    row.status === "active"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {row.status === "active" ? "Activo" : "Inactivo"}
                </span>
              ),
            },
            {
              header: "Creado",
              accessor: (row: Org) =>
                new Date(row.createdAt).toLocaleDateString("es-CO", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }),
            },
            {
              header: "Acciones",
              accessor: (row: Org) => (
                <div className="flex items-center gap-1">
                  <Link
                    aria-label="Ver organización"
                    className="inline-flex text-muted-foreground hover:text-foreground"
                    params={{ organizationId: row.id }}
                    to="/facilities/organizations/$organizationId"
                  >
                    <Eye size={14} />
                  </Link>
                  <Button
                    aria-label="Editar organización"
                    onClick={() => startEdit(row)}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <Pencil size={12} />
                  </Button>
                  <Button
                    aria-label="Eliminar organización"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (
                        confirm("¿Eliminar esta organizacion permanentemente?")
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
          ]}
          data={data?.organizations ?? []}
          emptyDescription="No se encontraron organizaciones."
          emptyTitle="Sin organizaciones"
          isLoading={isLoading}
          keyExtractor={(row: Org) => row.id}
          onRowClick={(row) =>
            navigate({
              to: "/facilities/organizations/$organizationId",
              params: { organizationId: row.id },
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
