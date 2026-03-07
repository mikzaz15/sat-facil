import { describe, expect, it } from "vitest";

import { XML_DECLARATION, formatCorrectedXmlOutput } from "../src/lib/sat/xml-format";

describe("formatCorrectedXmlOutput", () => {
  it("pretty-prints XML and preserves declaration, namespaces, and attributes", () => {
    const compactXml =
      '<?xml version="1.0" encoding="UTF-8"?><cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Version="4.0" MetodoPago="PUE" FormaPago="03"><cfdi:Emisor Rfc="AAA010101AAA"/><cfdi:Receptor Rfc="XAXX010101000" UsoCFDI="G03"/></cfdi:Comprobante>';

    const formatted = formatCorrectedXmlOutput(compactXml);

    expect(formatted.startsWith(`${XML_DECLARATION}\n`)).toBe(true);
    expect(formatted.includes('xmlns:cfdi="http://www.sat.gob.mx/cfd/4"')).toBe(true);
    expect(
      formatted.includes('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'),
    ).toBe(true);
    expect(formatted.includes('MetodoPago="PUE"')).toBe(true);
    expect(formatted.includes('FormaPago="03"')).toBe(true);
    expect(formatted.includes("\n<cfdi:Comprobante")).toBe(true);
    expect(formatted.includes("\n  <cfdi:Emisor")).toBe(true);
    expect(formatted.includes("\n  <cfdi:Receptor")).toBe(true);
    expect(formatted.includes("\n</cfdi:Comprobante>")).toBe(true);
  });

  it("returns empty string for empty input", () => {
    expect(formatCorrectedXmlOutput("   ")).toBe("");
  });
});
