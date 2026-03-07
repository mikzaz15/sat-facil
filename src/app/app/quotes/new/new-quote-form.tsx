"use client";

import { useMemo, useState } from "react";

type NewQuoteFormProps = {
  action: (formData: FormData) => void;
  error?: string;
};

type LineItem = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
};

function createItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    qty: 1,
    unitPrice: 0,
  };
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function NewQuoteForm({ action, error }: NewQuoteFormProps) {
  const [lineItems, setLineItems] = useState<LineItem[]>([createItem()]);
  const [taxPercent, setTaxPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [depositPercent, setDepositPercent] = useState(50);

  const calculations = useMemo(() => {
    const subtotal = roundMoney(
      lineItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
    );
    const tax = roundMoney((subtotal * Math.max(0, taxPercent)) / 100);
    const total = roundMoney(Math.max(0, subtotal + tax - Math.max(0, discountAmount)));
    return { subtotal, tax, total };
  }, [discountAmount, lineItems, taxPercent]);

  const serializedItems = JSON.stringify(
    lineItems.map((item) => ({
      name: item.name,
      qty: item.qty,
      unit_price: item.unitPrice,
    })),
  );

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="line_items_json" value={serializedItems} />
      <input type="hidden" name="tax_percent" value={String(taxPercent)} />
      <input
        type="hidden"
        name="discount_amount"
        value={String(discountAmount)}
      />
      <input
        type="hidden"
        name="deposit_percent"
        value={String(depositPercent)}
      />

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Cliente</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="client_name"
              className="block text-sm font-medium text-slate-700"
            >
              Nombre
            </label>
            <input
              id="client_name"
              name="client_name"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div>
            <label
              htmlFor="client_email"
              className="block text-sm font-medium text-slate-700"
            >
              Correo electrónico
            </label>
            <input
              id="client_email"
              name="client_email"
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div>
            <label
              htmlFor="client_phone"
              className="block text-sm font-medium text-slate-700"
            >
              Teléfono
            </label>
            <input
              id="client_phone"
              name="client_phone"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="client_company"
              className="block text-sm font-medium text-slate-700"
            >
              Empresa
            </label>
            <input
              id="client_company"
              name="client_company"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Conceptos</h2>
          <button
            type="button"
            onClick={() => setLineItems((prev) => [...prev, createItem()])}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Agregar fila
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left">
            <thead className="text-xs uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="pb-2 font-medium">Nombre</th>
                <th className="pb-2 font-medium">Cantidad</th>
                <th className="pb-2 font-medium">Precio unitario</th>
                <th className="pb-2 font-medium">Total de línea</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lineItems.map((item) => {
                const lineTotal = roundMoney(item.qty * item.unitPrice);
                return (
                  <tr key={item.id}>
                    <td className="py-2 pr-3">
                      <input
                        value={item.name}
                        onChange={(event) =>
                          setLineItems((prev) =>
                            prev.map((current) =>
                              current.id === item.id
                                ? { ...current, name: event.target.value }
                                : current,
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        placeholder="Paquete de diseño"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={item.qty}
                        onChange={(event) =>
                          setLineItems((prev) =>
                            prev.map((current) =>
                              current.id === item.id
                                ? {
                                    ...current,
                                    qty: Math.max(1, Number(event.target.value)),
                                  }
                                : current,
                            ),
                          )
                        }
                        className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        onChange={(event) =>
                          setLineItems((prev) =>
                            prev.map((current) =>
                              current.id === item.id
                                ? {
                                    ...current,
                                    unitPrice: Math.max(
                                      0,
                                      Number(event.target.value),
                                    ),
                                  }
                                : current,
                            ),
                          )
                        }
                        className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </td>
                    <td className="py-2 pr-3 text-sm text-slate-700">
                      {formatMoney(lineTotal)}
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        disabled={lineItems.length === 1}
                        onClick={() =>
                          setLineItems((prev) =>
                            prev.length > 1
                              ? prev.filter((current) => current.id !== item.id)
                              : prev,
                          )
                        }
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Precios</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="tax_percent_ui"
              className="block text-sm font-medium text-slate-700"
            >
              Porcentaje de impuesto
            </label>
            <input
              id="tax_percent_ui"
              type="number"
              min={0}
              step={0.01}
              value={taxPercent}
              onChange={(event) => setTaxPercent(Math.max(0, Number(event.target.value)))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label
              htmlFor="discount_amount_ui"
              className="block text-sm font-medium text-slate-700"
            >
              Monto de descuento
            </label>
            <input
              id="discount_amount_ui"
              type="number"
              min={0}
              step={0.01}
              value={discountAmount}
              onChange={(event) =>
                setDiscountAmount(Math.max(0, Number(event.target.value)))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label
              htmlFor="deposit_percent_ui"
              className="block text-sm font-medium text-slate-700"
            >
              Porcentaje de anticipo
            </label>
            <input
              id="deposit_percent_ui"
              type="number"
              min={0}
              max={100}
              step={1}
              value={depositPercent}
              onChange={(event) =>
                setDepositPercent(
                  Math.min(100, Math.max(0, Number(event.target.value))),
                )
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <div className="mt-5 grid max-w-sm gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span className="font-medium">{formatMoney(calculations.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Impuesto</span>
            <span className="font-medium">{formatMoney(calculations.tax)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base">
            <span className="font-semibold text-slate-900">Total</span>
            <span className="font-semibold text-slate-900">
              {formatMoney(calculations.total)}
            </span>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Guardar cotización
        </button>
      </div>
    </form>
  );
}
