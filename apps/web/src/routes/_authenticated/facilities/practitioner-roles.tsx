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
  "/_authenticated/facilities/practitioner-roles"
)({
  component: PractitionerRolesPage,
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
const ROLE_OPTIONS = [
  { value: "physician", label: "Médico" },
  { value: "nurse", label: "Enfermería" },
  { value: "dentist", label: "Odontólogo" },
  { value: "psychologist", label: "Psicólogo" },
  { value: "pharmacist", label: "Farmacéutico" },
  { value: "physiotherapist", label: "Fisioterapeuta" },
  { value: "admin", label: "Administrativo" },
  { value: "lab_tech", label: "Técnico de laboratorio" },
  { value: "radiologist", label: "Radiólogo" },
];

function PractitionerRolesPage() {
  const _navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [practitionerId, setPractitionerId] = useState("");
  const [practitionerSearch, setPractitionerSearch] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [siteId, setSiteId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  useEffect(() => {
    document.title = "Roles de profesionales | WellFit EMR";
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
    orpc.practitionerRoles.list.queryOptions({
      input: {
        limit: LIMIT,
        offset,
        sortDirection: "asc",
      },
    })
  );

  const { data: practitionersData, isLoading: practitionersLoading } = useQuery(
    orpc.facilities.listPractitioners.queryOptions({
      input: {
        limit: 50,
        offset: 0,
        search: practitionerSearch || undefined,
      },
    })
  );

  const { data: orgsData } = useQuery(
    orpc.facilities.listOrganizations.queryOptions({
      input: { limit: 100, offset: 0 },
    })
  );

  const { data: sitesData } = useQuery(
    orpc.facilities.listSites.queryOptions({
      input: { limit: 100, offset: 0 },
    })
  );

  const createMutation = useMutation({
    ...orpc.practitionerRoles.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Rol asignado correctamente");
      resetForm();
      setShowForm(false);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Error al asignar rol: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    ...orpc.practitionerRoles.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Rol eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.practitionerRoles.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar rol: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    ...orpc.practitionerRoles.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Rol actualizado");
      setEditingId(null);
      resetForm();
      setShowForm(false);
      queryClient.invalidateQueries({
        queryKey: orpc.practitionerRoles.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar rol: ${error.message}`);
    },
  });

  function resetForm() {
    setEditingId(null);
    setPractitionerId("");
    setPractitionerSearch("");
    setOrganizationId("");
    setRoleCode("");
    setSiteId("");
    setStartAt("");
    setEndAt("");
  }

  function startEdit(row: Role) {
    setEditingId(row.id);
    setPractitionerId(row.practitionerId);
    setOrganizationId(row.organizationId);
    setRoleCode(row.roleCode);
    setSiteId(row.siteId ?? "");
    setStartAt(new Date(row.startAt).toISOString().slice(0, 10));
    setEndAt(row.endAt ? new Date(row.endAt).toISOString().slice(0, 10) : "");
    setShowForm(true);
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(practitionerId && organizationId && roleCode && startAt)) {
      toast.error(
        "Profesional, organización, rol y fecha de inicio son obligatorios"
      );
      return;
    }
    const payload = {
      practitionerId,
      organizationId,
      roleCode,
      siteId: siteId || null,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const practitionerMap = new Map(
    practitionersData?.practitioners.map(
      (p: { id: string; fullName: string }) => [p.id, p.fullName]
    )
  );
  const orgMap = new Map(
    orgsData?.organizations.map((o: { id: string; name: string }) => [
      o.id,
      o.name,
    ])
  );
  const siteMap = new Map(
    sitesData?.sites.map((s: { id: string; name: string }) => [s.id, s.name])
  );

  const roleLabelMap = new Map(ROLE_OPTIONS.map((r) => [r.value, r.label]));

  type Role = NonNullable<typeof data>["items"][0];

  const items =
    data?.items.filter((r) => {
      if (!querySearch) {
        return true;
      }
      const q = querySearch.toLowerCase();
      const practitionerName = practitionerMap.get(r.practitionerId) ?? "";
      const orgName = orgMap.get(r.organizationId) ?? "";
      const roleLabel = roleLabelMap.get(r.roleCode) ?? r.roleCode;
      return (
        practitionerName.toLowerCase().includes(q) ||
        orgName.toLowerCase().includes(q) ||
        roleLabel.toLowerCase().includes(q) ||
        r.roleCode.toLowerCase().includes(q)
      );
    }) ?? [];

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
            <span className="ml-1.5">{showForm ? "Cancelar" : "Nuevo"}</span>
          </Button>
        }
        description="Administre los roles asignados a profesionales de salud"
        title="Roles de profesionales"
      />

      <div className="p-6">
        {showForm && (
          <Card className="mb-6" key={editingId || "new"}>
            <CardHeader>
              <CardTitle>
                {editingId ? "Editar rol" : "Nuevo rol de profesional"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                onSubmit={handleCreate}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="role-practitioner">Profesional *</Label>
                  <SearchSelect
                    emptyMessage="Buscar profesional"
                    id="role-practitioner"
                    loading={practitionersLoading}
                    onChange={(v) => {
                      setPractitionerId(v);
                    }}
                    onSearchChange={setPractitionerSearch}
                    options={
                      practitionersData?.practitioners.map((p) => ({
                        value: p.id,
                        label: p.fullName,
                        description: `${p.documentType} ${p.documentNumber}`,
                      })) ?? []
                    }
                    placeholder="Seleccionar profesional..."
                    required
                    search={practitionerSearch}
                    value={practitionerId}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role-org">Organización *</Label>
                  <Select
                    onValueChange={(v) => setOrganizationId(v as string)}
                    value={organizationId}
                  >
                    <SelectTrigger id="role-org">
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
                  <Label htmlFor="role-code">Rol *</Label>
                  <Select
                    onValueChange={(v) => setRoleCode(v as string)}
                    value={roleCode}
                  >
                    <SelectTrigger id="role-code">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role-site">Sede</Label>
                  <Select
                    onValueChange={(v) => setSiteId(v as string)}
                    value={siteId}
                  >
                    <SelectTrigger id="role-site">
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
                <div className="space-y-1.5">
                  <Label htmlFor="role-start">Fecha inicio *</Label>
                  <Input
                    id="role-start"
                    onChange={(e) => setStartAt(e.target.value)}
                    required
                    type="date"
                    value={startAt}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role-end">Fecha fin</Label>
                  <Input
                    id="role-end"
                    onChange={(e) => setEndAt(e.target.value)}
                    type="date"
                    value={endAt}
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
            placeholder="Buscar por profesional, rol u organización..."
            value={search}
          />
        </div>

        <DataTable
          columns={[
            {
              header: "Rol",
              accessor: (row: Role) => (
                <span className="font-medium">
                  {roleLabelMap.get(row.roleCode) ?? row.roleCode}
                </span>
              ),
            },
            {
              header: "Profesional",
              accessor: (row: Role) =>
                practitionerMap.get(row.practitionerId) ??
                `${row.practitionerId.slice(0, 8)}…`,
            },
            {
              header: "Organización",
              accessor: (row: Role) =>
                orgMap.get(row.organizationId) ??
                `${row.organizationId.slice(0, 8)}…`,
            },
            {
              header: "Sede",
              accessor: (row: Role) =>
                row.siteId
                  ? (siteMap.get(row.siteId) ?? `${row.siteId.slice(0, 8)}…`)
                  : "—",
            },
            {
              header: "Inicio",
              accessor: (row: Role) =>
                new Date(row.startAt).toLocaleDateString("es-CO"),
            },
            {
              header: "Fin",
              accessor: (row: Role) =>
                row.endAt
                  ? new Date(row.endAt).toLocaleDateString("es-CO")
                  : "—",
            },
            {
              header: "Acciones",
              accessor: (row: Role) => (
                <div className="flex items-center gap-1">
                  <Link
                    aria-label="Ver profesional"
                    className="inline-flex text-muted-foreground hover:text-foreground"
                    params={{ practitionerId: row.practitionerId }}
                    to="/facilities/practitioners/$practitionerId"
                  >
                    <Eye size={14} />
                  </Link>
                  <Button
                    aria-label="Editar rol"
                    onClick={() => startEdit(row)}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <Pencil size={12} />
                  </Button>
                  <Button
                    aria-label="Eliminar rol"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (confirm("¿Eliminar este rol permanentemente?")) {
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
          data={items}
          emptyDescription="No se encontraron roles de profesionales."
          emptyTitle="Sin roles"
          isLoading={isLoading}
          keyExtractor={(row: Role) => row.id}
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
