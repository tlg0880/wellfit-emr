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
import { Eye, FilterX, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/facilities/sites")({
  component: SitesPage,
});

const LIMIT = 50;

function SitesPage() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [filterOrgId, setFilterOrgId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [municipalityCode, setMunicipalityCode] = useState("");
  const [municipalitySearch, setMunicipalitySearch] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    document.title = "Sedes | WellFit EMR";
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
    orpc.facilities.listSites.queryOptions({
      input: {
        limit: LIMIT,
        offset,
        search: querySearch || undefined,
        organizationId: filterOrgId || undefined,
      },
    })
  );

  const { data: orgsData } = useQuery(
    orpc.facilities.listOrganizations.queryOptions({
      input: {
        limit: 100,
        offset: 0,
      },
    })
  );

  const { data: municipalitiesData, isLoading: municipalitiesLoading } =
    useQuery(
      orpc.ripsReference.listEntries.queryOptions({
        input: {
          tableName: "Municipio",
          limit: 20,
          search: municipalitySearch || undefined,
        },
      })
    );

  const createMutation = useMutation({
    ...orpc.facilities.createSite.mutationOptions(),
    onSuccess: () => {
      toast.success("Sede creada correctamente");
      setName("");
      setSiteCode("");
      setOrganizationId("");
      setMunicipalityCode("");
      setMunicipalitySearch("");
      setAddress("");
      setShowForm(false);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Error al crear sede: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    ...orpc.facilities.deleteSite.mutationOptions(),
    onSuccess: () => {
      toast.success("Sede eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.facilities.listSites.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar sede: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    ...orpc.facilities.updateSite.mutationOptions(),
    onSuccess: () => {
      toast.success("Sede actualizada");
      setEditingId(null);
      setName("");
      setSiteCode("");
      setOrganizationId("");
      setMunicipalityCode("");
      setMunicipalitySearch("");
      setAddress("");
      setShowForm(false);
      queryClient.invalidateQueries({
        queryKey: orpc.facilities.listSites.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar sede: ${error.message}`);
    },
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setSiteCode("");
    setOrganizationId("");
    setMunicipalityCode("");
    setMunicipalitySearch("");
    setAddress("");
  }

  function startEdit(row: Site) {
    setEditingId(row.id);
    setName(row.name);
    setSiteCode(row.siteCode);
    setOrganizationId(row.organizationId);
    setMunicipalityCode(row.municipalityCode ?? "");
    setAddress(row.address ?? "");
    setShowForm(true);
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(name.trim() && siteCode.trim() && organizationId)) {
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: name.trim(),
        siteCode: siteCode.trim(),
        organizationId,
        municipalityCode: municipalityCode.trim() || null,
        address: address.trim() || null,
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        siteCode: siteCode.trim(),
        organizationId,
        municipalityCode: municipalityCode.trim() || null,
        address: address.trim() || null,
      });
    }
  };

  const orgMap = new Map(
    orgsData?.organizations.map((o: { id: string; name: string }) => [
      o.id,
      o.name,
    ])
  );
  type Site = NonNullable<typeof data>["sites"][0];

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
        description="Administre las sedes de atencion"
        title="Sedes"
      />

      <div className="p-6">
        {showForm && (
          <Card className="mb-6" key={editingId || "new"}>
            <CardHeader>
              <CardTitle>{editingId ? "Editar sede" : "Nueva sede"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                onSubmit={handleCreate}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="site-name">Nombre *</Label>
                  <Input
                    id="site-name"
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre de la sede"
                    required
                    value={name}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="site-code">Codigo de sede *</Label>
                  <Input
                    id="site-code"
                    onChange={(e) => setSiteCode(e.target.value)}
                    placeholder="Codigo interno"
                    required
                    value={siteCode}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="site-org">Organizacion *</Label>
                  <Select
                    onValueChange={(v) => setOrganizationId(v as string)}
                    value={organizationId}
                  >
                    <SelectTrigger id="site-org">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {orgsData?.organizations.map(
                        (org: { id: string; name: string }) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="site-muni">Codigo municipio</Label>
                  <SearchSelect
                    clearable
                    emptyMessage="Escribe para buscar"
                    id="site-muni"
                    loading={municipalitiesLoading}
                    onChange={setMunicipalityCode}
                    onSearchChange={setMunicipalitySearch}
                    options={
                      municipalitiesData?.entries.map((entry) => ({
                        value: entry.code,
                        label: entry.name,
                        description: entry.code,
                      })) ?? []
                    }
                    placeholder="Buscar municipio..."
                    search={municipalitySearch}
                    value={municipalityCode}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="site-addr">Direccion</Label>
                  <Input
                    id="site-addr"
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Direccion fisica"
                    value={address}
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

        <div className="mb-4 flex flex-wrap items-end gap-2">
          <Input
            className="max-w-xs"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o codigo..."
            value={search}
          />
          <div className="space-y-1">
            <Label className="text-[10px]">Organizacion</Label>
            <Select
              onValueChange={(v) => {
                setFilterOrgId(v as string);
                setOffset(0);
              }}
              value={filterOrgId}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {orgsData?.organizations.map(
                  (org: { id: string; name: string }) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          {(search || filterOrgId) && (
            <Button
              onClick={() => {
                setSearch("");
                setFilterOrgId("");
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
          columns={[
            {
              header: "Codigo",
              accessor: (row: Site) => row.siteCode,
            },
            {
              header: "Nombre",
              accessor: (row: Site) => row.name,
            },
            {
              header: "Organizacion",
              accessor: (row: Site) => orgMap.get(row.organizationId) ?? "—",
            },
            {
              header: "Municipio",
              accessor: (row: Site) => row.municipalityCode ?? "—",
            },
            {
              header: "Direccion",
              accessor: (row: Site) => row.address ?? "—",
            },
            {
              header: "Creado",
              accessor: (row: Site) =>
                new Date(row.createdAt).toLocaleDateString("es-CO", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }),
            },
            {
              header: "Acciones",
              accessor: (row: Site) => (
                <div className="flex items-center gap-1">
                  <Link
                    aria-label="Ver sede"
                    className="inline-flex text-muted-foreground hover:text-foreground"
                    params={{ siteId: row.id }}
                    to="/facilities/sites/$siteId"
                  >
                    <Eye size={14} />
                  </Link>
                  <Button
                    aria-label="Editar sede"
                    onClick={() => startEdit(row)}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <Pencil size={12} />
                  </Button>
                  <Button
                    aria-label="Eliminar sede"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (confirm("¿Eliminar esta sede permanentemente?")) {
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
          data={data?.sites ?? []}
          emptyDescription="No se encontraron sedes."
          emptyTitle="Sin sedes"
          isLoading={isLoading}
          keyExtractor={(row: Site) => row.id}
          onRowClick={(row) =>
            navigate({
              to: "/facilities/sites/$siteId",
              params: { siteId: row.id },
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
