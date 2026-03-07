"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import { getCurrentUserWorkspace } from "@/lib/workspace";

type RawItem = {
  name?: string;
  qty?: number | string;
  unit_price?: number | string;
};

type LineItem = {
  name: string;
  qty: number;
  unit_price: number;
};

function parseNumber(value: FormDataEntryValue | null, fallback = 0) {
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeLineItems(rawJson: FormDataEntryValue | null) {
  if (typeof rawJson !== "string" || rawJson.trim() === "") {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error("Payload de conceptos inválido.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Payload de conceptos inválido.");
  }

  const normalized = parsed
    .map((item) => {
      const raw = item as RawItem;
      return {
        name: typeof raw.name === "string" ? raw.name.trim() : "",
        qty: Number(raw.qty),
        unit_price: Number(raw.unit_price),
      };
    })
    .filter((item) => item.name && item.qty > 0 && item.unit_price >= 0);

  return normalized as LineItem[];
}

function createQuoteToken() {
  return randomBytes(24).toString("hex");
}

export async function createQuoteAction(formData: FormData) {
  const clientName = formData.get("client_name");
  const clientEmailRaw = formData.get("client_email");
  const clientPhone = formData.get("client_phone");
  const clientCompany = formData.get("client_company");
  const taxPercent = parseNumber(formData.get("tax_percent"), 0);
  const discountAmount = parseNumber(formData.get("discount_amount"), 0);
  const depositPercent = parseNumber(formData.get("deposit_percent"), 50);

  if (typeof clientName !== "string" || clientName.trim() === "") {
    redirect("/app/quotes/new?error=El+nombre+del+cliente+es+obligatorio.");
  }

  const lineItems = normalizeLineItems(formData.get("line_items_json"));
  if (lineItems.length === 0) {
    redirect("/app/quotes/new?error=Agrega+al+menos+un+concepto.");
  }

  const normalizedTaxPercent = Math.max(0, taxPercent);
  const normalizedDiscount = Math.max(0, discountAmount);
  const normalizedDepositPercent = Math.min(100, Math.max(0, depositPercent));

  const subtotal = roundMoney(
    lineItems.reduce((sum, item) => sum + item.qty * item.unit_price, 0),
  );
  const tax = roundMoney((subtotal * normalizedTaxPercent) / 100);
  const total = roundMoney(Math.max(0, subtotal + tax - normalizedDiscount));

  const clientEmail =
    typeof clientEmailRaw === "string" && clientEmailRaw.trim() !== ""
      ? clientEmailRaw.trim().toLowerCase()
      : null;

  const { workspaceId } = await getCurrentUserWorkspace();
  const supabase = await createSupabaseServerAuthClient();

  let clientId: string;

  if (clientEmail) {
    const { data: existingClients, error: clientLookupError } = await supabase
      .from("clients")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("email", clientEmail)
      .order("created_at", { ascending: false })
      .limit(1);

    if (clientLookupError) {
      redirect(
        `/app/quotes/new?error=${encodeURIComponent(clientLookupError.message)}`,
      );
    }

    if (existingClients && existingClients.length > 0) {
      clientId = existingClients[0].id as string;

      const { error: updateClientError } = await supabase
        .from("clients")
        .update({
          name: clientName.trim(),
          phone: typeof clientPhone === "string" ? clientPhone.trim() : null,
          company:
            typeof clientCompany === "string" ? clientCompany.trim() : null,
        })
        .eq("id", clientId)
        .eq("workspace_id", workspaceId);

      if (updateClientError) {
        redirect(
          `/app/quotes/new?error=${encodeURIComponent(updateClientError.message)}`,
        );
      }
    } else {
      const { data: createdClient, error: createClientError } = await supabase
        .from("clients")
        .insert({
          workspace_id: workspaceId,
          name: clientName.trim(),
          email: clientEmail,
          phone: typeof clientPhone === "string" ? clientPhone.trim() : null,
          company:
            typeof clientCompany === "string" ? clientCompany.trim() : null,
        })
        .select("id")
        .single();

      if (createClientError || !createdClient) {
        redirect(
          `/app/quotes/new?error=${encodeURIComponent(createClientError?.message ?? "No se pudo crear el cliente.")}`,
        );
      }

      clientId = createdClient.id as string;
    }
  } else {
    const { data: createdClient, error: createClientError } = await supabase
      .from("clients")
      .insert({
        workspace_id: workspaceId,
        name: clientName.trim(),
        email: null,
        phone: typeof clientPhone === "string" ? clientPhone.trim() : null,
        company: typeof clientCompany === "string" ? clientCompany.trim() : null,
      })
      .select("id")
      .single();

    if (createClientError || !createdClient) {
      redirect(
        `/app/quotes/new?error=${encodeURIComponent(createClientError?.message ?? "No se pudo crear el cliente.")}`,
      );
    }

    clientId = createdClient.id as string;
  }

  const { data: createdQuote, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      workspace_id: workspaceId,
      client_id: clientId,
      status: "draft",
      token: createQuoteToken(),
      subtotal,
      tax,
      discount: normalizedDiscount,
      total,
      deposit_percent: Math.round(normalizedDepositPercent),
    })
    .select("id")
    .single();

  if (quoteError || !createdQuote) {
    redirect(
      `/app/quotes/new?error=${encodeURIComponent(quoteError?.message ?? "No se pudo crear la cotización.")}`,
    );
  }

  const itemsPayload = lineItems.map((item) => ({
    quote_id: createdQuote.id,
    name: item.name,
    qty: item.qty,
    unit_price: roundMoney(item.unit_price),
  }));

  const { error: itemInsertError } = await supabase
    .from("quote_items")
    .insert(itemsPayload);

  if (itemInsertError) {
    redirect(
      `/app/quotes/new?error=${encodeURIComponent(itemInsertError.message)}`,
    );
  }

  revalidatePath("/app/quotes");
  redirect(`/app/quotes/${createdQuote.id}`);
}
