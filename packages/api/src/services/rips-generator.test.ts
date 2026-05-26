import { describe, expect, it } from "bun:test";
import type { Db } from "../context";
import { generateRipsPayload, RipsGenerationError } from "./rips-generator";

describe("rips generator", () => {
  it("blocks FEV generation without invoice number before reading DB", async () => {
    await expect(
      generateRipsPayload({} as Db, {
        payerId: "test-payer",
        periodFrom: new Date("2026-01-01"),
        periodTo: new Date("2026-01-31"),
        organizationTaxId: "900123456",
        operationType: "FEV_RIPS",
      })
    ).rejects.toBeInstanceOf(RipsGenerationError);
  });

  it("blocks RIPS sin factura without local consecutive before reading DB", async () => {
    await expect(
      generateRipsPayload({} as Db, {
        payerId: "test-payer",
        periodFrom: new Date("2026-01-01"),
        periodTo: new Date("2026-01-31"),
        organizationTaxId: "900123456",
        operationType: "RIPS_SIN_FACTURA",
      })
    ).rejects.toBeInstanceOf(RipsGenerationError);
  });
});
