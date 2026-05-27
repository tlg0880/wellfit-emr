import { useMutation, useQuery } from "@tanstack/react-query";
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
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  formatRipsPeriodForInput,
  parseRipsPeriodFromInput,
  parseRipsPeriodToInput,
} from "@/lib/rips-period";
import { orpc, queryClient } from "@/utils/orpc";

export type RipsOperationType =
  | "FEV_RIPS"
  | "NC_PARCIAL"
  | "ND"
  | "NOTA_AJUSTE_RIPS"
  | "RIPS_SIN_FACTURA"
  | "CAPITA_PERIODO"
  | "CAPITA_FINAL";

export interface RipsExportFormValues {
  invoiceNumber: string;
  noteNumber: string;
  noteType: string;
  operationType: RipsOperationType;
  organizationTaxId: string;
  payerId: string;
  periodFrom: string;
  periodTo: string;
}

const EMPTY_FORM: RipsExportFormValues = {
  payerId: "",
  periodFrom: new Date().toISOString().slice(0, 10),
  periodTo: new Date().toISOString().slice(0, 10),
  operationType: "FEV_RIPS",
  invoiceNumber: "",
  noteType: "",
  noteNumber: "",
  organizationTaxId: "",
};

function noteTypeForOperation(operationType: string, current: string): string {
  if (operationType === "RIPS_SIN_FACTURA") {
    return "RS";
  }
  if (operationType === "NC_PARCIAL") {
    return "NC";
  }
  if (operationType === "ND") {
    return "ND";
  }
  if (operationType === "NOTA_AJUSTE_RIPS") {
    return "NA";
  }
  return current;
}

function buildMutationPayload(form: RipsExportFormValues) {
  return {
    payerId: form.payerId,
    periodFrom: parseRipsPeriodFromInput(form.periodFrom),
    periodTo: parseRipsPeriodToInput(form.periodTo),
    organizationTaxId: form.organizationTaxId || null,
    operationType: form.operationType,
    invoiceNumber: form.invoiceNumber || null,
    noteType: form.noteType || null,
    noteNumber: form.noteNumber || null,
  };
}

interface RipsExportFormProps {
  exportId?: string;
  initialValues?: Partial<RipsExportFormValues>;
  mode: "create" | "edit";
  onCancel: () => void;
  onSuccess?: () => void;
  title: string;
}

export function RipsExportForm({
  mode,
  exportId,
  initialValues,
  title,
  onCancel,
  onSuccess,
}: RipsExportFormProps) {
  const [form, setForm] = useState<RipsExportFormValues>({
    ...EMPTY_FORM,
    ...initialValues,
  });
  const [payerSearch, setPayerSearch] = useState("");

  useEffect(() => {
    if (initialValues) {
      setForm({ ...EMPTY_FORM, ...initialValues });
    }
  }, [initialValues]);

  const { data: payersData, isLoading: payersLoading } = useQuery(
    orpc.payers.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: payerSearch || undefined,
      },
    })
  );

  const createMutation = useMutation({
    ...orpc.ripsExports.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Exportación RIPS creada");
      queryClient.invalidateQueries({
        queryKey: orpc.ripsExports.list.key({ type: "query" }),
      });
      onSuccess?.();
      onCancel();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear exportación");
    },
  });

  const updateMutation = useMutation({
    ...orpc.ripsExports.update.mutationOptions(),
    onSuccess: (data) => {
      const invalidated =
        data.status === "draft" && data.payloadJson === null && mode === "edit";
      toast.success(
        invalidated
          ? "Exportación actualizada. Vuelva a generar el payload RIPS."
          : "Exportación actualizada"
      );
      queryClient.invalidateQueries({
        queryKey: orpc.ripsExports.list.key({ type: "query" }),
      });
      if (exportId) {
        queryClient.invalidateQueries({
          queryKey: orpc.ripsExports.get.key({ input: { id: exportId } }),
        });
      }
      onSuccess?.();
      onCancel();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar exportación");
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = buildMutationPayload(form);

    if (mode === "create") {
      createMutation.mutate({
        ...payload,
        status: "draft",
        generatedAt: new Date(),
      });
      return;
    }

    if (!exportId) {
      return;
    }

    updateMutation.mutate({
      id: exportId,
      ...payload,
    });
  }

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
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
                  operationType: v as RipsOperationType,
                  noteType: noteTypeForOperation(String(v), f.noteType),
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
              onChange={(e) =>
                setForm({ ...form, periodFrom: e.target.value })
              }
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
          {mode === "edit" ? (
            <p className="text-muted-foreground text-xs md:col-span-3">
              Si cambia pagador, periodo, operación o datos de factura/nota, el
              payload generado se invalidará y deberá volver a generar.
            </p>
          ) : null}
          <div className="flex items-end gap-2 md:col-span-3">
            <Button
              onClick={onCancel}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button disabled={isPending} size="sm" type="submit">
              {isPending
                ? "Guardando..."
                : mode === "create"
                  ? "Crear exportación"
                  : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ripsExportToFormValues(exportData: {
  invoiceNumber: string | null;
  noteNumber: string | null;
  noteType: string | null;
  operationType: string;
  organizationTaxId: string | null;
  payerId: string;
  periodFrom: Date;
  periodTo: Date;
}): RipsExportFormValues {
  return {
    payerId: exportData.payerId,
    periodFrom: formatRipsPeriodForInput(new Date(exportData.periodFrom)),
    periodTo: formatRipsPeriodForInput(new Date(exportData.periodTo)),
    operationType: exportData.operationType as RipsOperationType,
    organizationTaxId: exportData.organizationTaxId ?? "",
    invoiceNumber: exportData.invoiceNumber ?? "",
    noteType: exportData.noteType ?? "",
    noteNumber: exportData.noteNumber ?? "",
  };
}
