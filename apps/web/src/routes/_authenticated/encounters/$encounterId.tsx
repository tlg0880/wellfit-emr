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
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@wellfit-emr/ui/components/tabs";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Eye,
  FileCheck,
  FileText,
  FlaskConical,
  Mail,
  Paperclip,
  Pill,
  RefreshCw,
  Scissors,
  Stethoscope,
  Syringe,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { formatAge } from "@/utils/age";
import { orpc, queryClient } from "@/utils/orpc";

import { AllergiesTab } from "./-components/allergies-tab";
import { AttachmentsTab } from "./-components/attachments-tab";
import { ClinicalDocumentsTab } from "./-components/clinical-documents-tab";
import { ConsentsTab } from "./-components/consents-tab";
import { DiagnosesTab } from "./-components/diagnoses-tab";
import { DiagnosticReportsTab } from "./-components/diagnostic-reports-tab";
import { EncounterParticipantsTab } from "./-components/encounter-participants-tab";
import { EvolutionTab } from "./-components/evolution-tab";
import { IncapacityCertificatesTab } from "./-components/incapacity-certificates-tab";
import { InterconsultationsTab } from "./-components/interconsultations-tab";
import { MedicationAdministrationsTab } from "./-components/medication-administrations-tab";
import { MedicationOrdersTab } from "./-components/medication-orders-tab";
import { ObservationsTab } from "./-components/observations-tab";
import { ProceduresTab } from "./-components/procedures-tab";
import { ServiceRequestsTab } from "./-components/service-requests-tab";

const TABS = [
  { id: "diagnoses", label: "Diagnósticos", icon: Activity },
  { id: "allergies", label: "Alergias", icon: AlertTriangle },
  { id: "observations", label: "Observaciones", icon: Eye },
  { id: "procedures", label: "Procedimientos", icon: Scissors },
  { id: "evolution", label: "Evolución", icon: FileText },
  { id: "participants", label: "Participantes", icon: Users },
  { id: "medicationOrders", label: "Medicamentos", icon: Pill },
  { id: "medicationAdministrations", label: "Administraciones", icon: Syringe },
  { id: "serviceRequests", label: "Órdenes", icon: FlaskConical },
  { id: "diagnosticReports", label: "Informes", icon: ClipboardList },
  { id: "clinicalDocuments", label: "Documentos", icon: FileText },
  { id: "attachments", label: "Anexos", icon: Paperclip },
  { id: "consents", label: "Consentimientos", icon: FileCheck },
  { id: "interconsultations", label: "Interconsultas", icon: Mail },
  { id: "incapacityCertificates", label: "Incapacidades", icon: FileText },
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
  if (isLoading) {
    return <Skeleton className="h-4 w-24" />;
  }
  if (!data) {
    return <span className="text-muted-foreground">{siteId}</span>;
  }
  return <span>{data.name}</span>;
}

function ServiceUnitName({ unitId }: { unitId: string }) {
  const { data, isLoading } = useQuery({
    ...orpc.facilities.getServiceUnit.queryOptions({ input: { id: unitId } }),
    enabled: !!unitId,
  });
  if (isLoading) {
    return <Skeleton className="h-4 w-24" />;
  }
  if (!data) {
    return <span className="text-muted-foreground">{unitId}</span>;
  }
  return <span>{data.name}</span>;
}

function EncounterDetailPage() {
  const { encounterId } = useParams({
    from: "/_authenticated/encounters/$encounterId",
  });
  const navigate = useNavigate({ from: "/encounters/$encounterId" });
  const search = Route.useSearch();
  const activeTab =
    search.tab && TABS.some((t) => t.id === search.tab)
      ? search.tab
      : DEFAULT_TAB;

  const {
    data: encounter,
    isLoading: encounterLoading,
    isError: encounterError,
  } = useQuery(
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

  const deleteMutation = useMutation({
    ...orpc.encounters.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Atención eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.encounters.list.key({ type: "query" }),
      });
      navigate({ to: "/encounters" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar atención");
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
    navigate({ search: (prev) => ({ ...prev, tab: tabId }) });
  }

  const statusLabel =
    encounter?.status === "in-progress"
      ? "En progreso"
      : encounter?.status === "finished"
        ? "Finalizada"
        : (encounter?.status ?? "—");

  useEffect(() => {
    if (encounter) {
      document.title = `${encounter.reasonForVisit} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [encounter]);

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          encounter ? (
            <div className="flex items-center gap-2">
              {encounter.status === "in-progress" && (
                <Button
                  disabled={closeMutation.isPending}
                  onClick={handleClose}
                  size="sm"
                  variant="destructive"
                >
                  <XCircle size={14} />
                  {closeMutation.isPending ? "Cerrando..." : "Cerrar atención"}
                </Button>
              )}
              <Button
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirm("¿Eliminar esta atención permanentemente?")) {
                    deleteMutation.mutate({ id: encounterId });
                  }
                }}
                size="sm"
                variant="outline"
              >
                <Trash2 size={14} />
                <span className="ml-1.5">
                  {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
                </span>
              </Button>
            </div>
          ) : null
        }
        backTo="/encounters"
        description={encounterLoading ? "..." : `Estado: ${statusLabel}`}
        icon={Stethoscope}
        iconBgClass="bg-teal-100 text-teal-600"
        title={
          encounterLoading
            ? "Cargando..."
            : (encounter?.reasonForVisit ?? "Atención")
        }
      />

      {encounterError && (
        <div className="px-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 py-12">
              <p className="text-destructive text-sm">
                Error al cargar atención
              </p>
              <Button
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: orpc.encounters.get.key({ type: "query" }),
                  })
                }
                size="sm"
                variant="outline"
              >
                <RefreshCw size={12} />
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

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
                  value: <ServiceUnitName unitId={encounter.serviceUnitId} />,
                },
                {
                  label: "Paciente",
                  value: patient ? (
                    <Link
                      className="text-primary hover:underline"
                      params={{ patientId: patient.id }}
                      to="/patients/$patientId"
                    >
                      {patient.firstName} {patient.lastName1}
                    </Link>
                  ) : (
                    <Skeleton className="h-4 w-24" />
                  ),
                },
                ...(encounter.admissionSource
                  ? [
                      {
                        label: "Vía de ingreso",
                        value: encounter.admissionSource,
                      },
                    ]
                  : []),
                ...(encounter.causeExternalCode
                  ? [
                      {
                        label: "Causa externa",
                        value: encounter.causeExternalCode,
                      },
                    ]
                  : []),
                ...(encounter.finalidadConsultaCode
                  ? [
                      {
                        label: "Finalidad consulta",
                        value: encounter.finalidadConsultaCode,
                      },
                    ]
                  : []),
                ...(encounter.modalidadAtencionCode
                  ? [
                      {
                        label: "Modalidad atención (RIPS)",
                        value: encounter.modalidadAtencionCode,
                      },
                    ]
                  : []),
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
                  <p className="text-[10px] text-muted-foreground">Edad</p>
                  <p className="font-medium">{formatAge(patient.birthDate)}</p>
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
        <Tabs
          onValueChange={(value) => setTab(value as string)}
          value={activeTab}
        >
          <TabsList className="mb-3 w-full justify-start">
            {TABS.map((tab) => (
              <TabsTab key={tab.id} value={tab.id}>
                <tab.icon size={14} />
                {tab.label}
              </TabsTab>
            ))}
          </TabsList>

          <TabsPanel value="diagnoses">
            <DiagnosesTab encounterId={encounterId} />
          </TabsPanel>
          <TabsPanel value="allergies">
            <AllergiesTab patientId={encounter?.patientId ?? ""} />
          </TabsPanel>
          <TabsPanel value="observations">
            <ObservationsTab
              encounterId={encounterId}
              patientId={encounter?.patientId ?? ""}
            />
          </TabsPanel>
          <TabsPanel value="procedures">
            <ProceduresTab
              encounterId={encounterId}
              patientId={encounter?.patientId ?? ""}
            />
          </TabsPanel>
          <TabsPanel value="evolution">
            <EvolutionTab
              encounterId={encounterId}
              patientId={encounter?.patientId ?? ""}
            />
          </TabsPanel>
          <TabsPanel value="participants">
            <EncounterParticipantsTab encounterId={encounterId} />
          </TabsPanel>
          <TabsPanel value="medicationOrders">
            <MedicationOrdersTab
              encounterId={encounterId}
              patientId={encounter?.patientId ?? ""}
            />
          </TabsPanel>
          <TabsPanel value="medicationAdministrations">
            <MedicationAdministrationsTab
              encounterId={encounterId}
              patientId={encounter?.patientId ?? ""}
            />
          </TabsPanel>
          <TabsPanel value="serviceRequests">
            <ServiceRequestsTab
              encounterId={encounterId}
              patientId={encounter?.patientId ?? ""}
            />
          </TabsPanel>
          <TabsPanel value="diagnosticReports">
            <DiagnosticReportsTab
              encounterId={encounterId}
              patientId={encounter?.patientId ?? ""}
            />
          </TabsPanel>
          <TabsPanel value="clinicalDocuments">
            <ClinicalDocumentsTab
              encounterId={encounterId}
              patientId={encounter?.patientId ?? ""}
            />
          </TabsPanel>
          <TabsPanel value="attachments">
            <AttachmentsTab encounterId={encounterId} />
          </TabsPanel>
          <TabsPanel value="consents">
            <ConsentsTab
              encounterId={encounterId}
              patientId={encounter?.patientId ?? ""}
            />
          </TabsPanel>
          <TabsPanel value="interconsultations">
            <InterconsultationsTab encounterId={encounterId} />
          </TabsPanel>
          <TabsPanel value="incapacityCertificates">
            <IncapacityCertificatesTab
              encounterId={encounterId}
              patientId={encounter?.patientId ?? ""}
            />
          </TabsPanel>
        </Tabs>
      </div>
    </div>
  );
}
