import { describe, expect, mock, test } from "bun:test";
import type { generateText } from "ai";
import { createTestContext } from "../test-utils";
import { extractPatientAutofillFromPdf } from "./patient-pdf-autofill";

const emptyFieldConfidence = {
  birthDate: null,
  countryCode: null,
  deceasedAt: null,
  firstName: null,
  genderIdentity: null,
  lastName1: null,
  lastName2: null,
  middleName: null,
  municipalityCode: null,
  primaryDocumentNumber: null,
  primaryDocumentType: null,
  sexAtBirth: null,
  zoneCode: null,
};

const emptyFieldEvidence = {
  birthDate: null,
  countryCode: null,
  deceasedAt: null,
  firstName: null,
  genderIdentity: null,
  lastName1: null,
  lastName2: null,
  middleName: null,
  municipalityCode: null,
  primaryDocumentNumber: null,
  primaryDocumentType: null,
  sexAtBirth: null,
  zoneCode: null,
};

describe("extractPatientAutofillFromPdf", () => {
  test("extracts and normalizes demographics from a PDF text", async () => {
    const ctx = createTestContext();
    const fakeExtract = mock(async () => ({
      pdfTotalPages: 2,
      text: "Paciente: María Camila Pérez Gómez. CC 1 234 567. Fecha nacimiento 1991-04-23. Sexo femenino. Zona urbana.",
    }));
    const fakeGenerateText = mock(async () => ({
      text: "fake",
      output: {
        documentKind: "documento de identificación",
        summary: "Documento con datos de identificación de la paciente.",
        fields: {
          birthDate: "1991-04-23",
          countryCode: null,
          deceasedAt: null,
          firstName: "María",
          genderIdentity: null,
          lastName1: "Pérez",
          lastName2: "Gómez",
          middleName: "Camila",
          municipalityCode: null,
          primaryDocumentNumber: "1 234 567",
          primaryDocumentType: "Cédula de ciudadanía",
          sexAtBirth: "femenino",
          zoneCode: "urbana",
        },
        fieldConfidence: {
          ...emptyFieldConfidence,
          birthDate: 0.95,
          firstName: 0.95,
          lastName1: 0.95,
          lastName2: 0.95,
          middleName: 0.9,
          primaryDocumentNumber: 0.94,
          primaryDocumentType: 0.92,
          sexAtBirth: 0.9,
          zoneCode: 0.8,
        },
        fieldEvidence: {
          ...emptyFieldEvidence,
          birthDate: "Fecha nacimiento 1991-04-23",
          primaryDocumentNumber: "CC 1 234 567",
          primaryDocumentType: "CC 1 234 567",
        },
        locationHints: { countryName: null, municipalityName: null },
        warnings: [],
      },
    })) as unknown as typeof generateText;

    const result = await extractPatientAutofillFromPdf(
      ctx.db,
      new Uint8Array([1, 2, 3]),
      "application/pdf",
      { extractFn: fakeExtract, generateTextFn: fakeGenerateText }
    );

    expect(result.fields).toMatchObject({
      birthDate: "1991-04-23",
      firstName: "María",
      lastName1: "Pérez",
      lastName2: "Gómez",
      middleName: "Camila",
      primaryDocumentNumber: "1234567",
      primaryDocumentType: "CC",
      sexAtBirth: "M",
      zoneCode: "02",
    });
    expect(result.pdfTotalPages).toBe(2);
    expect(fakeExtract).toHaveBeenCalled();
    expect(fakeGenerateText).toHaveBeenCalled();
  });

  test("accepts sparse and stringly model output", async () => {
    const ctx = createTestContext();
    const fakeExtract = mock(async () => ({
      text: "Paciente Ana Rojas CC 99",
    }));
    const fakeGenerateText = mock(async () => ({
      text: "fake",
      output: {
        documentKind: "admisión",
        summary: null,
        fields: {
          firstName: "Ana",
          lastName1: "Rojas",
          primaryDocumentNumber: 99,
          primaryDocumentType: "CC",
        },
        fieldConfidence: {
          firstName: "95%",
          lastName1: "0.90",
          primaryDocumentNumber: "1",
          primaryDocumentType: 1,
        },
        warnings: "Revisar contra documento original.",
      },
    })) as unknown as typeof generateText;

    const result = await extractPatientAutofillFromPdf(
      ctx.db,
      new Uint8Array([1, 2, 3]),
      "application/pdf",
      { extractFn: fakeExtract, generateTextFn: fakeGenerateText }
    );

    expect(result.fields).toMatchObject({
      firstName: "Ana",
      lastName1: "Rojas",
      primaryDocumentNumber: "99",
      primaryDocumentType: "CC",
    });
    expect(result.fieldConfidence.firstName).toBe(0.95);
    expect(result.warnings).toEqual(["Revisar contra documento original."]);
  });

  test("uses evidence fallback when fields are empty", async () => {
    const ctx = createTestContext();
    const fakeExtract = mock(async () => ({
      pdfTotalPages: 2,
      text: "Sofía Isabel Medina López CC 1050000004, nacida 2019-02-14, sexo femenino, Jamundí Valle del Cauca.",
    }));
    const fakeGenerateText = mock(async () => ({
      text: "fake",
      output: {
        documentKind: null,
        summary: "",
        fields: {
          birthDate: null,
          countryCode: null,
          deceasedAt: null,
          firstName: null,
          genderIdentity: null,
          lastName1: null,
          lastName2: null,
          middleName: null,
          municipalityCode: null,
          primaryDocumentNumber: null,
          primaryDocumentType: null,
          sexAtBirth: null,
          zoneCode: null,
        },
        fieldConfidence: {
          ...emptyFieldConfidence,
          birthDate: 1,
          countryCode: 0.9,
          deceasedAt: 0,
          firstName: 1,
          genderIdentity: 0,
          municipalityCode: 0.95,
          primaryDocumentNumber: 1,
          primaryDocumentType: 1,
          sexAtBirth: 1,
        },
        fieldEvidence: {
          ...emptyFieldEvidence,
          birthDate: "Fecha de nacimiento: 2019-02-14",
          countryCode:
            "Dirección: Jamundí, Valle del Cauca (Colombia implícita por contexto HCE colombiana y EPS colombiana)",
          firstName: "Nombre completo: Sofía Isabel Medina López",
          municipalityCode: "Dirección: Jamundí, Valle del Cauca",
          primaryDocumentNumber: "Documento: CC 1050000004",
          primaryDocumentType: "Documento: CC 1050000004",
          sexAtBirth: "Sexo: Femenino",
        },
        locationHints: { countryName: null, municipalityName: null },
        warnings: [],
      },
    })) as unknown as typeof generateText;

    const result = await extractPatientAutofillFromPdf(
      ctx.db,
      new Uint8Array([1, 2, 3]),
      "application/pdf",
      { extractFn: fakeExtract, generateTextFn: fakeGenerateText }
    );

    expect(result.fields).toMatchObject({
      birthDate: "2019-02-14",
      firstName: "Sofía",
      lastName1: "Medina",
      lastName2: "López",
      middleName: "Isabel",
      primaryDocumentNumber: "1050000004",
      primaryDocumentType: "CC",
      sexAtBirth: "M",
    });
  });

  test("falls back to raw PDF text when model only returns country", async () => {
    const ctx = createTestContext();
    const fakeExtract = mock(async () => ({
      pdfTotalPages: 2,
      text: `Historia clínica
Nombre completo: Sofía Isabel Medina López
Documento: CC 1050000004
Fecha de nacimiento: 2019-02-14
Sexo: Femenino
Dirección: Jamundí, Valle del Cauca`,
    }));
    const fakeGenerateText = mock(async () => ({
      text: "fake",
      output: {
        documentKind: null,
        summary: "",
        fields: {
          birthDate: null,
          countryCode: "170",
          deceasedAt: null,
          firstName: null,
          genderIdentity: null,
          lastName1: null,
          lastName2: null,
          middleName: null,
          municipalityCode: null,
          primaryDocumentNumber: null,
          primaryDocumentType: null,
          sexAtBirth: null,
          zoneCode: null,
        },
        fieldConfidence: {
          countryCode: 0.7,
          deceasedAt: 0,
          municipalityCode: 0,
        },
        fieldEvidence: {
          countryCode:
            "Dirección: Jamundí, Valle del Cauca (Colombia implícita por contexto HCE colombiana)",
        },
        locationHints: { countryName: null, municipalityName: null },
        warnings: [],
      },
    })) as unknown as typeof generateText;

    const result = await extractPatientAutofillFromPdf(
      ctx.db,
      new Uint8Array([1, 2, 3]),
      "application/pdf",
      { extractFn: fakeExtract, generateTextFn: fakeGenerateText }
    );

    expect(result.fields).toMatchObject({
      birthDate: "2019-02-14",
      firstName: "Sofía",
      lastName1: "Medina",
      lastName2: "López",
      middleName: "Isabel",
      primaryDocumentNumber: "1050000004",
      primaryDocumentType: "CC",
      sexAtBirth: "M",
    });
  });

  test("ignores low-confidence values", async () => {
    const ctx = createTestContext();
    const fakeExtract = mock(async () => ({ text: "Nombre ilegible" }));
    const fakeGenerateText = mock(async () => ({
      text: "fake",
      output: {
        documentKind: null,
        summary: "Texto con datos ambiguos.",
        fields: {
          birthDate: null,
          countryCode: null,
          deceasedAt: null,
          firstName: "Juan",
          genderIdentity: null,
          lastName1: null,
          lastName2: null,
          middleName: null,
          municipalityCode: null,
          primaryDocumentNumber: null,
          primaryDocumentType: null,
          sexAtBirth: null,
          zoneCode: null,
        },
        fieldConfidence: { ...emptyFieldConfidence, firstName: 0.3 },
        fieldEvidence: { ...emptyFieldEvidence, firstName: "Nombre ilegible" },
        locationHints: { countryName: null, municipalityName: null },
        warnings: ["El nombre es ambiguo."],
      },
    })) as unknown as typeof generateText;

    const result = await extractPatientAutofillFromPdf(
      ctx.db,
      new Uint8Array([1, 2, 3]),
      "application/pdf",
      { extractFn: fakeExtract, generateTextFn: fakeGenerateText }
    );

    expect(result.fields.firstName).toBeNull();
    expect(result.warnings).toEqual(["El nombre es ambiguo."]);
  });

  test("defaults country to Colombia when not detected", async () => {
    const ctx = createTestContext();
    const fakeExtract = mock(async () => ({ text: "Paciente Ana Rojas" }));
    const fakeGenerateText = mock(async () => ({
      text: "fake",
      output: {
        documentKind: null,
        summary: "Datos mínimos.",
        fields: {
          firstName: "Ana",
          lastName1: "Rojas",
        },
        fieldConfidence: {
          firstName: 0.9,
          lastName1: 0.9,
        },
        fieldEvidence: {},
        locationHints: { countryName: null, municipalityName: null },
        warnings: [],
      },
    })) as unknown as typeof generateText;

    const result = await extractPatientAutofillFromPdf(
      ctx.db,
      new Uint8Array([1, 2, 3]),
      "application/pdf",
      { extractFn: fakeExtract, generateTextFn: fakeGenerateText }
    );

    expect(result.fields.countryCode).toBe("170");
    expect(result.displayLabels.countryCode).toBe("Colombia");
  });

  test("finds municipality from raw PDF text when model omits it", async () => {
    const ctx = createTestContext();
    const fakeExtract = mock(async () => ({
      text: "Paciente: Carlos Martínez. Dirección: Jamundí, Valle del Cauca. CC 123456.",
    }));
    const fakeGenerateText = mock(async () => ({
      text: "fake",
      output: {
        documentKind: null,
        summary: "Datos con dirección.",
        fields: {
          firstName: "Carlos",
          lastName1: "Martínez",
          primaryDocumentNumber: "123456",
          primaryDocumentType: "CC",
        },
        fieldConfidence: {
          firstName: 0.9,
          lastName1: 0.9,
          primaryDocumentNumber: 0.9,
          primaryDocumentType: 0.9,
        },
        fieldEvidence: {},
        locationHints: { countryName: null, municipalityName: null },
        warnings: [],
      },
    })) as unknown as typeof generateText;
    const fakeFindMunicipality = mock(async () => ({
      code: "76364",
      name: "JAMUNDÍ",
    }));

    const result = await extractPatientAutofillFromPdf(
      ctx.db,
      new Uint8Array([1, 2, 3]),
      "application/pdf",
      {
        extractFn: fakeExtract,
        findMunicipalityFn: fakeFindMunicipality,
        generateTextFn: fakeGenerateText,
      }
    );

    expect(result.fields.municipalityCode).toBe("76364");
    expect(result.displayLabels.municipalityCode).toBe("JAMUNDÍ");
    expect(result.fields.countryCode).toBe("170");
    expect(fakeFindMunicipality).toHaveBeenCalled();
  });

  test("overrides model municipality with text-based search when model confuses surname for city", async () => {
    const ctx = createTestContext();
    const fakeExtract = mock(async () => ({
      text: "Nombre completo: Sofía Isabel Medina López\nDocumento: CC 1050000004\nFecha de nacimiento: 2019-02-14\nSexo: Femenino\nDirección: Jamundí, Valle del Cauca",
    }));
    const fakeGenerateText = mock(async () => ({
      text: "fake",
      output: {
        documentKind: "historia_clinica",
        summary: "Historia clínica pediátrica.",
        fields: {
          birthDate: "2019-02-14",
          countryCode: "170",
          deceasedAt: null,
          firstName: "Sofía",
          genderIdentity: null,
          lastName1: "Medina",
          lastName2: "López",
          middleName: "Isabel",
          municipalityCode: "25438",
          primaryDocumentNumber: "1050000004",
          primaryDocumentType: "CC",
          sexAtBirth: "M",
          zoneCode: null,
        },
        fieldConfidence: {
          birthDate: 0.95,
          countryCode: 0.95,
          firstName: 0.95,
          lastName1: 0.95,
          lastName2: 0.95,
          middleName: 0.95,
          municipalityCode: 0.95,
          primaryDocumentNumber: 0.95,
          primaryDocumentType: 0.95,
          sexAtBirth: 0.95,
        },
        fieldEvidence: {
          municipalityCode: "Nombre completo: Sofía Isabel Medina López",
        },
        locationHints: { countryName: null, municipalityName: null },
        warnings: [],
      },
    })) as unknown as typeof generateText;
    const fakeFindMunicipality = mock(async () => ({
      code: "76364",
      name: "JAMUNDÍ",
    }));

    const result = await extractPatientAutofillFromPdf(
      ctx.db,
      new Uint8Array([1, 2, 3]),
      "application/pdf",
      {
        extractFn: fakeExtract,
        findMunicipalityFn: fakeFindMunicipality,
        generateTextFn: fakeGenerateText,
      }
    );

    expect(result.fields.municipalityCode).toBe("76364");
    expect(result.displayLabels.municipalityCode).toBe("JAMUNDÍ");
    expect(fakeFindMunicipality).toHaveBeenCalled();
  });
});
