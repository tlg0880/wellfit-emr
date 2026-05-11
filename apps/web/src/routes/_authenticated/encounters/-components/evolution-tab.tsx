import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@wellfit-emr/ui/components/button";
import { Label } from "@wellfit-emr/ui/components/label";
import { SearchSelect } from "@wellfit-emr/ui/components/search-select";
import { FileText, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DataTable } from "@/components/data-table";
import { orpc } from "@/utils/orpc";

const evolutionSchema = z.object({
  authorPractitionerId: z.string().min(1, "Profesional es obligatorio"),
  subjective: z.string().min(1, "Subjetivo es obligatorio"),
  objective: z.string().min(1, "Objetivo es obligatorio"),
  assessment: z.string().min(1, "Análisis es obligatorio"),
  plan: z.string().min(1, "Plan es obligatorio"),
});

export function EvolutionTab({
  encounterId,
  patientId,
}: {
  encounterId: string;
  patientId: string;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [practitionerSearch, setPractitionerSearch] = useState("");

  const { data, isLoading } = useQuery({
    ...orpc.clinicalDocuments.list.queryOptions({
      input: {
        encounterId,
        limit: 25,
        offset: 0,
      },
    }),
    enabled: !!encounterId,
  });

  const { data: practitionersData, isLoading: practitionersLoading } = useQuery(
    orpc.facilities.listPractitioners.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: practitionerSearch || undefined,
      },
    })
  );

  const create = useMutation({
    ...orpc.clinicalDocuments.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Evolución registrada");
      setShowForm(false);
      form.reset();
      queryClient.invalidateQueries({
        queryKey: orpc.clinicalDocuments.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const form = useForm({
    defaultValues: {
      authorPractitionerId: "",
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
    },
    onSubmit: async ({ value }) => {
      const textRendered = [
        "SUBJETIVO",
        value.subjective,
        "",
        "OBJETIVO",
        value.objective,
        "",
        "ANÁLISIS",
        value.assessment,
        "",
        "PLAN",
        value.plan,
      ].join("\n");

      await create.mutateAsync({
        patientId,
        encounterId,
        documentType: "evolucion_medica",
        authorPractitionerId: value.authorPractitionerId,
        payloadJson: {
          subjective: value.subjective,
          objective: value.objective,
          assessment: value.assessment,
          plan: value.plan,
        },
        textRendered,
        sections: [
          {
            sectionCode: "subjective",
            sectionOrder: 1,
            sectionPayloadJson: { text: value.subjective },
          },
          {
            sectionCode: "objective",
            sectionOrder: 2,
            sectionPayloadJson: { text: value.objective },
          },
          {
            sectionCode: "assessment",
            sectionOrder: 3,
            sectionPayloadJson: { text: value.assessment },
          },
          {
            sectionCode: "plan",
            sectionOrder: 4,
            sectionPayloadJson: { text: value.plan },
          },
        ],
      });
    },
    validators: {
      onSubmit: evolutionSchema,
    },
  });

  const evolutions =
    data?.documents.filter((d) => d.documentType === "evolucion_medica") ?? [];

  const columns = [
    {
      header: "Tipo",
      accessor: (_row: (typeof evolutions)[0]) => (
        <span className="inline-flex items-center gap-1.5 text-xs">
          <FileText className="text-muted-foreground" size={14} />
          Evolución médica
        </span>
      ),
    },
    {
      header: "Estado",
      accessor: (row: (typeof evolutions)[0]) => (
        <span
          className={`inline-flex border px-1.5 py-0.5 text-[10px] ${
            row.status === "draft"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : row.status === "signed"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-gray-200 bg-gray-50 text-gray-700"
          }`}
        >
          {row.status === "draft"
            ? "Borrador"
            : row.status === "signed"
              ? "Firmado"
              : row.status}
        </span>
      ),
    },
    {
      header: "Fecha",
      accessor: (row: (typeof evolutions)[0]) =>
        new Date(row.createdAt).toLocaleString("es-CO", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
  ];

  const textareaClass =
    "min-h-[80px] w-full resize-y rounded-none border border-input bg-transparent px-3 py-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Nueva evolución"}
        </Button>
      </div>

      {showForm && (
        <form
          className="space-y-3 border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field name="authorPractitionerId">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Profesional autor</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar profesionales"
                  id={field.name}
                  loading={practitionersLoading}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setPractitionerSearch}
                  options={
                    practitionersData?.practitioners.map((p) => ({
                      value: p.id,
                      label: p.fullName,
                      description: p.documentNumber,
                    })) ?? []
                  }
                  placeholder="Buscar profesional..."
                  search={practitionerSearch}
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

          <form.Field name="subjective">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Subjetivo</Label>
                <textarea
                  className={textareaClass}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Motivo de consulta, síntomas, historia del paciente..."
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

          <form.Field name="objective">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Objetivo</Label>
                <textarea
                  className={textareaClass}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Examen físico, signos vitales, hallazgos..."
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

          <form.Field name="assessment">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Análisis</Label>
                <textarea
                  className={textareaClass}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Impresión diagnóstica, interpretación de hallazgos..."
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

          <form.Field name="plan">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Plan</Label>
                <textarea
                  className={textareaClass}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Tratamiento, estudios, interconsultas, indicaciones..."
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

          <div className="flex justify-end">
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
                  {isSubmitting ? "Guardando..." : "Guardar evolución"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        data={evolutions}
        emptyDescription="No hay evoluciones registradas para esta atención."
        emptyTitle="Sin evoluciones"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
