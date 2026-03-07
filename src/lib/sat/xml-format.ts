export const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';

export function formatCorrectedXmlOutput(xmlText: string): string {
  const withoutDeclaration = xmlText
    .replace(/^\s*<\?xml[\s\S]*?\?>\s*/i, "")
    .trim();
  if (!withoutDeclaration) return "";

  // Only normalize whitespace between tags to keep namespaces/attributes intact.
  const normalizedXml = withoutDeclaration.replace(/>\s+</g, "><");
  const lines = normalizedXml
    .replace(/(>)(<)(\/*)/g, "$1\n$2$3")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  const formatted: string[] = [];
  let indentLevel = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const isClosingTag = /^<\/[^>]+>$/.test(line);
    const isSelfClosingTag = /^<[^!?][^>]*\/>$/.test(line);
    const isOpenTag = /^<[^!?/][^>]*>$/.test(line);
    const isInlineTag = /^<[^!?/][^>]*>.*<\/[^>]+>$/.test(line);

    if (isClosingTag) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    formatted.push(`${"  ".repeat(indentLevel)}${line}`);

    if (isOpenTag && !isSelfClosingTag && !isInlineTag) {
      indentLevel += 1;
    }
  }

  return `${XML_DECLARATION}\n${formatted.join("\n")}`;
}
