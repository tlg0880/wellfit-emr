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
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute(
  "/_authenticated/facilities/practitioners"
)({
  component: PractitionersPage,
});

const LIMIT = 50;

function PractitionersPage() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("CC");
  const [documentNumber, setDocumentNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [rethusNumber, setRethusNumber] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    document.title = "Profesionales | WellFit EMR";
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
    orpc.facilities.listPractitioners.queryOptions({
      input: {
        limit: LIMIT,
        offset,
        search: querySearch || undefined,
      },
    })
  );

  const createMutation = useMutation({
    ...orpc.facilities.createPractitioner.mutationOptions(),
    onSuccess: () => {
      toast.success("Profesional creado correctamente");
      setDocumentType("CC");
      setDocumentNumber("");
      setFullName("");
      setRethusNumber("");
      setActive(true);
      setShowForm(false);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Error al crear profesional: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    ...orpc.facilities.deletePractitioner.mutationOptions(),
    onSuccess: () => {
      toast.success("Profesional eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.facilities.listPractitioners.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar profesional: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    ...orpc.facilities.updatePractitioner.mutationOptions(),
    onSuccess: () => {
      toast.success("Profesional actualizado");
      setEditingId(null);
      setDocumentType("CC");
      setDocumentNumber("");
      setFullName("");
      setRethusNumber("");
      setActive(true);
      setShowForm(false);
      queryClient.invalidateQueries({
        queryKey: orpc.facilities.listPractitioners.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar profesional: ${error.message}`);
    },
  });

  function resetForm() {
    setEditingId(null);
    setDocumentType("CC");
    setDocumentNumber("");
    setFullName("");
    setRethusNumber("");
    setActive(true);
  }

  function startEdit(row: Practitioner) {
    setEditingId(row.id);
    setDocumentType(row.documentType);
    setDocumentNumber(row.documentNumber);
    setFullName(row.fullName);
    setRethusNumber(row.rethusNumber ?? "");
    setActive(row.active);
    setShowForm(true);
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(documentNumber.trim() && fullName.trim())) {
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        documentType,
        documentNumber: documentNumber.trim(),
        fullName: fullName.trim(),
        rethusNumber: rethusNumber.trim() || null,
        active,
      });
    } else {
      createMutation.mutate({
        documentType,
        documentNumber: documentNumber.trim(),
        fullName: fullName.trim(),
        rethusNumber: rethusNumber.trim() || null,
        active,
      });
    }
  };

  type Practitioner = NonNullable<typeof data>["practitioners"][0];

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
        description="Administre los profesionales de salud"
        title="Profesionales"
      />

      <div className="p-6">
        {showForm && (
          <Card className="mb-6" key={editingId || "new"}>
            <CardHeader>
              <CardTitle>
                {editingId ? "Editar profesional" : "Nuevo profesional"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                onSubmit={handleCreate}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="prac-doctype">Tipo de documento *</Label>
                  <Select
                    onValueChange={(v) => setDocumentType(v as string)}
                    value={documentType}
                  >
                    <SelectTrigger id="prac-doctype">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CC">Cedula de ciudadania</SelectItem>
                      <SelectItem value="CE">Cedula de extranjeria</SelectItem>
                      <SelectItem value="PA">Pasaporte</SelectItem>
                      <SelectItem value="RC">Registro civil</SelectItem>
                      <SelectItem value="TI">Tarjeta de identidad</SelectItem>
                      <SelectItem value="PEP">
                        Permiso especial de permanencia
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prac-docnum">Numero de documento *</Label>
                  <Input
                    id="prac-docnum"
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="Numero de documento"
                    required
                    value={documentNumber}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prac-name">Nombre completo *</Label>
                  <Input
                    id="prac-name"
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nombre completo"
                    required
                    value={fullName}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prac-rethus">Numero RETHUS</Label>
                  <Input
                    id="prac-rethus"
                    onChange={(e) => setRethusNumber(e.target.value)}
                    placeholder="Numero RETHUS"
                    value={rethusNumber}
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    checked={active}
                    className="size-4 rounded-sm border border-input"
                    id="prac-active"
                    onChange={(e) => setActive(e.target.checked)}
                    type="checkbox"
                  />
                  <Label htmlFor="prac-active">Activo</Label>
                </div>
                <div className="flex items-end gap-2 sm:col-start-1">
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
            placeholder="Buscar por nombre, documento o RETHUS..."
            value={search}
          />
        </div>

        <DataTable
          columns={[
            {
              header: "Tipo doc.",
              accessor: (row: Practitioner) => row.documentType,
              className: "w-24",
            },
            {
              header: "Documento",
              accessor: (row: Practitioner) => row.documentNumber,
            },
            {
              header: "Nombre",
              accessor: (row: Practitioner) => row.fullName,
            },
            {
              header: "RETHUS",
              accessor: (row: Practitioner) => row.rethusNumber ?? "—",
            },
            {
              header: "Estado",
              accessor: (row: Practitioner) => (
                <span
                  className={`inline-flex items-center border px-1.5 py-0.5 font-medium text-[10px] ${
                    row.active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {row.active ? "Activo" : "Inactivo"}
                </span>
              ),
            },
            {
              header: "Creado",
              accessor: (row: Practitioner) =>
                new Date(row.createdAt).toLocaleDateString("es-CO", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }),
            },
            {
              header: "Acciones",
              accessor: (row: Practitioner) => (
                <div className="flex items-center gap-1">
                  <Link
                    aria-label="Ver profesional"
                    className="inline-flex text-muted-foreground hover:text-foreground"
                    params={{ practitionerId: row.id }}
                    to="/facilities/practitioners/$practitionerId"
                  >
                    <Eye size={14} />
                  </Link>
                  <Button
                    aria-label="Editar profesional"
                    onClick={() => startEdit(row)}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <Pencil size={12} />
                  </Button>
                  <Button
                    aria-label="Eliminar profesional"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (
                        confirm("¿Eliminar este profesional permanentemente?")
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
          data={data?.practitioners ?? []}
          emptyDescription="No se encontraron profesionales."
          emptyTitle="Sin profesionales"
          isLoading={isLoading}
          keyExtractor={(row: Practitioner) => row.id}
          onRowClick={(row) =>
            navigate({
              to: "/facilities/practitioners/$practitionerId",
              params: { practitionerId: row.id },
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
