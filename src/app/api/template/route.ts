import { NextResponse } from "next/server";

import { buildTemplateResponse } from "@/lib/sat/brain";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      case_summary?: string;
      template_type?: string;
    };

    if (!body.case_summary || !body.template_type) {
      return NextResponse.json(
        { ok: false, error: "case_summary y template_type son obligatorios" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: buildTemplateResponse(body.case_summary, body.template_type),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
