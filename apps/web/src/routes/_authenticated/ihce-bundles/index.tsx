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
import { Eye, FilterX, Plus, Search, Share2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/ihce-bundles/")({
  component: IhceBundlesListPage,
});

function CreateIhceBundleForm({ onCancel }: { onCancel: () => void }) {
  const [form, setForm] = useState({
    encounterId: "",
    bundleType: "document",
    bundleJson: "{}",
  });

  const [encounterSearch, setEncounterSearch] = useState("");

  const { data: encountersData, isLoading: encountersLoading } = useQuery(
    orpc.encounters.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: encounterSearch || undefined,
      },
    })
  );

  const create = useMutation({
    ...orpc.ihceBundles.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Bundle IHCE creado");
      queryClient.invalidateQueries({
        queryKey: orpc.ihceBundles.list.key({ type: "query" }),
      });
      onCancel();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear bundle");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let bundleJson: Record<string, unknown> = {};
    try {
      bundleJson = JSON.parse(form.bundleJson);
    } catch {
      toast.error("JSON inválido");
      return;
    }
    if (
      typeof bundleJson !== "object" ||
      bundleJson === null ||
      Array.isArray(bundleJson)
    ) {
      toast.error("Bundle JSON debe ser un objeto");
      return;
    }
    create.mutate({
      encounterId: form.encounterId,
      bundleType: form.bundleType,
      bundleJson,
      status: "generated",
      generatedAt: new Date(),
    });
  }

  return (
    <Card className="mx-6">
      <CardHeader>
        <CardTitle>Nuevo bundle IHCE</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
          onSubmit={handleSubmit}
        >
          <div className="space-y-1">
            <Label>Atención</Label>
            <SearchSelect
              emptyMessage="Escribe para buscar atenciones"
              loading={encountersLoading}
              onChange={(v) => setForm((f) => ({ ...f, encounterId: v }))}
              onSearchChange={setEncounterSearch}
              options={
                encountersData?.encounters.map((e) => ({
                  value: e.id,
                  label: e.reasonForVisit || "Sin motivo",
                  description: new Date(e.startedAt).toLocaleDateString(
                    "es-CO"
                  ),
                })) ?? []
              }
              placeholder="Buscar atención..."
              required
              search={encounterSearch}
              value={form.encounterId}
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo de bundle</Label>
            <Select
              onValueChange={(v) =>
                setForm((f) => ({ ...f, bundleType: v as string }))
              }
              value={form.bundleType}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document">Documento</SelectItem>
                <SelectItem value="summary">Resumen clínico</SelectItem>
                <SelectItem value="transaction">Transacción</SelectItem>
                <SelectItem value="collection">Colección</SelectItem>
                <SelectItem value="message">Mensaje</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Bundle JSON</Label>
            <Input
              onChange={(e) => setForm({ ...form, bundleJson: e.target.value })}
              value={form.bundleJson}
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-3">
            <Button
              onClick={onCancel}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button disabled={create.isPending} size="sm" type="submit">
              {create.isPending ? "Guardando..." : "Crear bundle"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function IhceBundlesListPage() {
  const navigate = useNavigate();
  const [encounterId, setEncounterId] = useState("");
  const [encounterSearch, setEncounterSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [showForm, setShowForm] = useState(false);
  const [queryEncounterSearch, setQueryEncounterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryEncounterSearch(encounterSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [encounterSearch]);

  useEffect(() => {
    document.title = "Bundles IHCE | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  const { data: encountersData, isLoading: encountersLoading } = useQuery(
    orpc.encounters.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: queryEncounterSearch || undefined,
      },
    })
  );

  const { data, isLoading } = useQuery(
    orpc.ihceBundles.list.queryOptions({
      input: {
        limit,
        offset,
        encounterId: encounterId || undefined,
        status: filterStatus || undefined,
        sortDirection: "desc",
      },
    })
  );

  const deleteMutation = useMutation({
    ...orpc.ihceBundles.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Bundle eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.ihceBundles.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar bundle");
    },
  });

  const columns = [
    {
      header: "Tipo",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <Share2 size={14} />
          {row.bundleType}
        </span>
      ),
    },
    {
      header: "Atención ID",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <Link
          className="text-primary hover:underline"
          params={{ encounterId: row.encounterId }}
          search={{ tab: undefined }}
          to="/encounters/$encounterId"
        >
          {row.encounterId.slice(0, 8)}…
        </Link>
      ),
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span
          className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${
            row.status === "generated"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : row.status === "sent"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "Generado",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.generatedAt).toLocaleString("es-CO"),
    },
    {
      header: "Enviado",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.sentAt ? new Date(row.sentAt).toLocaleString("es-CO") : "—",
    },
    {
      header: "Acciones",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <div className="flex items-center gap-1">
          <Link
            aria-label="Ver bundle"
            className="inline-flex text-muted-foreground hover:text-foreground"
            params={{ bundleId: row.id }}
            to="/ihce-bundles/$bundleId"
          >
            <Eye size={14} />
          </Link>
          <Button
            aria-label="Eliminar bundle"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar este bundle permanentemente?")) {
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
      className: "w-20",
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <Button onClick={() => setShowForm((s) => !s)} size="sm">
            <Plus size={14} />
            {showForm ? "Cancelar" : "Nuevo bundle"}
          </Button>
        }
        description="Bundles FHIR/RDA para interoperabilidad IHCE"
        icon={Share2}
        iconBgClass="bg-indigo-100 text-indigo-600"
        title="Bundles IHCE"
      />

      {showForm && <CreateIhceBundleForm onCancel={() => setShowForm(false)} />}

      <div className="px-6">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <div className="flex items-center gap-2">
            <Search className="text-muted-foreground" size={14} />
            <SearchSelect
              className="max-w-xs"
              clearable
              emptyMessage="Escribe para buscar atenciones"
              loading={encountersLoading}
              onChange={(v) => {
                setEncounterId(v);
                setOffset(0);
              }}
              onSearchChange={setEncounterSearch}
              options={
                encountersData?.encounters.map((e) => ({
                  value: e.id,
                  label: e.reasonForVisit || "Sin motivo",
                  description: new Date(e.startedAt).toLocaleDateString(
                    "es-CO"
                  ),
                })) ?? []
              }
              placeholder="Filtrar por atención..."
              search={encounterSearch}
              value={encounterId}
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
                <SelectItem value="generated">Generado</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="received">Recibido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(encounterId || filterStatus) && (
            <Button
              onClick={() => {
                setEncounterId("");
                setEncounterSearch("");
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

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          emptyDescription={
            encounterId || filterStatus
              ? "Ningún bundle coincide con los filtros aplicados."
              : "No se encontraron bundles IHCE."
          }
          emptyTitle={
            encounterId || filterStatus ? "Sin resultados" : "Sin bundles"
          }
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => {
            navigate({
              to: "/ihce-bundles/$bundleId",
              params: { bundleId: row.id },
            });
          }}
          pagination={
            data
              ? {
                  limit,
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
