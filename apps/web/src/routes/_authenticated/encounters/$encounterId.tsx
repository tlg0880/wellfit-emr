import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import {
  Activity,
  AlertTriangle,
  Eye,
  FileText,
  Scissors,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { orpc } from "@/utils/orpc";

import { AllergiesTab } from "./-components/allergies-tab";
import { DiagnosesTab } from "./-components/diagnoses-tab";
import { EvolutionTab } from "./-components/evolution-tab";
import { ObservationsTab } from "./-components/observations-tab";
import { ProceduresTab } from "./-components/procedures-tab";

const TABS = [
  { id: "diagnoses", label: "Diagnósticos", icon: Activity },
  { id: "allergies", label: "Alergias", icon: AlertTriangle },
  { id: "observations", label: "Observaciones", icon: Eye },
  { id: "procedures", label: "Procedimientos", icon: Scissors },
  { id: "evolution", label: "Evolución", icon: FileText },
];

const DEFAULT_TAB = "diagnoses";

export const Route = createFileRoute("/_authenticated/encounters/$encounterId")(
  {
    component: EncounterDetailPage,
    validateSearch: (search: Record<string, unknown>) => ({
      tab: typeof search.tab === "string" ? search.tab : undefined,
    }),
  }
);

function SiteName({ siteId }: { siteId: string }) {
  const { data, isLoading } = useQuery({
    ...orpc.facilities.getSite.queryOptions({ input: { id: siteId } }),
    enabled: !!siteId,
  });
  if (isLoading) return <Skeleton className="h-4 w-24" />;
  if (!data) return <span className="text-muted-foreground">{siteId}</span>;
  return <span>{data.name}</span>;
}

function ServiceUnitName({ unitId }: { unitId: string }) {
  const { data, isLoading } = useQuery({
    ...orpc.facilities.getServiceUnit.queryOptions({ input: { id: unitId } }),
    enabled: !!unitId,
  });
  if (isLoading) return <Skeleton className="h-4 w-24" />;
  if (!data) return <span className="text-muted-foreground">{unitId}</span>;
  return <span>{data.name}</span>;
}

function PractitionerName({ practitionerId }: { practitionerId: string }) {
  const { data, isLoading } = useQuery({
    ...orpc.facilities.getPractitioner.queryOptions({
      input: { id: practitionerId },
    }),
    enabled: !!practitionerId,
  });
  if (isLoading) return <Skeleton className="h-4 w-24" />;
  if (!data) return <span className="text-muted-foreground">{practitionerId}</span>;
  return <span>{data.fullName}</span>;
}

function EncounterDetailPage() {
  const { encounterId } = useParams({
    from: "/_authenticated/encounters/$encounterId",
  });
  const navigate = useNavigate({ from: Route.id });
  const search = Route.useSearch();
  const activeTab = search.tab && TABS.some((t) => t.id === search.tab)
    ? search.tab
    : DEFAULT_TAB;

  const { data: encounter, isLoading: encounterLoading } = useQuery(
    orpc.encounters.get.queryOptions({ input: { id: encounterId } })
  );

  const { data: patient } = useQuery({
    ...orpc.patients.get.queryOptions({
      input: { id: encounter?.patientId ?? "" },
    }),
    enabled: !!encounter?.patientId,
  });

  const closeMutation = useMutation({
    ...orpc.encounters.close.mutationOptions(),
    onSuccess: () => {
      toast.success("Atención cerrada correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al cerrar: ${error.message}`);
    },
  });

  function handleClose() {
    closeMutation.mutate({
      id: encounterId,
      endedAt: new Date(),
      status: "finished",
    });
  }

  function setTab(tabId: string) {
    navigate({ search: { tab: tabId } });
  }

  const statusLabel =
    encounter?.status === "in-progress"
      ? "En progreso"
      : encounter?.status === "finished"
        ? "Finalizada"
        : encounter?.status ?? "—";

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          encounter?.status === "in-progress" ? (
            <Button
              disabled={closeMutation.isPending}
              onClick={handleClose}
              size="sm"
              variant="destructive"
            >
              <XCircle size={14} />
              {closeMutation.isPending ? "Cerrando..." : "Cerrar atención"}
            </Button>
          ) : null
        }
        backTo="/encounters"
        description={
          encounterLoading
            ? "..."
            : `Estado: ${statusLabel}`
        }
        title={
          encounterLoading
            ? "Cargando..."
            : (encounter?.reasonForVisit ?? "Atención")
        }
      />

      <div className="grid grid-cols-1 gap-4 px-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Información general</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-xs">
            {encounterLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton className="h-4 w-full" key={i} />
              ))
            ) : encounter ? (
              [
                {
                  label: "Clase de atención",
                  value: encounter.encounterClass,
                },
                {
                  label: "Modalidad",
                  value: encounter.careModality,
                },
                {
                  label: "Fecha inicio",
                  value: new Date(encounter.startedAt).toLocaleString("es-CO"),
                },
                {
                  label: "Estado",
                  value: statusLabel,
                },
                {
                  label: "Sede",
                  value: <SiteName siteId={encounter.siteId} />,
                },
                {
                  label: "Unidad de servicio",
                  value: (
                    <ServiceUnitName unitId={encounter.serviceUnitId} />
                  ),
                },
                {
                  label: "Participantes",
                  value: (
                    <EncounterParticipants encounterId={encounter.id} />
                  ),
                },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="font-medium">{item.value}</p>
                </div>
              ))
            ) : (
              <p className="col-span-2 text-muted-foreground">
                No se encontró la atención
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {patient ? (
              <>
                <div>
                  <p className="text-[10px] text-muted-foreground">Nombre</p>
                  <p className="font-medium">
                    {patient.firstName} {patient.lastName1}{" "}
                    {patient.lastName2 ?? ""}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Documento</p>
                  <p className="font-medium">
                    {patient.primaryDocumentType}{" "}
                    {patient.primaryDocumentNumber}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Fecha nacimiento
                  </p>
                  <p className="font-medium">
                    {new Date(patient.birthDate).toLocaleDateString("es-CO")}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Sexo</p>
                  <p className="font-medium">{patient.sexAtBirth}</p>
                </div>
                <Link
                  className="inline-block pt-2 text-[10px] text-primary hover:underline"
                  params={{ patientId: patient.id }}
                  to="/patients/$patientId"
                >
                  Ver historia clínica completa →
                </Link>
              </>
            ) : (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="px-6">
        <div className="mb-3 flex items-center gap-1 border-b">
          {TABS.map((tab) => (
            <button
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 font-medium text-xs transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              key={tab.id}
              onClick={() => setTab(tab.id)}
              type="button"
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "diagnoses" && (
          <DiagnosesTab encounterId={encounterId} />
        )}
        {activeTab === "allergies" && (
          <AllergiesTab patientId={encounter?.patientId ?? ""} />
        )}
        {activeTab === "observations" && (
          <ObservationsTab
            encounterId={encounterId}
            patientId={encounter?.patientId ?? ""}
          />
        )}
        {activeTab === "procedures" && (
          <ProceduresTab
            encounterId={encounterId}
            patientId={encounter?.patientId ?? ""}
          />
        )}
        {activeTab === "evolution" && (
          <EvolutionTab
            encounterId={encounterId}
            patientId={encounter?.patientId ?? ""}
          />
        )}
      </div>
    </div>
  );
}
