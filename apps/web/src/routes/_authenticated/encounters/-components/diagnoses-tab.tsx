import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@wellfit-emr/ui/components/button";
import { Input } from "@wellfit-emr/ui/components/input";
import { Label } from "@wellfit-emr/ui/components/label";
import { SearchSelect } from "@wellfit-emr/ui/components/search-select";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DataTable } from "@/components/data-table";
import { orpc } from "@/utils/orpc";

const diagnosisSchema = z.object({
  codeSystem: z.string().min(1, "Requerido"),
  code: z.string().min(1, "Requerido"),
  description: z.string().min(1, "Requerido"),
  diagnosisType: z.string().min(1, "Requerido"),
  rank: z.string(),
  certainty: z.string(),
});

export function DiagnosesTab({ encounterId }: { encounterId: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [diagnosisSearch, setDiagnosisSearch] = useState("");
  const [diagnosisTypeSearch, setDiagnosisTypeSearch] = useState("");

  const { data, isLoading } = useQuery(
    orpc.clinicalRecords.listDiagnoses.queryOptions({
      input: { encounterId },
    })
  );

  const { data: diagnosesData, isLoading: diagnosesLoading } = useQuery(
    orpc.ripsReference.listEntries.queryOptions({
      input: {
        tableName: "CIE10",
        limit: 20,
        search: diagnosisSearch || undefined,
      },
    })
  );

  const { data: diagnosisTypesData, isLoading: diagnosisTypesLoading } =
    useQuery(
      orpc.ripsReference.listEntries.queryOptions({
        input: {
          tableName: "RIPSTipoDiagnosticoPrincipalVersion2",
          limit: 20,
          search: diagnosisTypeSearch || undefined,
        },
      })
    );

  const create = useMutation({
    ...orpc.clinicalRecords.createDiagnosis.mutationOptions(),
    onSuccess: () => {
      toast.success("Diagnóstico agregado");
      setShowForm(false);
      form.reset();
      queryClient.invalidateQueries({
        queryKey: orpc.clinicalRecords.listDiagnoses.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const form = useForm({
    defaultValues: {
      codeSystem: "CIE10",
      code: "",
      description: "",
      diagnosisType: "",
      rank: "",
      certainty: "",
    },
    onSubmit: async ({ value }) => {
      await create.mutateAsync({
        encounterId,
        codeSystem: value.codeSystem,
        code: value.code,
        description: value.description,
        diagnosisType: value.diagnosisType,
        rank: value.rank ? Number(value.rank) : null,
        certainty: value.certainty || null,
        documentVersionId: null,
        onsetAt: null,
      });
    },
    validators: {
      onSubmit: diagnosisSchema,
    },
  });

  const columns = [
    {
      header: "Código",
      accessor: (row: NonNullable<typeof data>[0]) => (
        <span className="font-medium">
          {row.codeSystem} {row.code}
        </span>
      ),
    },
    {
      header: "Descripción",
      accessor: (row: NonNullable<typeof data>[0]) => row.description,
    },
    {
      header: "Tipo",
      accessor: (row: NonNullable<typeof data>[0]) => row.diagnosisType,
    },
    {
      header: "Rango",
      accessor: (row: NonNullable<typeof data>[0]) => row.rank ?? "—",
    },
    {
      header: "Certeza",
      accessor: (row: NonNullable<typeof data>[0]) => row.certainty ?? "—",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Agregar diagnóstico"}
        </Button>
      </div>

      {showForm && (
        <form
          className="grid grid-cols-1 gap-3 border p-4 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field name="codeSystem">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Sistema de codificación</Label>
                <select
                  className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  value={field.state.value}
                >
                  <option value="CIE10">CIE10</option>
                </select>
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={error?.message}>
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="code">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Diagnóstico CIE10</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar en CIE10"
                  id={field.name}
                  loading={diagnosesLoading}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(v) => {
                    const selected = diagnosesData?.entries.find(
                      (entry) => entry.code === v
                    );
                    field.handleChange(v);
                    if (selected) {
                      form.setFieldValue("description", selected.name);
                    }
                  }}
                  onSearchChange={setDiagnosisSearch}
                  options={
                    diagnosesData?.entries.map((e) => ({
                      value: e.code,
                      label: e.name,
                      description: e.code,
                    })) ?? []
                  }
                  placeholder="Buscar diagnóstico..."
                  search={diagnosisSearch}
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={error?.message}>
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="diagnosisType">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Tipo de diagnóstico</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar tipo"
                  id={field.name}
                  loading={diagnosisTypesLoading}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setDiagnosisTypeSearch}
                  options={
                    diagnosisTypesData?.entries.map((e) => ({
                      value: e.code,
                      label: e.name,
                      description: e.code,
                    })) ?? []
                  }
                  placeholder="Buscar tipo..."
                  search={diagnosisTypeSearch}
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={error?.message}>
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor={field.name}>Descripción</Label>
                <Input
                  className="text-xs"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={error?.message}>
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="rank">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Rango (rank)</Label>
                <Input
                  className="text-xs"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  type="number"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="certainty">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Certeza</Label>
                <Input
                  className="text-xs"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Ej: confirmed"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <div className="flex items-end md:col-span-3">
            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button
                  disabled={!canSubmit || isSubmitting}
                  size="sm"
                  type="submit"
                >
                  {isSubmitting ? "Guardando..." : "Guardar diagnóstico"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        data={data ?? []}
        emptyDescription="No hay diagnósticos registrados para esta atención."
        emptyTitle="Sin diagnósticos"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
