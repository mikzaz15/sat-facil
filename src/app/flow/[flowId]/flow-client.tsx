"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  getOrCreateLocalSessionId,
  getOrCreateLocalUserId,
  setCurrentSessionId,
} from "@/lib/sat/client";

type FlowClientProps = {
  flowId: string;
};

type FlowQuestion = {
  id: string;
  label: string;
};

type StructuredAnswer = {
  summary: string;
  steps: string[];
  confidence: string;
  sources: Array<{ title: string; url: string }>;
  disclaimer: string;
  legalAlert?: string;
};

export default function FlowClient({ flowId }: FlowClientProps) {
  const [userId, setUserId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [question, setQuestion] = useState<FlowQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState<StructuredAnswer | null>(null);
  const [error, setError] = useState("");

  const title = useMemo(() => {
    switch (flowId) {
      case "FACTURAR":
        return "Flujo Facturar";
      case "RESICO":
        return "Flujo RESICO";
      case "BUZON":
        return "Flujo Buzón";
      case "DEVOLUCION":
        return "Flujo Devolución";
      default:
        return `Flujo ${flowId}`;
    }
  }, [flowId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUserId(getOrCreateLocalUserId());
      setSessionId(getOrCreateLocalSessionId());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const start = async () => {
      if (!userId || !sessionId) {
        return;
      }

      const response = await fetch("/api/flow/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          session_id: sessionId,
          flow_id: flowId,
          channel: "web",
        }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        data?: { session_id: string; nextQuestion?: FlowQuestion };
        error?: string;
      };

      if (!payload.ok || !payload.data?.nextQuestion) {
        setError(payload.error ?? "No pude iniciar el flujo.");
        setLoading(false);
        return;
      }

      const newSessionId = payload.data.session_id;
      if (newSessionId) {
        setSessionId(newSessionId);
        setCurrentSessionId(newSessionId);
      }

      setQuestion(payload.data.nextQuestion);
      setLoading(false);
    };

    void start();
  }, [flowId, userId, sessionId]);

  const submitAnswer = async () => {
    if (!question || !answer.trim() || loading) {
      return;
    }

    setLoading(true);
    setError("");

    const response = await fetch("/api/flow/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        session_id: sessionId,
        flow_id: flowId,
        question_id: question.id,
        answer,
        channel: "web",
      }),
    });

    const payload = (await response.json()) as {
      ok: boolean;
      data?: {
        status: "in_progress" | "completed";
        nextQuestion?: FlowQuestion;
        answer?: StructuredAnswer;
      };
      error?: string;
    };

    if (!payload.ok || !payload.data) {
      setError(payload.error ?? "No pude procesar tu respuesta.");
      setLoading(false);
      return;
    }

    if (payload.data.status === "in_progress") {
      setQuestion(payload.data.nextQuestion ?? null);
      setAnswer("");
      setLoading(false);
      return;
    }

    setDone(payload.data.answer ?? null);
    setQuestion(null);
    setAnswer("");
    setLoading(false);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 px-4 py-6">
      <header className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        <Link href="/" className="text-xs font-medium text-sky-700 hover:text-sky-800">
          ← Inicio
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-700">
          Responde 3-6 preguntas y recibirás pasos con nivel de confianza y
          fuentes.
        </p>
      </header>

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {done ? (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Resultado</h2>
          <p className="text-sm text-slate-800">{done.summary}</p>
          {done.legalAlert ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {done.legalAlert}
            </p>
          ) : null}
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-800">
            {done.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="text-sm font-medium text-slate-900">
            Nivel de confianza: {done.confidence}
          </p>
          {done.sources.length > 0 ? (
            <ul className="space-y-1 text-xs text-slate-700">
              {done.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-700 hover:text-sky-800"
                  >
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Sin fuentes disponibles.</p>
          )}
          <p className="text-xs text-slate-600">{done.disclaimer}</p>
        </section>
      ) : (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-900">
            {question?.label ?? "Cargando pregunta..."}
          </p>
          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            className="h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-200 focus:ring"
            placeholder="Escribe tu respuesta"
          />
          <button
            type="button"
            onClick={() => void submitAnswer()}
            disabled={loading || !question}
            className="w-full rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "Enviando..." : "Siguiente"}
          </button>
        </section>
      )}
    </main>
  );
}
