import { describe, expect, it } from "vitest";
import { generateRipsPayload } from "./rips-generator";
import { createTestContext } from "../test-utils";

describe("rips generator", () => {
  it("generates empty RIPS for period with no encounters", async () => {
    const ctx = await createTestContext();
    const result = await generateRipsPayload(ctx.db, {
      payerId: "test-payer",
      periodFrom: new Date("2000-01-01"),
      periodTo: new Date("2000-01-31"),
      organizationTaxId: "900123456",
    });

    expect(result.numUsers).toBe(0);
    expect(result.totalValue).toBe("0.00");
    expect(result.transaction.usuarios).toHaveLength(0);
    expect(result.transaction.numDocumentoIdObligado).toBe("900123456");
  });
});
