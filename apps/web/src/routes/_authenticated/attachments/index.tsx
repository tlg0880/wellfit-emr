import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
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
import { Eye, Paperclip, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

function getEntityOptions(
  linkedEntityType: string,
  patientsData:
    | {
        patients: Array<{
          id: string;
          firstName: string;
          lastName1: string;
          primaryDocumentType: string;
          primaryDocumentNumber: string;
        }>;
      }
    | undefined,
  encountersData:
    | {
        encounters: Array<{
          id: string;
          reasonForVisit: string | null;
          startedAt: Date | string;
        }>;
      }
    | undefined,
  practitionersData:
    | {
        practitioners: Array<{
          id: string;
          fullName: string;
          documentNumber: string;
        }>;
      }
    | undefined,
  organizationsData:
    | {
        organizations: Array<{
          id: string;
          name: string;
          taxId: string | null;
        }>;
      }
    | undefined,
  clinicalDocumentsData:
    | {
        documents: Array<{
          id: string;
          documentType: string;
          status: string;
          createdAt: Date | string;
        }>;
      }
    | undefined
) {
  if (linkedEntityType === "patient") {
    return (
      patientsData?.patients.map((p) => ({
        value: p.id,
        label: `${p.firstName} ${p.lastName1}`,
        description: `${p.primaryDocumentType} ${p.primaryDocumentNumber}`,
      })) ?? []
    );
  }
  if (linkedEntityType === "encounter") {
    return (
      encountersData?.encounters.map((e) => ({
        value: e.id,
        label: e.reasonForVisit || "Sin motivo",
        description: new Date(e.startedAt).toLocaleDateString("es-CO"),
      })) ?? []
    );
  }
  if (linkedEntityType === "practitioner") {
    return (
      practitionersData?.practitioners.map((p) => ({
        value: p.id,
        label: p.fullName,
        description: p.documentNumber,
      })) ?? []
    );
  }
  if (linkedEntityType === "organization") {
    return (
      organizationsData?.organizations.map((o) => ({
        value: o.id,
        label: o.name,
        description: o.taxId ?? "Sin NIT",
      })) ?? []
    );
  }
  if (linkedEntityType === "clinicalDocument") {
    return (
      clinicalDocumentsData?.documents.map((d) => ({
        value: d.id,
        label: d.documentType,
        description: `${d.status} · ${new Date(d.createdAt).toLocaleDateString(
          "es-CO"
        )}`,
      })) ?? []
    );
  }
  return [];
}

function getEntityLoading(
  linkedEntityType: string,
  patientsLoading: boolean,
  encountersLoading: boolean,
  practitionersLoading: boolean,
  organizationsLoading: boolean,
  clinicalDocumentsLoading: boolean
) {
  if (linkedEntityType === "patient") {
    return patientsLoading;
  }
  if (linkedEntityType === "encounter") {
    return encountersLoading;
  }
  if (linkedEntityType === "practitioner") {
    return practitionersLoading;
  }
  if (linkedEntityType === "organization") {
    return organizationsLoading;
  }
  if (linkedEntityType === "clinicalDocument") {
    return clinicalDocumentsLoading;
  }
  return false;
}

const searchSchema = z.object({
  linkedEntityType: z.string().optional(),
  linkedEntityId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/attachments/")({
  component: AttachmentsListPage,
  validateSearch: searchSchema,
});

function CreateAttachmentLinkForm({ onCancel }: { onCancel: () => void }) {
  const [form, setForm] = useState({
    binaryId: "",
    linkedEntityType: "encounter",
    linkedEntityId: "",
    title: "",
    classification: "support",
    capturedAt: new Date().toISOString().slice(0, 16),
  });

  const [entitySearch, setEntitySearch] = useState("");

  const { data: patientsData, isLoading: patientsLoading } = useQuery(
    orpc.patients.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: entitySearch || undefined,
      },
      enabled: form.linkedEntityType === "patient",
    })
  );

  const { data: encountersData, isLoading: encountersLoading } = useQuery(
    orpc.encounters.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: entitySearch || undefined,
      },
      enabled: form.linkedEntityType === "encounter",
    })
  );

  const { data: practitionersData, isLoading: practitionersLoading } = useQuery(
    orpc.facilities.listPractitioners.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: entitySearch || undefined,
      },
      enabled: form.linkedEntityType === "practitioner",
    })
  );

  const { data: organizationsData, isLoading: organizationsLoading } = useQuery(
    orpc.facilities.listOrganizations.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: entitySearch || undefined,
      },
      enabled: form.linkedEntityType === "organization",
    })
  );

  const { data: clinicalDocumentsData, isLoading: clinicalDocumentsLoading } =
    useQuery(
      orpc.clinicalDocuments.list.queryOptions({
        input: {
          limit: 20,
          offset: 0,
        },
        enabled: form.linkedEntityType === "clinicalDocument",
      })
    );

  const entityOptions = getEntityOptions(
    form.linkedEntityType,
    patientsData,
    encountersData,
    practitionersData,
    organizationsData,
    clinicalDocumentsData
  );

  const entityLoading = getEntityLoading(
    form.linkedEntityType,
    patientsLoading,
    encountersLoading,
    practitionersLoading,
    organizationsLoading,
    clinicalDocumentsLoading
  );

  const create = useMutation({
    ...orpc.attachments.createLink.mutationOptions(),
    onSuccess: () => {
      toast.success("Enlace de anexo creado");
      queryClient.invalidateQueries({
        queryKey: orpc.attachments.listLinks.key({ type: "query" }),
      });
      onCancel();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear enlace");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.binaryId.trim()) {
      toast.error("Binary Object ID es obligatorio");
      return;
    }
    if (!form.linkedEntityId.trim()) {
      toast.error("Entidad vinculada es obligatoria");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Título es obligatorio");
      return;
    }
    create.mutate({
      binaryId: form.binaryId,
      linkedEntityType: form.linkedEntityType,
      linkedEntityId: form.linkedEntityId,
      title: form.title,
      classification: form.classification,
      capturedAt: new Date(form.capturedAt),
    });
  }

  return (
    <Card className="mx-6">
      <CardHeader>
        <CardTitle>Nuevo enlace de anexo</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
          onSubmit={handleSubmit}
        >
          <div className="space-y-1">
            <Label>Binary Object ID *</Label>
            <Input
              onChange={(e) => setForm({ ...form, binaryId: e.target.value })}
              required
              value={form.binaryId}
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo de entidad vinculada *</Label>
            <Select
              onValueChange={(v) =>
                setForm({
                  ...form,
                  linkedEntityType: v as string,
                  linkedEntityId: "",
                })
              }
              value={form.linkedEntityType}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="encounter">Atención</SelectItem>
                <SelectItem value="patient">Paciente</SelectItem>
                <SelectItem value="practitioner">Profesional</SelectItem>
                <SelectItem value="organization">Organización</SelectItem>
                <SelectItem value="clinicalDocument">
                  Documento clínico
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Entidad vinculada *</Label>
            <SearchSelect
              emptyMessage="Escribe para buscar"
              loading={entityLoading}
              onChange={(v) => setForm((f) => ({ ...f, linkedEntityId: v }))}
              onSearchChange={setEntitySearch}
              options={entityOptions}
              placeholder="Buscar entidad..."
              required
              search={entitySearch}
              value={form.linkedEntityId}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Título *</Label>
            <Input
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              value={form.title}
            />
          </div>
          <div className="space-y-1">
            <Label>Clasificación *</Label>
            <Input
              onChange={(e) =>
                setForm({ ...form, classification: e.target.value })
              }
              required
              value={form.classification}
            />
          </div>
          <div className="space-y-1">
            <Label>Fecha captura *</Label>
            <Input
              onChange={(e) => setForm({ ...form, capturedAt: e.target.value })}
              required
              type="datetime-local"
              value={form.capturedAt}
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
              {create.isPending ? "Guardando..." : "Guardar enlace"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AttachmentsListPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/attachments/" });

  const [linkedEntityId, setLinkedEntityId] = useState(
    search.linkedEntityId || ""
  );
  const [linkedEntityType, setLinkedEntityType] = useState(
    search.linkedEntityType || "encounter"
  );
  const [entitySearch, setEntitySearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [showForm, setShowForm] = useState(false);
  const [queryEntitySearch, setQueryEntitySearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryEntitySearch(entitySearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [entitySearch]);

  useEffect(() => {
    document.title = "Anexos | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  const { data: patientsData, isLoading: patientsLoading } = useQuery(
    orpc.patients.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: queryEntitySearch || undefined,
      },
      enabled: linkedEntityType === "patient",
    })
  );

  const { data: encountersData, isLoading: encountersLoading } = useQuery(
    orpc.encounters.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: queryEntitySearch || undefined,
      },
      enabled: linkedEntityType === "encounter",
    })
  );

  const { data: practitionersData, isLoading: practitionersLoading } = useQuery(
    orpc.facilities.listPractitioners.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: queryEntitySearch || undefined,
      },
      enabled: linkedEntityType === "practitioner",
    })
  );

  const { data: organizationsData, isLoading: organizationsLoading } = useQuery(
    orpc.facilities.listOrganizations.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: queryEntitySearch || undefined,
      },
      enabled: linkedEntityType === "organization",
    })
  );

  const { data: clinicalDocumentsData, isLoading: clinicalDocumentsLoading } =
    useQuery(
      orpc.clinicalDocuments.list.queryOptions({
        input: {
          limit: 20,
          offset: 0,
        },
        enabled: linkedEntityType === "clinicalDocument",
      })
    );

  const entityOptions = getEntityOptions(
    linkedEntityType,
    patientsData,
    encountersData,
    practitionersData,
    organizationsData,
    clinicalDocumentsData
  );

  const entityLoading = getEntityLoading(
    linkedEntityType,
    patientsLoading,
    encountersLoading,
    practitionersLoading,
    organizationsLoading,
    clinicalDocumentsLoading
  );

  const { data, isLoading } = useQuery(
    orpc.attachments.listLinks.queryOptions({
      input: {
        limit,
        offset,
        linkedEntityId: linkedEntityId || "none",
        linkedEntityType,
      },
      enabled: !!linkedEntityId,
    })
  );

  const deleteMutation = useMutation({
    ...orpc.attachments.deleteLink.mutationOptions(),
    onSuccess: () => {
      toast.success("Anexo eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.attachments.listLinks.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar anexo");
    },
  });

  const columns = [
    {
      header: "Título",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <Paperclip size={14} />
          {row.title}
        </span>
      ),
    },
    {
      header: "Clasificación",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.classification,
    },
    {
      header: "Entidad",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        `${row.linkedEntityType} / ${row.linkedEntityId.slice(0, 8)}…`,
    },
    {
      header: "Fecha captura",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.capturedAt).toLocaleString("es-CO"),
    },
    {
      header: "Acciones",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <div className="flex items-center gap-1">
          <Link
            aria-label="Ver anexo"
            className="inline-flex text-muted-foreground hover:text-foreground"
            params={{ attachmentId: row.id }}
            to="/attachments/$attachmentId"
          >
            <Eye size={14} />
          </Link>
          <Button
            aria-label="Eliminar anexo"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar este anexo permanentemente?")) {
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
            {showForm ? "Cancelar" : "Nuevo enlace"}
          </Button>
        }
        description="Anexos y documentos vinculados"
        icon={Paperclip}
        iconBgClass="bg-slate-100 text-slate-600"
        title="Anexos"
      />

      {showForm && (
        <CreateAttachmentLinkForm onCancel={() => setShowForm(false)} />
      )}

      <div className="px-6">
        <div className="mb-3 flex items-center gap-2">
          <Search className="text-muted-foreground" size={14} />
          <Select
            onValueChange={(v) => {
              setLinkedEntityType(v as string);
              setLinkedEntityId("");
              setOffset(0);
            }}
            value={linkedEntityType}
          >
            <SelectTrigger className="h-7 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="encounter">Atención</SelectItem>
              <SelectItem value="patient">Paciente</SelectItem>
              <SelectItem value="practitioner">Profesional</SelectItem>
              <SelectItem value="organization">Organización</SelectItem>
              <SelectItem value="clinicalDocument">
                Documento clínico
              </SelectItem>
            </SelectContent>
          </Select>
          <SearchSelect
            className="max-w-xs"
            clearable
            emptyMessage="Escribe para buscar"
            loading={entityLoading}
            onChange={(v) => {
              setLinkedEntityId(v);
              setOffset(0);
            }}
            onSearchChange={setEntitySearch}
            options={entityOptions}
            placeholder="Buscar entidad..."
            search={entitySearch}
            value={linkedEntityId}
          />
        </div>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          emptyDescription="No se encontraron anexos vinculados."
          emptyTitle="Sin anexos"
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => {
            navigate({
              to: "/attachments/$attachmentId",
              params: { attachmentId: row.id },
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
