import { useChat } from "@ai-sdk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { env } from "@wellfit-emr/env/web";
import { Button } from "@wellfit-emr/ui/components/button";
import { Input } from "@wellfit-emr/ui/components/input";
import { DefaultChatTransport, isToolUIPart } from "ai";
import {
  Activity,
  Bot,
  FileText,
  Loader2,
  MessageSquarePlus,
  Pill,
  Send,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { orpc } from "@/utils/orpc";
import { MessageParts } from "./-components/message-parts";
import { PatientSidebar } from "./-components/patient-sidebar";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatPage,
});

function ChatPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  );
  const [patientSearch, setPatientSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const selectedPatientIdRef = useRef<string | null>(selectedPatientId);
  selectedPatientIdRef.current = selectedPatientId;

  useEffect(() => {
    document.title = "Asistente clínico | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  const { data: patientsData, isLoading: patientsLoading } = useQuery(
    orpc.patients.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: patientSearch || undefined,
        sortBy: "firstName",
        sortDirection: "asc",
      },
    })
  );

  const { data: selectedPatient } = useQuery({
    ...orpc.patients.get.queryOptions({
      input: { id: selectedPatientId ?? "" },
    }),
    enabled: !!selectedPatientId,
  });

  const { data: patientEncounters } = useQuery({
    ...orpc.encounters.list.queryOptions({
      input: { limit: 5, offset: 0, patientId: selectedPatientId ?? "" },
    }),
    enabled: !!selectedPatientId,
  });

  const { data: patientAllergies } = useQuery({
    ...orpc.clinicalRecords.listAllergies.queryOptions({
      input: { patientId: selectedPatientId ?? "" },
    }),
    enabled: !!selectedPatientId,
  });

  const { data: patientMedications } = useQuery({
    ...orpc.medicationOrders.list.queryOptions({
      input: { limit: 10, offset: 0, patientId: selectedPatientId ?? "" },
    }),
    enabled: !!selectedPatientId,
  });

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${env.VITE_SERVER_URL}/api/chat`,
        credentials: "include",
        prepareSendMessagesRequest: ({
          api,
          body,
          credentials,
          headers,
          id,
          messageId,
          messages: requestMessages,
          trigger,
        }) => ({
          api,
          credentials,
          headers,
          body: {
            ...body,
            id,
            messageId,
            messages: requestMessages,
            selectedPatientId: selectedPatientIdRef.current,
            trigger,
          },
        }),
      }),
    []
  );

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    error,
    stop,
    clearError,
  } = useChat({
    transport,
    onError: (chatError) => {
      console.error("[ai-chat] client stream error", chatError);
    },
  });
  const isLoading = status === "submitted" || status === "streaming";
  const showLoadingIndicator = shouldShowLoadingIndicator(messages, status);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const lastMessageCountRef = useRef(messages.length);
  const isNearBottomRef = useRef(true);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }
    const handleScroll = () => {
      isNearBottomRef.current =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (
      messages.length > lastMessageCountRef.current &&
      isNearBottomRef.current
    ) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    const hasToolResult = messages.some((m) =>
      m.parts?.some((p) => isToolUIPart(p) && p.state === "output-available")
    );
    if (hasToolResult && selectedPatientId) {
      queryClient.invalidateQueries({
        queryKey: orpc.medicationOrders.list.key({ type: "query" }),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.patients.list.key({ type: "query" }),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.encounters.list.key({ type: "query" }),
      });
    }
  }, [messages, queryClient, selectedPatientId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) {
      return;
    }
    sendMessage({ text: input });
    setInput("");
  };

  const handleNewChat = () => {
    if (isLoading) {
      stop();
    }
    clearError();
    setMessages([]);
    setInput("");
  };

  const patientName = selectedPatient
    ? formatPatientName(selectedPatient)
    : null;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {sidebarOpen && (
        <PatientSidebar
          onPatientIdChange={setSelectedPatientId}
          onPatientSearchChange={setPatientSearch}
          patientAllergies={patientAllergies}
          patientEncounters={patientEncounters}
          patientMedications={patientMedications}
          patientSearch={patientSearch}
          patientsData={patientsData}
          patientsLoading={patientsLoading}
          selectedPatient={selectedPatient}
          selectedPatientId={selectedPatientId}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 border-b bg-card/80 px-3 py-2.5 backdrop-blur-sm">
          <Button
            aria-label={
              sidebarOpen
                ? "Cerrar panel de paciente"
                : "Abrir panel de paciente"
            }
            onClick={() => setSidebarOpen(!sidebarOpen)}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            {sidebarOpen ? <X size={14} /> : <Stethoscope size={14} />}
          </Button>

          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-sm bg-primary text-primary-foreground">
              <Bot size={13} />
            </div>
            <span className="font-semibold text-sm">Asistente Médico</span>
          </div>

          {patientName && (
            <span className="ml-1 rounded-sm bg-primary/10 px-2 py-0.5 text-primary text-xs">
              {patientName}
            </span>
          )}

          <Button
            aria-label="Nuevo chat"
            className="ml-auto"
            disabled={!(messages.length > 0 || isLoading)}
            onClick={handleNewChat}
            size="icon-xs"
            title="Nuevo chat"
            type="button"
            variant="ghost"
          >
            <MessageSquarePlus size={14} />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto" ref={messagesContainerRef}>
          {messages.length === 0 && !isLoading ? (
            <EmptyState
              hasPatient={!!selectedPatientId}
              onOpenSidebar={() => setSidebarOpen(true)}
              onSendMessage={sendMessage}
            />
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
              {messages.map((message) => (
                <MessageRow
                  isLoading={isLoading}
                  key={message.id}
                  message={message}
                />
              ))}

              {showLoadingIndicator && <LoadingIndicator />}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 border-destructive/30 border-t bg-destructive/5 px-4 py-2">
            <p className="flex-1 text-destructive text-xs">{error.message}</p>
            <Button
              onClick={clearError}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <X size={12} />
            </Button>
          </div>
        )}

        {/* Input */}
        <div className="border-t bg-card/80 px-4 py-3 backdrop-blur-sm">
          <form
            className="mx-auto flex max-w-3xl items-end gap-2"
            onSubmit={handleSubmit}
          >
            <div className="relative flex-1">
              <Input
                aria-label="Mensaje para el asistente médico"
                className="pr-2 text-sm"
                disabled={isLoading}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as unknown as React.FormEvent);
                  }
                }}
                placeholder={
                  selectedPatientId
                    ? "Escribe tu consulta médica..."
                    : "Escribe un mensaje (selecciona un paciente para contexto clínico)..."
                }
                value={input}
              />
            </div>
            {isLoading ? (
              <Button
                aria-label="Detener generación"
                onClick={() => stop()}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <X size={14} />
              </Button>
            ) : (
              <Button
                aria-label="Enviar mensaje"
                disabled={!input.trim()}
                size="icon-sm"
                type="submit"
              >
                <Send size={14} />
              </Button>
            )}
          </form>
          <p className="mx-auto mt-1.5 max-w-3xl text-center text-[10px] text-muted-foreground">
            El asistente puede cometer errores. Verifica la información clínica
            antes de actuar.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Message row ──────────────────────────────────────────────────────────────

function MessageRow({
  message,
  isLoading,
}: {
  message: { id: string; role: string; parts: unknown[] };
  isLoading: boolean;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[75%] rounded-sm bg-primary px-4 py-2.5 text-primary-foreground shadow-sm">
          <MessageParts
            isLoading={isLoading}
            message={message as Parameters<typeof MessageParts>[0]["message"]}
          />
        </div>
        <div className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-muted">
          <User size={13} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground shadow-sm">
        <Bot size={13} />
      </div>
      <div className="min-w-0 flex-1">
        <MessageParts
          isLoading={isLoading}
          message={message as Parameters<typeof MessageParts>[0]["message"]}
        />
      </div>
    </div>
  );
}

// ─── Loading indicator ────────────────────────────────────────────────────────

function LoadingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground shadow-sm">
        <Bot size={13} />
      </div>
      <div className="flex items-center gap-2 rounded-sm bg-muted/50 px-3 py-2 text-muted-foreground text-sm">
        <Loader2 className="animate-spin" size={13} />
        <span>Pensando...</span>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  hasPatient,
  onOpenSidebar,
  onSendMessage,
}: {
  hasPatient: boolean;
  onOpenSidebar: () => void;
  onSendMessage: (opts: { text: string }) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="flex size-14 items-center justify-center rounded-sm bg-primary/10 text-primary shadow-sm">
        <Bot size={28} />
      </div>

      <div className="text-center">
        <h2 className="font-semibold text-lg">Asistente Médico WellFit</h2>
        <p className="mt-1 max-w-sm text-muted-foreground text-sm">
          {hasPatient
            ? "Paciente seleccionado. Puedes consultar su historia clínica, prescribir medicamentos o generar resúmenes."
            : "Selecciona un paciente en el panel lateral para que el asistente tenga contexto clínico completo."}
        </p>
      </div>

      {hasPatient ? (
        <div className="grid w-full max-w-md grid-cols-2 gap-2">
          <QuickAction
            icon={<Activity size={14} />}
            label="Resumen clínico"
            onClick={() =>
              onSendMessage({
                text: "Genera un resumen clínico completo de este paciente, incluyendo antecedentes, alergias, medicamentos activos y atenciones recientes.",
              })
            }
          />
          <QuickAction
            icon={<Pill size={14} />}
            label="Revisar medicamentos"
            onClick={() =>
              onSendMessage({
                text: "Revisa los medicamentos actuales del paciente, identifica posibles interacciones o duplicidades.",
              })
            }
          />
          <QuickAction
            icon={<FileText size={14} />}
            label="Alergias"
            onClick={() =>
              onSendMessage({
                text: "Lista todas las alergias registradas del paciente y clasifica su criticidad.",
              })
            }
          />
          <QuickAction
            icon={<Stethoscope size={14} />}
            label="Atenciones recientes"
            onClick={() =>
              onSendMessage({
                text: "Muestra las atenciones clínicas recientes del paciente con diagnóstico y evolución.",
              })
            }
          />
        </div>
      ) : (
        <QuickAction
          icon={<User size={14} />}
          label="Abrir panel de paciente"
          onClick={onOpenSidebar}
        />
      )}
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={`flex items-center gap-2 rounded-sm border bg-card px-3 py-2.5 text-xs shadow-sm transition-colors hover:bg-muted/60 hover:shadow-md ${className ?? ""}`}
      onClick={onClick}
      type="button"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shouldShowLoadingIndicator(
  messages: Array<{ role: string; parts?: Array<{ type: string }> }>,
  status: string
) {
  if (status === "submitted") {
    return true;
  }
  if (status !== "streaming") {
    return false;
  }
  const lastMessage = messages.at(-1);
  return (
    lastMessage?.role === "assistant" &&
    !lastMessage.parts?.some(
      (part) => part.type === "text" || part.type.startsWith("tool-")
    )
  );
}

function formatPatientName(p: {
  firstName: string;
  middleName: string | null;
  lastName1: string;
  lastName2: string | null;
}) {
  return `${p.firstName}${p.middleName ? ` ${p.middleName}` : ""} ${p.lastName1}${p.lastName2 ? ` ${p.lastName2}` : ""}`;
}
