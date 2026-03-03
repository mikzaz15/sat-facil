"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getOrCreateLocalSessionId,
  getOrCreateLocalUserId,
  setCurrentSessionId,
} from "@/lib/sat/client";

type UiMessage = {
  id: string;
  role: string;
  content: string;
};

type HistoryItem = {
  id: string;
  topic: string | null;
  created_at: string;
  last_message: string;
};

type ChatClientProps = {
  initialQuestion: string;
};

export default function ChatClient({ initialQuestion }: ChatClientProps) {
  const [userId, setUserId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [input, setInput] = useState(initialQuestion);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const quickActions = ["Dame pasos", "Haz checklist", "Genera mensaje"];

  const loadHistory = useCallback(async (uid: string) => {
    const response = await fetch(`/api/history?user_id=${uid}`);
    const payload = (await response.json()) as {
      ok: boolean;
      data: HistoryItem[];
    };

    if (payload.ok) {
      setHistory(payload.data ?? []);
    }
  }, []);

  const loadMessages = useCallback(async (sid: string) => {
    const response = await fetch(`/api/history/${sid}`);
    const payload = (await response.json()) as {
      ok: boolean;
      data: Array<{ id: string; role: string; content: string }>;
    };

    if (!payload.ok) {
      return;
    }

    setMessages(
      (payload.data ?? []).map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
      })),
    );
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUserId(getOrCreateLocalUserId());
      setSessionId(getOrCreateLocalSessionId());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!userId || !sessionId) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadHistory(userId);
      void loadMessages(sessionId);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [userId, sessionId, loadHistory, loadMessages]);

  const sendMessage = useCallback(
    async (rawMessage?: string) => {
      const message = (rawMessage ?? input).trim();
      if (!message || !userId || !sessionId || loading) {
        return;
      }

      setLoading(true);
      setInput("");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: message,
        },
      ]);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          session_id: sessionId,
          channel: "web",
          message,
        }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        data?: {
          text: string;
          sessionId: string;
        };
        error?: string;
      };

      if (payload.ok && payload.data) {
        const sid = payload.data.sessionId;
        if (sid && sid !== sessionId) {
          setSessionId(sid);
          setCurrentSessionId(sid);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: payload.data?.text ?? "",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `No pude procesar tu solicitud. ${payload.error ?? ""}`.trim(),
          },
        ]);
      }

      setLoading(false);
      void loadHistory(userId);
    },
    [input, userId, sessionId, loading, loadHistory],
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 px-4 py-4">
      <header className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-semibold text-slate-900">Chat SAT Fácil</h1>
        <p className="text-xs text-slate-700">
          Orientación educativa con fuentes SAT/gob.mx y nivel de confianza.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-xs font-medium text-slate-700">Acciones rápidas</p>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => void sendMessage(action)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-slate-50"
            >
              {action}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
          <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-500">
                Escribe una pregunta para empezar.
              </p>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`rounded-md px-3 py-2 text-sm whitespace-pre-wrap ${
                    message.role === "user"
                      ? "bg-sky-50 text-sky-950"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  {message.content}
                </article>
              ))
            )}
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Escribe tu duda fiscal..."
              className="h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-200 focus:ring"
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={loading}
              className="w-full rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-medium text-slate-700">Últimas 10 sesiones</p>
          <div className="space-y-2">
            {history.length === 0 ? (
              <p className="text-xs text-slate-500">Sin sesiones todavía.</p>
            ) : (
              history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSessionId(item.id);
                    setCurrentSessionId(item.id);
                    void loadMessages(item.id);
                  }}
                  className="w-full rounded-md border border-slate-300 p-2 text-left hover:bg-slate-50"
                >
                  <p className="text-xs font-medium text-slate-900">
                    {item.topic ?? "OTRO"}
                  </p>
                  <p className="line-clamp-2 text-xs text-slate-600">
                    {item.last_message || "Sin mensajes"}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
