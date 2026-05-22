import { fireworks } from "@ai-sdk/fireworks";
import { ripsReferenceEntry } from "@wellfit-emr/db/schema/rips-reference";
import { generateText, Output, zodSchema } from "ai";
import { and, eq, like } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../context";
import { extractTextFromDocument } from "./patient-document-summary";
import { RIPS_TABLE_NAMES } from "./rips-validation";

const MAX_PROMPT_TEXT_LENGTH = 15_000;
const FIELD_CONFIDENCE_THRESHOLD = 0.55;
const PDF_MIME_TYPE = "application/pdf";
const ISO_DATE_REGEX = /\b(\d{4})-(\d{2})-(\d{2})\b/;
const SLASH_DATE_REGEX = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/;
const TIME_PREFIX_REGEX = /T(\d{2}):(\d{2})/;
const DOCUMENT_TYPE_REGEX = /\b(CC|CE|PA|RC|TI|PEP|PPT|NIT)\b/i;
const DOCUMENT_NUMBER_AFTER_TYPE_REGEX =
  /\b(?:CC|CE|PA|RC|TI|PEP|PPT|NIT)\b\s*[:#-]?\s*([A-Z0-9][A-Z0-9 .-]{2,})/i;
const NUMBER_GROUP_REGEX = /\b\d[\d .-]{4,}\b/;
const LABEL_SEPARATOR_REGEX = /[:：]/;
const LOCATION_SEPARATOR_REGEX = /[,;()\n]/;
const NAME_CONTEXT_REGEX =
  /(?:(?:nombre(?:\s+completo)?)\s*[:：-]\s*|(?:paciente|usuario)\s*(?:[:：-]\s*)?)([^\n\r]+)/i;
const NAME_STOP_REGEX =
  /\b(?:CC|CE|PA|RC|TI|PEP|PPT|NIT|DOCUMENTO|IDENTIFICACI[ÓO]N|FECHA|NACIMIENTO|SEXO|G[EÉ]NERO|DIRECCI[ÓO]N|EDAD|EPS|TEL[EÉ]FONO|CELULAR)\b/i;
const BIRTH_DATE_CONTEXT_REGEX =
  /(?:fecha\s+(?:de\s+)?nacimiento|nacimiento|nacid[oa](?:\s+el)?|f\.?\s*nac(?:imiento)?)\D{0,40}((?:\d{4}-\d{2}-\d{2})|(?:\d{1,2}\/\d{1,2}\/\d{4}))/i;
const SEX_CONTEXT_REGEX =
  /(?:sexo(?:\s+al\s+nacer)?)\s*[:：-]?\s*(femenino|masculino|mujer|hombre|indeterminado|intersexual|female|male|[HMI])\b/i;
const LOCATION_CONTEXT_REGEX =
  /(?:municipio|ciudad|direcci[oó]n|residencia)\s*[:：-]?\s*([^\n\r]+)/i;
const LOCATION_LINE_KEYWORDS_REGEX =
  /\b(?:municipio|ciudad|direcci[oó]n|residencia|ubicaci[oó]n|domicilio|lugar)\b/i;
const LINE_SPLIT_REGEX = /\r?\n/;
const WORD_SPLIT_REGEX = /\s+/;
const DEFAULT_COUNTRY_CODE = "170";
const DEFAULT_COUNTRY_NAME = "Colombia";

const PATIENT_AUTOFILL_FIELD_NAMES = [
  "primaryDocumentType",
  "primaryDocumentNumber",
  "firstName",
  "middleName",
  "lastName1",
  "lastName2",
  "birthDate",
  "sexAtBirth",
  "genderIdentity",
  "countryCode",
  "municipalityCode",
  "zoneCode",
  "deceasedAt",
] as const;

const DOCUMENT_TYPE_ALIASES: Record<string, string> = {
  cc: "CC",
  cedula: "CC",
  "cedula de ciudadania": "CC",
  "cédula de ciudadanía": "CC",
  ce: "CE",
  "cedula de extranjeria": "CE",
  "cédula de extranjería": "CE",
  pa: "PA",
  pasaporte: "PA",
  rc: "RC",
  "registro civil": "RC",
  ti: "TI",
  "tarjeta de identidad": "TI",
  pep: "PEP",
  "permiso especial de permanencia": "PEP",
  ppt: "PPT",
  "permiso por proteccion temporal": "PPT",
  "permiso por protección temporal": "PPT",
  nit: "NIT",
};

const ALLOWED_DOCUMENT_TYPE_CODES = new Set([
  "CC",
  "CE",
  "PA",
  "RC",
  "TI",
  "PEP",
  "PPT",
  "NIT",
]);
const ALLOWED_GENDER_IDENTITIES = new Set([
  "masculino",
  "femenino",
  "transgenero",
  "no_binario",
  "otro",
  "prefiero_no_decir",
]);

const flexibleStringSchema = z
  .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
  .nullable()
  .optional()
  .transform((value) => {
    if (value == null) {
      return null;
    }
    if (Array.isArray(value)) {
      return value.join("; ");
    }
    return String(value);
  });

const flexibleConfidenceSchema = z
  .union([z.number(), z.string()])
  .nullable()
  .optional()
  .transform((value) => {
    if (value == null) {
      return null;
    }
    const parsed =
      typeof value === "number" ? value : Number(value.replace("%", ""));
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return parsed > 1 ? parsed / 100 : parsed;
  });

const flexibleWarningsSchema = z
  .union([z.array(z.string()), z.string()])
  .nullable()
  .optional()
  .transform((value) => {
    if (value == null) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  });

const extractedPatientFieldsSchema = z
  .object({
    birthDate: flexibleStringSchema,
    countryCode: flexibleStringSchema,
    deceasedAt: flexibleStringSchema,
    firstName: flexibleStringSchema,
    genderIdentity: flexibleStringSchema,
    lastName1: flexibleStringSchema,
    lastName2: flexibleStringSchema,
    middleName: flexibleStringSchema,
    municipalityCode: flexibleStringSchema,
    primaryDocumentNumber: flexibleStringSchema,
    primaryDocumentType: flexibleStringSchema,
    sexAtBirth: flexibleStringSchema,
    zoneCode: flexibleStringSchema,
  })
  .partial()
  .default({});

const fieldConfidenceSchema = z
  .object({
    birthDate: flexibleConfidenceSchema,
    countryCode: flexibleConfidenceSchema,
    deceasedAt: flexibleConfidenceSchema,
    firstName: flexibleConfidenceSchema,
    genderIdentity: flexibleConfidenceSchema,
    lastName1: flexibleConfidenceSchema,
    lastName2: flexibleConfidenceSchema,
    middleName: flexibleConfidenceSchema,
    municipalityCode: flexibleConfidenceSchema,
    primaryDocumentNumber: flexibleConfidenceSchema,
    primaryDocumentType: flexibleConfidenceSchema,
    sexAtBirth: flexibleConfidenceSchema,
    zoneCode: flexibleConfidenceSchema,
  })
  .partial()
  .default({});

const fieldEvidenceSchema = z
  .object({
    birthDate: flexibleStringSchema,
    countryCode: flexibleStringSchema,
    deceasedAt: flexibleStringSchema,
    firstName: flexibleStringSchema,
    genderIdentity: flexibleStringSchema,
    lastName1: flexibleStringSchema,
    lastName2: flexibleStringSchema,
    middleName: flexibleStringSchema,
    municipalityCode: flexibleStringSchema,
    primaryDocumentNumber: flexibleStringSchema,
    primaryDocumentType: flexibleStringSchema,
    sexAtBirth: flexibleStringSchema,
    zoneCode: flexibleStringSchema,
  })
  .partial()
  .default({});

const patientPdfAutofillModelSchema = z.object({
  documentKind: flexibleStringSchema,
  summary: flexibleStringSchema,
  fields: extractedPatientFieldsSchema,
  fieldConfidence: fieldConfidenceSchema,
  fieldEvidence: fieldEvidenceSchema,
  locationHints: z
    .object({
      countryName: flexibleStringSchema,
      municipalityName: flexibleStringSchema,
    })
    .partial()
    .default({}),
  warnings: flexibleWarningsSchema,
});

type PatientAutofillFieldName = (typeof PATIENT_AUTOFILL_FIELD_NAMES)[number];
type ExtractedPatientFields = z.infer<typeof extractedPatientFieldsSchema>;
type PatientPdfAutofillModelOutput = z.infer<
  typeof patientPdfAutofillModelSchema
>;

export interface PatientPdfAutofillResult {
  displayLabels: Partial<Record<PatientAutofillFieldName, string>>;
  documentKind: string | null;
  fieldConfidence: Partial<Record<PatientAutofillFieldName, number>>;
  fieldEvidence: Partial<Record<PatientAutofillFieldName, string>>;
  fields: ExtractedPatientFields;
  pdfTotalPages?: number;
  summary: string;
  warnings: string[];
}

interface CatalogResolution {
  code: string;
  name: string;
}

function baseMimeType(mimeType: string): string {
  return (mimeType.split(";")[0] ?? mimeType).trim().toLowerCase();
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeLookupKey(value: string): string {
  return stripAccents(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function cleanString(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  const text = Array.isArray(value) ? value.join("; ") : String(value);
  const trimmed = text.trim();
  return trimmed ? trimmed : null;
}

function normalizeConfidence(value: unknown): number | undefined {
  if (value == null) {
    return;
  }
  const parsed =
    typeof value === "number" ? value : Number(String(value).replace("%", ""));
  if (!Number.isFinite(parsed)) {
    return;
  }
  const normalized = parsed > 1 ? parsed / 100 : parsed;
  return Math.min(1, Math.max(0, normalized));
}

function hasSufficientConfidence(value: unknown): boolean {
  if (value == null) {
    return true;
  }
  const normalized = normalizeConfidence(value);
  return normalized != null && normalized >= FIELD_CONFIDENCE_THRESHOLD;
}

function normalizeDocumentType(value: unknown): string | null {
  const cleaned = cleanString(value);
  if (!cleaned) {
    return null;
  }
  const directCode = cleaned.match(DOCUMENT_TYPE_REGEX)?.[1]?.toUpperCase();
  if (directCode && ALLOWED_DOCUMENT_TYPE_CODES.has(directCode)) {
    return directCode;
  }
  const upper = cleaned.toUpperCase();
  if (ALLOWED_DOCUMENT_TYPE_CODES.has(upper)) {
    return upper;
  }
  return DOCUMENT_TYPE_ALIASES[normalizeLookupKey(cleaned)] ?? null;
}

function normalizeDocumentNumber(value: unknown): string | null {
  const cleaned = cleanString(value);
  if (!cleaned) {
    return null;
  }
  const candidate =
    cleaned.match(DOCUMENT_NUMBER_AFTER_TYPE_REGEX)?.[1] ??
    cleaned.match(NUMBER_GROUP_REGEX)?.[0] ??
    cleaned;
  const normalized = candidate.replace(/[^A-Za-z0-9]/g, "");
  return normalized || null;
}

function normalizeSexAtBirth(value: unknown): string | null {
  const cleaned = cleanString(value);
  if (!cleaned) {
    return null;
  }
  const upper = cleaned.toUpperCase();
  if (["H", "M", "I"].includes(upper)) {
    return upper;
  }
  const normalized = normalizeLookupKey(cleaned);
  if (
    normalized.includes("hombre") ||
    normalized.includes("masculino") ||
    normalized.includes("male")
  ) {
    return "H";
  }
  if (
    normalized.includes("mujer") ||
    normalized.includes("femenino") ||
    normalized.includes("female")
  ) {
    return "M";
  }
  if (
    normalized.includes("indeterminado") ||
    normalized.includes("intersexual") ||
    normalized.includes("indefinido")
  ) {
    return "I";
  }
  return null;
}

function normalizeGenderIdentity(value: unknown): string | null {
  const cleaned = cleanString(value);
  if (!cleaned) {
    return null;
  }
  const normalized = normalizeLookupKey(cleaned).replace(/\s+/g, "_");
  const aliasMap: Record<string, string> = {
    masculino: "masculino",
    hombre: "masculino",
    femenino: "femenino",
    mujer: "femenino",
    transgenero: "transgenero",
    transgenero_: "transgenero",
    transgénero: "transgenero",
    no_binario: "no_binario",
    nobinario: "no_binario",
    otro: "otro",
    prefiero_no_decir: "prefiero_no_decir",
  };
  const mapped = aliasMap[normalized] ?? normalized;
  return ALLOWED_GENDER_IDENTITIES.has(mapped) ? mapped : null;
}

function normalizeZoneCode(value: unknown): string | null {
  const cleaned = cleanString(value);
  if (!cleaned) {
    return null;
  }
  if (cleaned === "01" || cleaned === "02") {
    return cleaned;
  }
  const normalized = normalizeLookupKey(cleaned);
  if (normalized === "rural") {
    return "01";
  }
  if (normalized === "urbano" || normalized === "urbana") {
    return "02";
  }
  return null;
}

function normalizeDate(value: unknown): string | null {
  const cleaned = cleanString(value);
  if (!cleaned) {
    return null;
  }
  const isoMatch = cleaned.match(ISO_DATE_REGEX);
  const slashMatch = cleaned.match(SLASH_DATE_REGEX);
  if (!(isoMatch || slashMatch)) {
    return null;
  }
  const [, year, month, day] = isoMatch ?? [
    "",
    slashMatch?.[3] ?? "",
    slashMatch?.[2]?.padStart(2, "0") ?? "",
    slashMatch?.[1]?.padStart(2, "0") ?? "",
  ];
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

function normalizeDateTimeLocal(value: unknown): string | null {
  const date = normalizeDate(value);
  if (!date) {
    return null;
  }
  const timeMatch = cleanString(value)?.match(TIME_PREFIX_REGEX);
  if (!timeMatch) {
    return `${date}T00:00`;
  }
  const [, hours, minutes] = timeMatch;
  const hour = Number(hours);
  const minute = Number(minutes);
  if (hour > 23 || minute > 59) {
    return `${date}T00:00`;
  }
  return `${date}T${hours}:${minutes}`;
}

function hasUsableConfidence(
  output: PatientPdfAutofillModelOutput,
  fieldName: PatientAutofillFieldName
): boolean {
  return hasSufficientConfidence(output.fieldConfidence?.[fieldName]);
}

function getFieldSource(
  output: PatientPdfAutofillModelOutput,
  fieldName: PatientAutofillFieldName
): string | null {
  if (!hasUsableConfidence(output, fieldName)) {
    return null;
  }
  return (
    cleanString(output.fields?.[fieldName]) ??
    cleanString(output.fieldEvidence?.[fieldName])
  );
}

function extractAfterLabel(value: string): string {
  return value.split(LABEL_SEPARATOR_REGEX).at(-1)?.trim() || value;
}

function extractCountryCandidate(value: string | null): string | null {
  const cleaned = cleanString(value);
  if (!cleaned) {
    return null;
  }
  return normalizeLookupKey(cleaned).includes("colombia") ? "Colombia" : null;
}

function getRegexGroup(value: string, regex: RegExp): string | null {
  return cleanString(value.match(regex)?.[1]);
}

function cleanNameSource(value: string): string {
  return (
    extractAfterLabel(value)
      .split(NAME_STOP_REGEX)[0]
      ?.replace(/\s+/g, " ")
      .trim() ?? ""
  );
}

function extractDeterministicSources(
  text: string
): Partial<Record<PatientAutofillFieldName, string>> {
  const sources: Partial<Record<PatientAutofillFieldName, string>> = {};
  const fullName = getRegexGroup(text, NAME_CONTEXT_REGEX);
  const birthDate = getRegexGroup(text, BIRTH_DATE_CONTEXT_REGEX);
  const sexAtBirth = getRegexGroup(text, SEX_CONTEXT_REGEX);
  const location = getRegexGroup(text, LOCATION_CONTEXT_REGEX);
  const documentType = text.match(DOCUMENT_TYPE_REGEX)?.[1]?.toUpperCase();
  const documentNumber = text.match(DOCUMENT_NUMBER_AFTER_TYPE_REGEX)?.[0];

  if (fullName) {
    sources.firstName = fullName;
  }
  if (birthDate) {
    sources.birthDate = birthDate;
  }
  if (sexAtBirth) {
    sources.sexAtBirth = sexAtBirth;
  }
  if (location) {
    sources.municipalityCode = location;
  }
  if (documentType) {
    sources.primaryDocumentType = documentType;
  }
  if (documentNumber) {
    sources.primaryDocumentNumber = documentNumber;
  }
  if (normalizeLookupKey(text).includes("colombia")) {
    sources.countryCode = "Colombia";
  }

  return sources;
}

function parseFullName(value: string | null): {
  firstName: string | null;
  lastName1: string | null;
  lastName2: string | null;
  middleName: string | null;
} {
  const cleaned = cleanString(value);
  if (!cleaned) {
    return {
      firstName: null,
      middleName: null,
      lastName1: null,
      lastName2: null,
    };
  }

  const nameText = cleanNameSource(cleaned);
  const tokens = nameText.split(" ").filter(Boolean);

  if (tokens.length < 2) {
    return {
      firstName: cleanString(nameText),
      middleName: null,
      lastName1: null,
      lastName2: null,
    };
  }

  if (tokens.length === 2) {
    return {
      firstName: tokens[0] ?? null,
      middleName: null,
      lastName1: tokens[1] ?? null,
      lastName2: null,
    };
  }

  if (tokens.length === 3) {
    return {
      firstName: tokens[0] ?? null,
      middleName: null,
      lastName1: tokens[1] ?? null,
      lastName2: tokens[2] ?? null,
    };
  }

  return {
    firstName: tokens[0] ?? null,
    middleName: cleanString(tokens.slice(1, -2).join(" ")),
    lastName1: tokens.at(-2) ?? null,
    lastName2: tokens.at(-1) ?? null,
  };
}

async function getPromptCatalogEntries(
  db: Db,
  tableName: string,
  limit = 80
): Promise<string[]> {
  try {
    const entries = await db
      .select({ code: ripsReferenceEntry.code, name: ripsReferenceEntry.name })
      .from(ripsReferenceEntry)
      .where(eq(ripsReferenceEntry.tableName, tableName))
      .limit(limit);

    return entries.map((entry) => `${entry.code}: ${entry.name}`);
  } catch {
    return [];
  }
}

async function resolveCatalogValue(
  db: Db,
  tableName: string,
  code: string | null,
  name: string | null
): Promise<CatalogResolution | null> {
  try {
    const cleanedCode = cleanString(code);
    if (cleanedCode) {
      const [entry] = await db
        .select({
          code: ripsReferenceEntry.code,
          name: ripsReferenceEntry.name,
        })
        .from(ripsReferenceEntry)
        .where(
          and(
            eq(ripsReferenceEntry.tableName, tableName),
            eq(ripsReferenceEntry.code, cleanedCode)
          )
        )
        .limit(1);
      if (entry) {
        return entry;
      }
    }

    const cleanedName = cleanString(name);
    if (!cleanedName) {
      return null;
    }

    const rawCandidates = [
      cleanedName,
      extractAfterLabel(cleanedName),
      ...extractAfterLabel(cleanedName).split(LOCATION_SEPARATOR_REGEX),
    ];
    const candidates = Array.from(
      new Set(
        rawCandidates.flatMap((candidate) => {
          const cleanedCandidate = cleanString(candidate);
          if (!cleanedCandidate) {
            return [];
          }
          return [cleanedCandidate, stripAccents(cleanedCandidate)];
        })
      )
    ).filter((candidate) => candidate.length >= 3);

    for (const candidate of candidates) {
      const matches = await db
        .select({
          code: ripsReferenceEntry.code,
          name: ripsReferenceEntry.name,
        })
        .from(ripsReferenceEntry)
        .where(
          and(
            eq(ripsReferenceEntry.tableName, tableName),
            like(ripsReferenceEntry.name, `%${candidate}%`)
          )
        )
        .limit(10);

      const normalizedCandidate = normalizeLookupKey(candidate);
      const exactMatches = matches.filter(
        (entry) => normalizeLookupKey(entry.name) === normalizedCandidate
      );

      if (exactMatches.length === 1) {
        return exactMatches[0] ?? null;
      }
      if (matches.length === 1) {
        return matches[0] ?? null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function hasConsecutiveWords(
  textWords: string[],
  searchWords: string[]
): boolean {
  for (let i = 0; i <= textWords.length - searchWords.length; i++) {
    let match = true;
    for (let j = 0; j < searchWords.length; j++) {
      if (textWords[i + j] !== searchWords[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      return true;
    }
  }
  return false;
}

function cleanWordTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúüñ\s]/gi, " ")
    .split(WORD_SPLIT_REGEX)
    .filter((w) => w.length >= 2);
}

function extractLocationContextLines(text: string): string {
  const lines = text.split(LINE_SPLIT_REGEX);
  const contextLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (LOCATION_LINE_KEYWORDS_REGEX.test(lines[i] ?? "")) {
      contextLines.push(lines[i] ?? "");
      if (i + 1 < lines.length) {
        contextLines.push(lines[i + 1] ?? "");
      }
    }
  }
  return contextLines.join("\n");
}

function searchMunicipalityInWords(
  allMunicipalities: CatalogResolution[],
  searchWords: string[],
  searchWordSet: Set<string>
): CatalogResolution | null {
  const sorted = [...allMunicipalities].sort(
    (a, b) => stripAccents(b.name).length - stripAccents(a.name).length
  );

  for (const m of sorted) {
    const normalizedName = stripAccents(m.name).toLowerCase();
    const nameWords = normalizedName.split(WORD_SPLIT_REGEX).filter(Boolean);

    if (nameWords.length === 0) {
      continue;
    }

    if (nameWords.length === 1) {
      const word = nameWords[0];
      if (word && word.length >= 3 && searchWordSet.has(word)) {
        return m;
      }
      continue;
    }

    if (hasConsecutiveWords(searchWords, nameWords)) {
      return m;
    }
  }

  return null;
}

async function findMunicipalityInText(
  db: Db,
  text: string,
  preferredText?: string
): Promise<CatalogResolution | null> {
  try {
    const allMunicipalities = await db
      .select({
        code: ripsReferenceEntry.code,
        name: ripsReferenceEntry.name,
      })
      .from(ripsReferenceEntry)
      .where(eq(ripsReferenceEntry.tableName, RIPS_TABLE_NAMES.municipio));

    if (!text || text.length < 10) {
      return null;
    }

    const normalizedText = stripAccents(text).toLowerCase();
    const textWords = cleanWordTokens(normalizedText);
    const textWordSet = new Set(textWords);

    if (preferredText && preferredText.length >= 3) {
      const preferredWords = cleanWordTokens(stripAccents(preferredText));
      const preferredWordSet = new Set(preferredWords);
      const preferredMatch = searchMunicipalityInWords(
        allMunicipalities,
        preferredWords,
        preferredWordSet
      );
      if (preferredMatch) {
        return preferredMatch;
      }
    }

    return searchMunicipalityInWords(allMunicipalities, textWords, textWordSet);
  } catch {
    return null;
  }
}

function normalizeModelOutput(
  output: PatientPdfAutofillModelOutput,
  fallbackText = ""
): PatientPdfAutofillResult {
  const fallbackSources = extractDeterministicSources(fallbackText);
  const getSource = (fieldName: PatientAutofillFieldName) => {
    const confidence = normalizeConfidence(output.fieldConfidence?.[fieldName]);
    if (confidence !== undefined && confidence < FIELD_CONFIDENCE_THRESHOLD) {
      return null;
    }
    return (
      getFieldSource(output, fieldName) ?? fallbackSources[fieldName] ?? null
    );
  };
  const parsedName = parseFullName(getSource("firstName"));
  const normalizedFields: ExtractedPatientFields = {
    birthDate: normalizeDate(getSource("birthDate")),
    countryCode: null,
    deceasedAt: normalizeDateTimeLocal(getSource("deceasedAt")),
    firstName: parsedName.firstName,
    genderIdentity: normalizeGenderIdentity(getSource("genderIdentity")),
    lastName1: cleanString(getSource("lastName1")) ?? parsedName.lastName1,
    lastName2: cleanString(getSource("lastName2")) ?? parsedName.lastName2,
    middleName: cleanString(getSource("middleName")) ?? parsedName.middleName,
    municipalityCode: null,
    primaryDocumentNumber: normalizeDocumentNumber(
      getSource("primaryDocumentNumber")
    ),
    primaryDocumentType: normalizeDocumentType(
      getSource("primaryDocumentType")
    ),
    sexAtBirth: normalizeSexAtBirth(getSource("sexAtBirth")),
    zoneCode: normalizeZoneCode(getSource("zoneCode")),
  };

  const fieldConfidence: Partial<Record<PatientAutofillFieldName, number>> = {};
  const fieldEvidence: Partial<Record<PatientAutofillFieldName, string>> = {};

  for (const fieldName of PATIENT_AUTOFILL_FIELD_NAMES) {
    const confidence = normalizeConfidence(output.fieldConfidence?.[fieldName]);
    const evidence = cleanString(output.fieldEvidence?.[fieldName]);
    if (confidence !== undefined) {
      fieldConfidence[fieldName] = confidence;
    }
    if (evidence) {
      fieldEvidence[fieldName] = evidence;
    }
  }

  const warnings = Array.isArray(output.warnings)
    ? output.warnings
    : [output.warnings];

  return {
    displayLabels: {},
    documentKind: cleanString(output.documentKind),
    fieldConfidence,
    fieldEvidence,
    fields: normalizedFields,
    summary: cleanString(output.summary) ?? "",
    warnings: warnings.flatMap((warning) => {
      const cleaned = cleanString(warning);
      return cleaned ? [cleaned] : [];
    }),
  };
}

function buildPrompt(params: {
  documentTypeCatalog: string[];
  extractedText: string;
  fileName?: string;
  sexCatalog: string[];
  zoneCatalog: string[];
}): string {
  const promptText =
    params.extractedText.length > MAX_PROMPT_TEXT_LENGTH
      ? `${params.extractedText.slice(0, MAX_PROMPT_TEXT_LENGTH)}\n\n[Texto truncado por límite de contexto.]`
      : params.extractedText;

  return `Extrae datos demográficos para PRELLENAR un formulario de creación de paciente en una HCE colombiana.

Reglas críticas:
1. Extrae ÚNICAMENTE datos de identificación/demografía del PACIENTE titular del documento. No uses datos de médicos, acudientes, firmantes, instituciones, aseguradoras ni contactos salvo que el texto indique explícitamente que pertenecen al paciente.
2. Si un dato está ausente, ilegible, contradictorio o es una inferencia débil, devuelve null y confidence <= 0.5. No inventes información para completar campos requeridos.
3. Nombres: usa firstName para el primer nombre, middleName para el segundo nombre, lastName1 para el primer apellido y lastName2 para el segundo apellido. Si no puedes separarlos con certeza, pon el nombre completo en firstName y deja los demás null; el sistema lo separará automáticamente. No combines dos nombres en firstName si puedes distinguir el segundo nombre.
4. Fechas: usa formato ISO estricto YYYY-MM-DD. Para deceasedAt usa YYYY-MM-DDTHH:mm si hay hora; si solo hay fecha de fallecimiento usa YYYY-MM-DDT00:00. Solo incluye deceasedAt si el documento menciona explícitamente el fallecimiento del paciente. No confundas fechas de expedición, atención, admisión o impresión con fecha de nacimiento/fallecimiento.
5. Documento: primaryDocumentType debe ser uno de CC, CE, PA, RC, TI, PEP, PPT, NIT. primaryDocumentNumber debe ser el número del paciente, sin espacios.
6. Sexo al nacer: usa H para hombre/masculino, M para mujer/femenino, I para indeterminado/intersexual. No confundas identidad de género con sexo al nacer.
7. Identidad de género: si aparece explícitamente, usa uno de masculino, femenino, transgenero, no_binario, otro, prefiero_no_decir; si no aparece, null.
8. Ubicación: countryCode/municipalityCode deben ser códigos oficiales solo si aparecen explícitamente en el texto o son inequívocos. Si solo aparecen nombres, deja el código null y llena locationHints.countryName/locationHints.municipalityName para que el servidor resuelva los catálogos SISPRO. No asumas Colombia (170) solo porque el documento proviene de una HCE colombiana.
9. Zona: para ESTE formulario usa 01 = Rural y 02 = Urbano. Si el texto solo dice cabecera/urbano, usa 02; si dice rural/centro poblado/rural disperso, usa 01.
10. En fieldEvidence copia una frase corta del documento que justifique cada campo. En fieldConfidence usa 0 a 1 según certeza.
11. Si no estás seguro del valor exacto o del formato de un campo, es preferible que dejes fields.{campo} como null y proporciones la evidencia en fieldEvidence con confianza alta. El sistema normalizará automáticamente desde la evidencia. No inventes valores en fields solo para que no queden null.
12. summary: escribe 1-2 oraciones describiendo qué tipo de documento analizaste. documentKind: clasifícalo brevemente (ej. historia_clinica, admision, documento_identidad, orden_medica). warnings: lista advertencias específicas para el revisor humano (ej. "El nombre estaba borroso", "No se encontró fecha de nacimiento").

Catálogos de referencia disponibles:
- Tipos de documento: ${params.documentTypeCatalog.join("; ") || "CC, CE, PA, RC, TI, PEP, PPT, NIT"}
- Sexo: ${params.sexCatalog.join("; ") || "H: Hombre; M: Mujer; I: Indeterminado"}
- Zona: ${params.zoneCatalog.join("; ") || "01: Rural; 02: Urbano"}

Archivo: ${params.fileName || "documento.pdf"}

Texto extraído del PDF:
"""
${promptText}
"""`;
}

export async function extractPatientAutofillFromPdf(
  db: Db,
  bytes: Uint8Array,
  mimeType: string,
  options: {
    extractFn?: typeof extractTextFromDocument;
    fileName?: string;
    findMunicipalityFn?: typeof findMunicipalityInText;
    generateTextFn?: typeof generateText;
  } = {}
): Promise<PatientPdfAutofillResult> {
  if (baseMimeType(mimeType) !== PDF_MIME_TYPE) {
    throw new Error("Solo se admite extracción automática desde archivos PDF.");
  }

  const extractFn = options.extractFn ?? extractTextFromDocument;
  const generateTextFn = options.generateTextFn ?? generateText;
  const findMunicipalityFn =
    options.findMunicipalityFn ?? findMunicipalityInText;
  const { errorMessage, pdfTotalPages, text } = await extractFn(
    bytes,
    mimeType
  );

  if (!text?.trim()) {
    throw new Error(
      errorMessage ||
        "El PDF no contiene texto extraíble. Puede ser un escaneo o estar protegido."
    );
  }

  const [documentTypeCatalog, sexCatalog, zoneCatalog] = await Promise.all([
    getPromptCatalogEntries(db, RIPS_TABLE_NAMES.tipoIdPisis),
    getPromptCatalogEntries(db, RIPS_TABLE_NAMES.sexo),
    getPromptCatalogEntries(db, RIPS_TABLE_NAMES.zona),
  ]);

  const { output } = await generateTextFn({
    model: fireworks("accounts/fireworks/routers/kimi-k2p6-turbo"),
    system:
      "Eres un extractor clínico-administrativo para una Historia Clínica Electrónica colombiana. Devuelve JSON estructurado y conservador. No inventes datos: prioriza null cuando haya incertidumbre.",
    prompt: buildPrompt({
      documentTypeCatalog,
      extractedText: text,
      fileName: options.fileName,
      sexCatalog,
      zoneCatalog,
    }),
    output: Output.object({
      schema: zodSchema(patientPdfAutofillModelSchema),
      name: "PatientPdfAutofill",
    }),
  });

  const fallbackSources = extractDeterministicSources(text);
  const result = normalizeModelOutput(output, text);

  const locationContext = extractLocationContextLines(text);
  const municipalityFromText = await findMunicipalityFn(
    db,
    text,
    locationContext
  );

  const [countryResolution] = await Promise.all([
    resolveCatalogValue(
      db,
      RIPS_TABLE_NAMES.pais,
      getFieldSource(output, "countryCode") ??
        fallbackSources.countryCode ??
        null,
      output.locationHints?.countryName ??
        extractCountryCandidate(
          getFieldSource(output, "countryCode") ??
            fallbackSources.countryCode ??
            null
        )
    ),
  ]);

  if (countryResolution) {
    result.fields.countryCode = countryResolution.code;
    result.displayLabels.countryCode = countryResolution.name;
  } else {
    result.fields.countryCode = DEFAULT_COUNTRY_CODE;
    result.displayLabels.countryCode = DEFAULT_COUNTRY_NAME;
  }

  if (municipalityFromText) {
    result.fields.municipalityCode = municipalityFromText.code;
    result.displayLabels.municipalityCode = municipalityFromText.name;
  }

  if (pdfTotalPages != null) {
    result.pdfTotalPages = pdfTotalPages;
  }

  return result;
}
