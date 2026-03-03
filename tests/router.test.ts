import { describe, expect, it } from "vitest";

import { classifyWithHeuristics } from "../src/lib/sat/router";

describe("classifyWithHeuristics", () => {
  it("routes RESICO prompts to RESICO topic", () => {
    const result = classifyWithHeuristics(
      "Estoy en RESICO y quiero saber si puedo quedarme con ingresos mixtos",
    );

    expect(result.topic).toBe("RESICO");
  });

  it("routes multa/requerimiento prompts to BUZON_REQUERIMIENTOS", () => {
    const result = classifyWithHeuristics(
      "Me llegó un requerimiento y posible multa en buzón tributario",
    );

    expect(result.topic).toBe("BUZON_REQUERIMIENTOS");
  });
});
