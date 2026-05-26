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
import {
  Eye,
  FileOutput,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";
import {
  extractRipsGenerationIssues,
  RipsGenerationIssuesPanel,
  showRipsGenerationIssuesToast,
} from "./-components/generation-issues";

export const Route = createFileRoute("/_authenticated/rips-exports/")({
  component: RipsExportsListPage,
});

function CreateRipsExportForm({ onCancel }: { onCancel: () => void }) {
  const [form, setForm] = useState({
    payerId: "",
    periodFrom: new Date().toISOString().slice(0, 10),
    periodTo: new Date().toISOString().slice(0, 10),
    status: "draft",
    operationType: "FEV_RIPS",
    invoiceNumber: "",
    noteType: "",
    noteNumber: "",
    organizationTaxId: "",
  });

  const [payerSearch, setPayerSearch] = useState("");

  const { data: payersData, isLoading: payersLoading } = useQuery(
    orpc.payers.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: payerSearch || undefined,
      },
    })
  );

  const create = useMutation({
    ...orpc.ripsExports.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Exportación RIPS creada");
      queryClient.invalidateQueries({
        queryKey: orpc.ripsExports.list.key({ type: "query" }),
      });
      onCancel();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear exportación");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate({
      payerId: form.payerId,
      periodFrom: new Date(form.periodFrom),
      periodTo: new Date(form.periodTo),
      status: form.status,
      generatedAt: new Date(),
      organizationTaxId: form.organizationTaxId || null,
      operationType: form.operationType as
        | "FEV_RIPS"
        | "NC_PARCIAL"
        | "ND"
        | "NOTA_AJUSTE_RIPS"
        | "RIPS_SIN_FACTURA"
        | "CAPITA_PERIODO"
        | "CAPITA_FINAL",
      invoiceNumber: form.invoiceNumber || null,
      noteType: form.noteType || null,
      noteNumber: form.noteNumber || null,
    });
  }

  return (
    <Card className="mx-6 overflow-visible">
      <CardHeader>
        <CardTitle>Nueva exportación RIPS</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
          onSubmit={handleSubmit}
        >
          <div className="space-y-1">
            <Label>Pagador *</Label>
            <SearchSelect
              emptyMessage="Escribe para buscar pagador..."
              loading={payersLoading}
              onChange={(v) => setForm((f) => ({ ...f, payerId: v }))}
              onSearchChange={setPayerSearch}
              options={
                payersData?.items.map((p) => ({
                  value: p.id,
                  label: p.name,
                  description: p.code ?? undefined,
                })) ?? []
              }
              placeholder="Buscar pagador..."
              required
              search={payerSearch}
              value={form.payerId}
            />
          </div>
          <div className="space-y-1">
            <Label>Operación *</Label>
            <Select
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  operationType: v as string,
                  noteType:
                    v === "RIPS_SIN_FACTURA"
                      ? "RS"
                      : v === "NC_PARCIAL"
                        ? "NC"
                        : v === "ND"
                          ? "ND"
                          : v === "NOTA_AJUSTE_RIPS"
                            ? "NA"
                            : f.noteType,
                }))
              }
              value={form.operationType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de operación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FEV_RIPS">FEV + RIPS</SelectItem>
                <SelectItem value="NC_PARCIAL">NC parcial + RIPS</SelectItem>
                <SelectItem value="ND">ND + RIPS</SelectItem>
                <SelectItem value="NOTA_AJUSTE_RIPS">
                  Nota ajuste RIPS
                </SelectItem>
                <SelectItem value="RIPS_SIN_FACTURA">
                  RIPS sin factura
                </SelectItem>
                <SelectItem value="CAPITA_PERIODO">Cápita periodo</SelectItem>
                <SelectItem value="CAPITA_FINAL">Cápita final</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Periodo desde *</Label>
            <Input
              onChange={(e) => setForm({ ...form, periodFrom: e.target.value })}
              required
              type="date"
              value={form.periodFrom}
            />
          </div>
          <div className="space-y-1">
            <Label>Periodo hasta *</Label>
            <Input
              onChange={(e) => setForm({ ...form, periodTo: e.target.value })}
              required
              type="date"
              value={form.periodTo}
            />
          </div>
          <div className="space-y-1">
            <Label>NIT obligado</Label>
            <Input
              onChange={(e) =>
                setForm({ ...form, organizationTaxId: e.target.value })
              }
              placeholder="900123456"
              type="text"
              value={form.organizationTaxId}
            />
          </div>
          <div className="space-y-1">
            <Label>Factura</Label>
            <Input
              disabled={form.operationType === "RIPS_SIN_FACTURA"}
              onChange={(e) =>
                setForm({ ...form, invoiceNumber: e.target.value })
              }
              placeholder="FEV-001"
              required={
                ![
                  "RIPS_SIN_FACTURA",
                  "NOTA_AJUSTE_RIPS",
                  "CAPITA_FINAL",
                ].includes(form.operationType)
              }
              type="text"
              value={form.invoiceNumber}
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo nota</Label>
            <Input
              disabled={form.operationType === "RIPS_SIN_FACTURA"}
              onChange={(e) => setForm({ ...form, noteType: e.target.value })}
              placeholder="NC, ND o NA"
              type="text"
              value={form.noteType}
            />
          </div>
          <div className="space-y-1">
            <Label>Número nota / consecutivo</Label>
            <Input
              onChange={(e) => setForm({ ...form, noteNumber: e.target.value })}
              placeholder="NA-001 / RS-001"
              required={[
                "RIPS_SIN_FACTURA",
                "NC_PARCIAL",
                "ND",
                "NOTA_AJUSTE_RIPS",
              ].includes(form.operationType)}
              type="text"
              value={form.noteNumber}
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
              {create.isPending ? "Guardando..." : "Crear exportación"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function RipsExportsListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [showForm, setShowForm] = useState(false);
  const [generationIssues, setGenerationIssues] = useState<
    ReturnType<typeof extractRipsGenerationIssues>
  >([]);

  useEffect(() => {
    document.title = "RIPS | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  const { data, isLoading } = useQuery(
    orpc.ripsExports.list.queryOptions({
      input: {
        limit,
        offset,
        status: status || undefined,
        sortDirection: "desc",
      },
    })
  );

  const deleteMutation = useMutation({
    ...orpc.ripsExports.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Exportación eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.ripsExports.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar exportación");
    },
  });

  const generateMutation = useMutation({
    ...orpc.ripsExports.generatePayload.mutationOptions(),
    onMutate: () => {
      setGenerationIssues([]);
    },
    onSuccess: () => {
      toast.success("Payload generado");
      queryClient.invalidateQueries({
        queryKey: orpc.ripsExports.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      const issues = extractRipsGenerationIssues(error);
      if (issues.length > 0) {
        setGenerationIssues(issues);
        showRipsGenerationIssuesToast(issues);
        return;
      }
      toast.error(error.message || "Error al generar payload");
    },
  });

  const validateMutation = useMutation({
    ...orpc.ripsExports.validatePayload.mutationOptions(),
    onSuccess: (data) => {
      if (data.validation.passed) {
        toast.success("Validación aprobada");
      } else {
        toast.error(
          `Validación rechazada: ${data.validation.rejections.length} rechazos`
        );
      }
      queryClient.invalidateQueries({
        queryKey: orpc.ripsExports.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al validar");
    },
  });

  const columns = [
    {
      header: "Pagador ID",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <FileOutput size={14} />
          {row.payerId.slice(0, 8)}…
        </span>
      ),
    },
    {
      header: "Periodo",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        `${new Date(row.periodFrom).toLocaleDateString("es-CO")} - ${new Date(row.periodTo).toLocaleDateString("es-CO")}`,
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>["items"][0]) => {
        const statusClasses: Record<string, string> = {
          draft: "border-amber-200 bg-amber-50 text-amber-700",
          generated: "border-sky-200 bg-sky-50 text-sky-700",
          ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
          locally_invalid: "border-red-200 bg-red-50 text-red-700",
          sent: "border-blue-200 bg-blue-50 text-blue-700",
          validated: "border-emerald-200 bg-emerald-50 text-emerald-700",
        };
        return (
          <span
            className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${statusClasses[row.status] ?? "border-slate-200 bg-slate-50 text-slate-700"}`}
          >
            {row.status}
          </span>
        );
      },
    },
    {
      header: "Generado",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.generatedAt).toLocaleString("es-CO"),
    },
    {
      header: "Acciones",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <div className="flex items-center gap-1">
          <Button
            aria-label="Generar payload"
            disabled={generateMutation.isPending}
            onClick={() => generateMutation.mutate({ id: row.id })}
            size="icon-xs"
            variant="ghost"
          >
            <Play size={12} />
          </Button>
          <Button
            aria-label="Validar payload"
            disabled={!row.payloadJson || validateMutation.isPending}
            onClick={() => validateMutation.mutate({ id: row.id })}
            size="icon-xs"
            variant="ghost"
          >
            <ShieldCheck size={12} />
          </Button>
          <Link
            aria-label="Ver exportación"
            className="inline-flex text-muted-foreground hover:text-foreground"
            params={{ exportId: row.id }}
            to="/rips-exports/$exportId"
          >
            <Eye size={14} />
          </Link>
          <Button
            aria-label="Eliminar exportación"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar esta exportación permanentemente?")) {
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
      className: "w-32",
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <Button onClick={() => setShowForm((s) => !s)} size="sm">
            <Plus size={14} />
            {showForm ? "Cancelar" : "Nueva exportación"}
          </Button>
        }
        description="Generación y seguimiento de lotes RIPS"
        icon={FileOutput}
        iconBgClass="bg-sky-100 text-sky-600"
        title="Exportaciones RIPS"
      />

      {showForm && <CreateRipsExportForm onCancel={() => setShowForm(false)} />}

      <div className="px-6">
        <RipsGenerationIssuesPanel
          issues={generationIssues}
          onDismiss={() => setGenerationIssues([])}
        />

        <div className="mb-3 flex items-center gap-2">
          <Search className="text-muted-foreground" size={14} />
          <Select
            onValueChange={(v) => {
              setStatus(v === "all" ? "" : (v as string));
              setOffset(0);
            }}
            value={status || "all"}
          >
            <SelectTrigger className="h-7 max-w-xs text-xs">
              <SelectValue placeholder="Filtrar por estado..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="generated">Generado</SelectItem>
              <SelectItem value="ready">Listo</SelectItem>
              <SelectItem value="locally_invalid">Invalido local</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="validated">Validado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          emptyDescription={
            status
              ? "Ninguna exportación coincide con los filtros aplicados."
              : "No se encontraron exportaciones RIPS."
          }
          emptyTitle={status ? "Sin resultados" : "Sin exportaciones"}
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => {
            navigate({
              to: "/rips-exports/$exportId",
              params: { exportId: row.id },
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
