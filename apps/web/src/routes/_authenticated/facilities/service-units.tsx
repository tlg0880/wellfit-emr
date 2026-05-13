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
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute(
  "/_authenticated/facilities/service-units"
)({
  component: ServiceUnitsPage,
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

function ServiceUnitsPage() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [serviceCode, setServiceCode] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [siteId, setSiteId] = useState("");
  const [careSetting, setCareSetting] = useState("");

  useEffect(() => {
    document.title = "Unidades de servicio | WellFit EMR";
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
    orpc.facilities.listServiceUnits.queryOptions({
      input: {
        limit: LIMIT,
        offset,
        search: querySearch || undefined,
      },
    })
  );

  const { data: sitesData } = useQuery(
    orpc.facilities.listSites.queryOptions({
      input: {
        limit: 100,
        offset: 0,
      },
    })
  );

  const { data: servicesData, isLoading: servicesLoading } = useQuery(
    orpc.ripsReference.listEntries.queryOptions({
      input: {
        tableName: "Servicios",
        limit: 20,
        search: serviceSearch || undefined,
      },
    })
  );

  const createMutation = useMutation({
    ...orpc.facilities.createServiceUnit.mutationOptions(),
    onSuccess: () => {
      toast.success("Unidad de servicio creada correctamente");
      setName("");
      setServiceCode("");
      setServiceSearch("");
      setSiteId("");
      setCareSetting("");
      setShowForm(false);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Error al crear unidad de servicio: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    ...orpc.facilities.deleteServiceUnit.mutationOptions(),
    onSuccess: () => {
      toast.success("Unidad de servicio eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.facilities.listServiceUnits.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar unidad de servicio: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    ...orpc.facilities.updateServiceUnit.mutationOptions(),
    onSuccess: () => {
      toast.success("Unidad de servicio actualizada");
      setEditingId(null);
      setName("");
      setServiceCode("");
      setServiceSearch("");
      setSiteId("");
      setCareSetting("");
      setShowForm(false);
      queryClient.invalidateQueries({
        queryKey: orpc.facilities.listServiceUnits.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar unidad de servicio: ${error.message}`);
    },
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setServiceCode("");
    setServiceSearch("");
    setSiteId("");
    setCareSetting("");
  }

  function startEdit(row: SU) {
    setEditingId(row.id);
    setName(row.name);
    setServiceCode(row.serviceCode);
    setSiteId(row.siteId);
    setCareSetting(row.careSetting);
    setShowForm(true);
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(name.trim() && serviceCode.trim() && siteId && careSetting.trim())) {
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: name.trim(),
        serviceCode: serviceCode.trim(),
        siteId,
        careSetting: careSetting.trim(),
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        serviceCode: serviceCode.trim(),
        siteId,
        careSetting: careSetting.trim(),
      });
    }
  };

  const siteMap = new Map(
    sitesData?.sites.map((s: { id: string; name: string }) => [s.id, s.name])
  );
  type SU = NonNullable<typeof data>["serviceUnits"][0];

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
        description="Administre las unidades de servicio de salud"
        title="Unidades de servicio"
      />

      <div className="p-6">
        {showForm && (
          <Card className="mb-6" key={editingId || "new"}>
            <CardHeader>
              <CardTitle>
                {editingId
                  ? "Editar unidad de servicio"
                  : "Nueva unidad de servicio"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                onSubmit={handleCreate}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="su-name">Nombre *</Label>
                  <Input
                    id="su-name"
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre del servicio"
                    required
                    value={name}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-code">Codigo de servicio *</Label>
                  <SearchSelect
                    emptyMessage="Escribe para buscar servicios"
                    id="su-code"
                    loading={servicesLoading}
                    onChange={(value) => {
                      const selected = servicesData?.entries.find(
                        (entry) => entry.code === value
                      );
                      setServiceCode(value);
                      setName((current) => current || selected?.name || "");
                    }}
                    onSearchChange={setServiceSearch}
                    options={
                      servicesData?.entries.map((entry) => ({
                        value: entry.code,
                        label: entry.name,
                        description: entry.code,
                      })) ?? []
                    }
                    placeholder="Buscar servicio..."
                    required
                    search={serviceSearch}
                    value={serviceCode}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-site">Sede *</Label>
                  <Select
                    onValueChange={(v) => setSiteId(v as string)}
                    value={siteId}
                  >
                    <SelectTrigger id="su-site">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sitesData?.sites.map(
                        (site: { id: string; name: string }) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="su-care">Ambito de atencion *</Label>
                  <Input
                    id="su-care"
                    onChange={(e) => setCareSetting(e.target.value)}
                    placeholder="Ej. ambulatorio, hospitalario, urgencias"
                    required
                    value={careSetting}
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
            placeholder="Buscar por nombre o codigo..."
            value={search}
          />
        </div>

        <DataTable
          columns={[
            {
              header: "Codigo",
              accessor: (row: SU) => row.serviceCode,
            },
            {
              header: "Nombre",
              accessor: (row: SU) => row.name,
            },
            {
              header: "Sede",
              accessor: (row: SU) => siteMap.get(row.siteId) ?? "—",
            },
            {
              header: "Ambito",
              accessor: (row: SU) => row.careSetting,
            },
            {
              header: "Creado",
              accessor: (row: SU) =>
                new Date(row.createdAt).toLocaleDateString("es-CO", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }),
            },
            {
              header: "Acciones",
              accessor: (row: SU) => (
                <div className="flex items-center gap-1">
                  <Link
                    aria-label="Ver unidad de servicio"
                    className="inline-flex text-muted-foreground hover:text-foreground"
                    params={{ unitId: row.id }}
                    to="/facilities/service-units/$unitId"
                  >
                    <Eye size={14} />
                  </Link>
                  <Button
                    aria-label="Editar unidad de servicio"
                    onClick={() => startEdit(row)}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <Pencil size={12} />
                  </Button>
                  <Button
                    aria-label="Eliminar unidad de servicio"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (
                        confirm(
                          "¿Eliminar esta unidad de servicio permanentemente?"
                        )
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
          data={data?.serviceUnits ?? []}
          emptyDescription="No se encontraron unidades de servicio."
          emptyTitle="Sin unidades de servicio"
          isLoading={isLoading}
          keyExtractor={(row: SU) => row.id}
          onRowClick={(row) =>
            navigate({
              to: "/facilities/service-units/$unitId",
              params: { unitId: row.id },
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
