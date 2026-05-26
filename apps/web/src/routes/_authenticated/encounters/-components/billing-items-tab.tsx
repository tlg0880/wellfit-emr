import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@wellfit-emr/ui/components/button";
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
import { Pencil, Plus, ReceiptText, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { orpc, queryClient } from "@/utils/orpc";

type BillingServiceType =
  | "consulta"
  | "procedimiento"
  | "medicamento"
  | "otro_servicio";

type BillingFormField =
  | "payerId"
  | "quantity"
  | "serviceCode"
  | "totalValue"
  | "unitValue";

type BillingFormErrors = Partial<Record<BillingFormField, string>>;

interface BillingSourceOption {
  description: string;
  label: string;
  serviceCode: string;
  serviceId: string;
  serviceType: BillingServiceType;
  value: string;
}

const SERVICE_TYPE_LABELS: Record<BillingServiceType, string> = {
  consulta: "Consulta",
  procedimiento: "Procedimiento",
  medicamento: "Medicamento",
  otro_servicio: "Otro servicio",
};

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;
const FIELD_LABELS: Record<string, string> = {
  payerId: "Pagador",
  quantity: "Cantidad",
  serviceCode: "Código",
  serviceType: "Tipo",
  totalValue: "Valor total",
  unitValue: "Valor unitario",
};

function isConsultationCups(code: string): boolean {
  return code.startsWith("87") || code.startsWith("89");
}

function normalizeMoney(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return trimmed;
  }

  return parsed.toFixed(2);
}

function calculateTotal(quantity: string, unitValue: string): string {
  const qty = Number(quantity);
  const unit = Number(unitValue);
  if (!(Number.isFinite(qty) && Number.isFinite(unit))) {
    return "";
  }
  return (qty * unit).toFixed(2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatIssuePath(path: unknown): string {
  if (Array.isArray(path)) {
    return path.join(".");
  }

  if (typeof path === "string") {
    return path;
  }

  return "";
}

function extractValidationMessages(error: unknown): string[] {
  const seen = new Set<unknown>();

  function visit(value: unknown, depth: number): string[] {
    if (depth > 6 || !isRecord(value) || seen.has(value)) {
      return [];
    }
    seen.add(value);

    if (Array.isArray(value.issues)) {
      const messages = value.issues
        .map((issue) => {
          if (!isRecord(issue) || typeof issue.message !== "string") {
            return null;
          }
          const path = formatIssuePath(issue.path);
          const field = path ? (FIELD_LABELS[path] ?? path) : "Campo";
          return `${field}: ${issue.message}`;
        })
        .filter((message): message is string => message !== null);

      if (messages.length > 0) {
        return messages;
      }
    }

    for (const key of ["cause", "data", "error", "response", "body"]) {
      const messages = visit(value[key], depth + 1);
      if (messages.length > 0) {
        return messages;
      }
    }

    return [];
  }

  return visit(error, 0);
}

function getBillingFormErrors(form: {
  payerId: string;
  quantity: string;
  serviceCode: string;
  totalValue: string;
  unitValue: string;
}): BillingFormErrors {
  const errors: BillingFormErrors = {};
  const quantity = Number(form.quantity);
  const unitValue = normalizeMoney(form.unitValue);
  const totalValue = normalizeMoney(form.totalValue);

  if (!form.payerId) {
    errors.payerId = "Seleccione el pagador del item.";
  }

  if (!form.serviceCode.trim()) {
    errors.serviceCode = "Ingrese o seleccione el código del servicio.";
  }

  if (!(Number.isInteger(quantity) && quantity >= 1)) {
    errors.quantity = "La cantidad debe ser un entero mayor o igual a 1.";
  }

  if (!MONEY_PATTERN.test(unitValue)) {
    errors.unitValue = "Use un valor decimal con máximo dos decimales.";
  }

  if (!MONEY_PATTERN.test(totalValue)) {
    errors.totalValue = "Use un valor decimal con máximo dos decimales.";
  }

  return errors;
}

export function BillingItemsTab({ encounterId }: { encounterId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payerSearch, setPayerSearch] = useState("");
  const [formErrors, setFormErrors] = useState<BillingFormErrors>({});
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [form, setForm] = useState({
    payerId: "",
    quantity: "1",
    serviceCode: "",
    serviceId: "",
    serviceType: "consulta" as BillingServiceType,
    description: "",
    unitValue: "",
    totalValue: "",
  });

  const { data, isLoading } = useQuery(
    orpc.billingItems.list.queryOptions({
      input: {
        encounterId,
        limit: 100,
        offset: 0,
      },
    })
  );

  const { data: procedures } = useQuery({
    ...orpc.clinicalRecords.listProcedures.queryOptions({
      input: { encounterId },
    }),
    enabled: !!encounterId,
  });

  const { data: medicationOrders } = useQuery(
    orpc.medicationOrders.list.queryOptions({
      input: {
        encounterId,
        limit: 100,
        offset: 0,
      },
    })
  );

  const { data: serviceRequests } = useQuery(
    orpc.serviceRequests.list.queryOptions({
      input: {
        encounterId,
        limit: 100,
        offset: 0,
      },
    })
  );

  const { data: payersData, isLoading: payersLoading } = useQuery(
    orpc.payers.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: payerSearch || undefined,
        status: "active",
      },
    })
  );

  const sourceOptions = useMemo<BillingSourceOption[]>(() => {
    const procedureOptions =
      procedures?.map((proc) => {
        const serviceType = isConsultationCups(proc.cupsCode)
          ? "consulta"
          : "procedimiento";
        return {
          value: `${serviceType}:${proc.id}`,
          serviceType,
          serviceId: proc.id,
          serviceCode: proc.cupsCode,
          label: `${SERVICE_TYPE_LABELS[serviceType]} · ${proc.cupsCode}`,
          description: proc.ripsReferenceName ?? proc.description,
        } satisfies BillingSourceOption;
      }) ?? [];

    const medicationOptions =
      medicationOrders?.items
        .filter((order) => order.atcCode)
        .map(
          (order) =>
            ({
              value: `medicamento:${order.id}`,
              serviceType: "medicamento",
              serviceId: order.id,
              serviceCode: order.atcCode ?? "",
              label: `Medicamento · ${order.atcCode}`,
              description: order.genericName,
            }) satisfies BillingSourceOption
        ) ?? [];

    const serviceRequestOptions =
      serviceRequests?.items.map(
        (request) =>
          ({
            value: `otro_servicio:${request.id}`,
            serviceType: "otro_servicio",
            serviceId: request.id,
            serviceCode: request.requestCode,
            label: `Otro servicio · ${request.requestCode}`,
            description: request.requestType,
          }) satisfies BillingSourceOption
      ) ?? [];

    return [
      ...procedureOptions,
      ...medicationOptions,
      ...serviceRequestOptions,
    ];
  }, [medicationOrders, procedures, serviceRequests]);

  const create = useMutation({
    ...orpc.billingItems.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Item de facturación creado");
      resetForm();
      queryClient.invalidateQueries({
        queryKey: orpc.billingItems.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      const messages = extractValidationMessages(error);
      if (messages.length > 0) {
        setServerErrors(messages);
        toast.error("No se pudo crear el item", {
          description: messages[0],
        });
        return;
      }
      toast.error(error.message || "Error al crear item de facturación");
    },
  });

  const update = useMutation({
    ...orpc.billingItems.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Item de facturación actualizado");
      resetForm();
      queryClient.invalidateQueries({
        queryKey: orpc.billingItems.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      const messages = extractValidationMessages(error);
      if (messages.length > 0) {
        setServerErrors(messages);
        toast.error("No se pudo actualizar el item", {
          description: messages[0],
        });
        return;
      }
      toast.error(error.message || "Error al actualizar item de facturación");
    },
  });

  const deleteMutation = useMutation({
    ...orpc.billingItems.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Item de facturación eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.billingItems.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar item de facturación");
    },
  });

  function resetForm() {
    setEditingId(null);
    setShowForm(false);
    setFormErrors({});
    setServerErrors([]);
    setForm({
      payerId: "",
      quantity: "1",
      serviceCode: "",
      serviceId: "",
      serviceType: "consulta",
      description: "",
      unitValue: "",
      totalValue: "",
    });
  }

  function startEdit(row: NonNullable<typeof data>["items"][0]) {
    setEditingId(row.id);
    setShowForm(true);
    setFormErrors({});
    setServerErrors([]);
    setForm({
      payerId: row.payerId,
      quantity: String(row.quantity),
      serviceCode: row.serviceCode,
      serviceId: row.serviceId ?? "",
      serviceType: row.serviceType,
      description: row.description ?? "",
      unitValue: row.unitValue,
      totalValue: row.totalValue,
    });
  }

  function handleSourceChange(value: string) {
    const selected = sourceOptions.find((option) => option.value === value);
    if (!selected) {
      return;
    }

    setForm((current) => ({
      ...current,
      serviceType: selected.serviceType,
      serviceId: selected.serviceId,
      serviceCode: selected.serviceCode,
      description: selected.description,
    }));
    setFormErrors((errors) => ({ ...errors, serviceCode: undefined }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerErrors([]);

    const unitValue = normalizeMoney(form.unitValue);
    const totalValue = normalizeMoney(form.totalValue);
    const errors = getBillingFormErrors(form);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Revise los campos de facturación", {
        description: Object.values(errors)[0],
      });
      return;
    }

    setFormErrors({});

    const payload = {
      encounterId,
      payerId: form.payerId,
      quantity: Number(form.quantity),
      serviceCode: form.serviceCode.trim(),
      serviceId: form.serviceId || null,
      serviceType: form.serviceType,
      description: form.description.trim() || null,
      unitValue,
      totalValue,
    };

    if (editingId) {
      update.mutate({ ...payload, id: editingId });
      return;
    }

    create.mutate(payload);
  }

  const columns = [
    {
      header: "Servicio",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <ReceiptText size={14} />
          <span>
            <span className="font-medium">
              {SERVICE_TYPE_LABELS[row.serviceType]}
            </span>{" "}
            <span className="font-mono text-muted-foreground">
              {row.serviceCode}
            </span>
          </span>
        </span>
      ),
    },
    {
      header: "Descripción",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.description ?? "—",
    },
    {
      header: "Pagador",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.payerName ?? row.payerCode ?? row.payerId.slice(0, 8),
    },
    {
      header: "Cantidad",
      accessor: (row: NonNullable<typeof data>["items"][0]) => row.quantity,
    },
    {
      header: "Valor unitario",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        `$${row.unitValue}`,
    },
    {
      header: "Total",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        `$${row.totalValue}`,
    },
    {
      header: "",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <div className="flex items-center gap-1">
          <Button
            aria-label="Editar item de facturación"
            onClick={() => startEdit(row)}
            size="icon-xs"
            variant="ghost"
          >
            <Pencil size={12} />
          </Button>
          <Button
            aria-label="Eliminar item de facturación"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar este item de facturación?")) {
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
      <div className="flex justify-end">
        <Button
          onClick={() => {
            if (showForm) {
              resetForm();
              return;
            }
            setShowForm(true);
          }}
          size="sm"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Agregar facturación"}
        </Button>
      </div>

      {showForm && (
        <form
          className="grid grid-cols-1 gap-3 border p-4 md:grid-cols-4"
          onSubmit={handleSubmit}
        >
          <div className="space-y-1 md:col-span-2">
            <Label>Servicio clínico</Label>
            <SearchSelect
              clearable
              emptyMessage="No hay servicios disponibles en esta atención"
              onChange={handleSourceChange}
              onSearchChange={() => undefined}
              options={sourceOptions.map((option) => ({
                value: option.value,
                label: option.label,
                description: option.description,
              }))}
              placeholder="Seleccionar servicio..."
              search=""
              value={
                form.serviceId ? `${form.serviceType}:${form.serviceId}` : ""
              }
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Pagador *</Label>
            <SearchSelect
              emptyMessage="Escribe para buscar pagador..."
              loading={payersLoading}
              onChange={(payerId) => {
                setForm((f) => ({ ...f, payerId }));
                setFormErrors((errors) => ({ ...errors, payerId: undefined }));
              }}
              onSearchChange={setPayerSearch}
              options={
                payersData?.items.map((p) => ({
                  value: p.id,
                  label: p.name,
                  description: p.code,
                })) ?? []
              }
              placeholder="Buscar pagador..."
              required
              search={payerSearch}
              value={form.payerId}
            />
            {formErrors.payerId && (
              <p className="text-destructive text-xs">{formErrors.payerId}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Tipo *</Label>
            <Select
              onValueChange={(serviceType) =>
                setForm((f) => ({
                  ...f,
                  serviceType: serviceType as BillingServiceType,
                }))
              }
              value={form.serviceType}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consulta">Consulta</SelectItem>
                <SelectItem value="procedimiento">Procedimiento</SelectItem>
                <SelectItem value="medicamento">Medicamento</SelectItem>
                <SelectItem value="otro_servicio">Otro servicio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Código *</Label>
            <Input
              aria-invalid={!!formErrors.serviceCode}
              onChange={(event) => {
                setForm((f) => ({ ...f, serviceCode: event.target.value }));
                setFormErrors((errors) => ({
                  ...errors,
                  serviceCode: undefined,
                }));
              }}
              required
              value={form.serviceCode}
            />
            {formErrors.serviceCode && (
              <p className="text-destructive text-xs">
                {formErrors.serviceCode}
              </p>
            )}
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Descripción</Label>
            <Input
              onChange={(event) =>
                setForm((f) => ({ ...f, description: event.target.value }))
              }
              value={form.description}
            />
          </div>

          <div className="space-y-1">
            <Label>Cantidad *</Label>
            <Input
              aria-invalid={!!formErrors.quantity}
              min={1}
              onChange={(event) => {
                const quantity = event.target.value;
                setForm((f) => ({
                  ...f,
                  quantity,
                  totalValue: calculateTotal(quantity, f.unitValue),
                }));
                setFormErrors((errors) => ({
                  ...errors,
                  quantity: undefined,
                }));
              }}
              required
              type="number"
              value={form.quantity}
            />
            {formErrors.quantity && (
              <p className="text-destructive text-xs">{formErrors.quantity}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Valor unitario *</Label>
            <Input
              aria-invalid={!!formErrors.unitValue}
              inputMode="decimal"
              onBlur={() =>
                setForm((f) => ({
                  ...f,
                  unitValue: normalizeMoney(f.unitValue),
                  totalValue: normalizeMoney(
                    f.totalValue || calculateTotal(f.quantity, f.unitValue)
                  ),
                }))
              }
              onChange={(event) => {
                const unitValue = event.target.value;
                setForm((f) => ({
                  ...f,
                  unitValue,
                  totalValue: calculateTotal(f.quantity, unitValue),
                }));
                setFormErrors((errors) => ({
                  ...errors,
                  unitValue: undefined,
                }));
              }}
              placeholder="0.00"
              required
              value={form.unitValue}
            />
            {formErrors.unitValue && (
              <p className="text-destructive text-xs">{formErrors.unitValue}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Valor total *</Label>
            <Input
              aria-invalid={!!formErrors.totalValue}
              inputMode="decimal"
              onBlur={() =>
                setForm((f) => ({
                  ...f,
                  totalValue: normalizeMoney(f.totalValue),
                }))
              }
              onChange={(event) => {
                setForm((f) => ({ ...f, totalValue: event.target.value }));
                setFormErrors((errors) => ({
                  ...errors,
                  totalValue: undefined,
                }));
              }}
              placeholder="0.00"
              required
              value={form.totalValue}
            />
            {formErrors.totalValue && (
              <p className="text-destructive text-xs">
                {formErrors.totalValue}
              </p>
            )}
          </div>

          {serverErrors.length > 0 && (
            <div className="border border-red-200 bg-red-50 p-3 text-red-900 text-xs md:col-span-4">
              <p className="font-semibold">No se pudo guardar el item.</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {serverErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-end gap-2 md:col-span-4">
            <Button
              disabled={create.isPending || update.isPending}
              size="sm"
              type="submit"
            >
              {create.isPending || update.isPending
                ? "Guardando..."
                : editingId
                  ? "Actualizar item"
                  : "Guardar item"}
            </Button>
            {editingId && (
              <Button
                onClick={resetForm}
                size="sm"
                type="button"
                variant="ghost"
              >
                Cancelar edición
              </Button>
            )}
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        emptyDescription="No hay items de facturación registrados para esta atención. RIPS requiere un item por servicio y pagador."
        emptyTitle="Sin facturación"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
        rowIdExtractor={(row) => `rips-billing-item-${row.id}`}
      />
    </div>
  );
}
