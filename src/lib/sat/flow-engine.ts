import type { SupabaseClient } from "@supabase/supabase-js";

import { generateStructuredAnswer } from "@/lib/sat/answer";
import { formatStructuredAnswer } from "@/lib/sat/format";
import { getFlowDefinition } from "@/lib/sat/flows";
import { retrieveRelevantChunks } from "@/lib/sat/rag";
import { routeSatQuestion } from "@/lib/sat/router";
import { guardAnswerText } from "@/lib/sat/safety";
import { incrementFlowUsage } from "@/lib/sat/usage";
import type {
  FlowDefinition,
  FlowQuestion,
  FlowStateResult,
  StructuredAnswer,
} from "@/lib/sat/types";
import { saveMessage } from "@/lib/sat/store";

export type FlowProgressionInput = {
  questions: FlowQuestion[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  questionId: string;
  answer: string;
};

export type FlowProgressionResult = {
  status: "in_progress" | "completed";
  nextQuestionIndex: number;
  answers: Record<string, string>;
  nextQuestion?: FlowQuestion;
};

export function progressFlowState(
  input: FlowProgressionInput,
): FlowProgressionResult {
  const expectedQuestion = input.questions[input.currentQuestionIndex];
  if (!expectedQuestion) {
    return {
      status: "completed",
      nextQuestionIndex: input.currentQuestionIndex,
      answers: input.answers,
    };
  }

  const normalizedQuestionId = input.questionId || expectedQuestion.id;
  const updatedAnswers = {
    ...input.answers,
    [normalizedQuestionId]: input.answer,
  };

  const nextQuestionIndex = input.currentQuestionIndex + 1;
  const nextQuestion = input.questions[nextQuestionIndex];

  if (!nextQuestion) {
    return {
      status: "completed",
      nextQuestionIndex,
      answers: updatedAnswers,
    };
  }

  return {
    status: "in_progress",
    nextQuestionIndex,
    answers: updatedAnswers,
    nextQuestion,
  };
}

async function loadFlowDefinition(
  supabase: SupabaseClient,
  flowId: string,
): Promise<FlowDefinition | null> {
  const { data, error } = await supabase
    .from("flows")
    .select("id,questions_json")
    .eq("id", flowId)
    .maybeSingle();

  if (!error && data?.questions_json) {
    return {
      id: data.id,
      questions: data.questions_json as FlowQuestion[],
    } as FlowDefinition;
  }

  return getFlowDefinition(flowId);
}

async function buildFlowFinalAnswer(
  supabase: SupabaseClient,
  flowId: string,
  answers: Record<string, string>,
): Promise<StructuredAnswer> {
  const summary = `Flujo ${flowId} con respuestas: ${Object.entries(answers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ")}`;

  const router = await routeSatQuestion(summary);
  const ragQuery = [...router.ragQueries, summary].join(" ");
  const chunks = await retrieveRelevantChunks(supabase, ragQuery, router.topic, 5);

  return generateStructuredAnswer(summary, chunks, router);
}

export async function startFlowRun(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  flowId: string,
): Promise<FlowStateResult> {
  const flow = await loadFlowDefinition(supabase, flowId);
  if (!flow) {
    throw new Error(`Flow ${flowId} is not configured`);
  }

  const { data: existingRun, error: existingError } = await supabase
    .from("flow_runs")
    .select("id,current_question_index")
    .eq("session_id", sessionId)
    .eq("flow_id", flowId)
    .eq("status", "in_progress")
    .maybeSingle();

  if (existingError) {
    throw new Error(`Could not query active flow run: ${existingError.message}`);
  }

  if (!existingRun) {
    const { error: insertError } = await supabase.from("flow_runs").insert({
      user_id: userId,
      session_id: sessionId,
      flow_id: flowId,
      status: "in_progress",
      current_question_index: 0,
      answers_json: {},
    });

    if (insertError) {
      throw new Error(`Could not start flow run: ${insertError.message}`);
    }

    await saveMessage(
      supabase,
      sessionId,
      "system",
      `Flow ${flowId} iniciado`,
      {
        flow_id: flowId,
      },
    );
  }

  const questionIndex = existingRun?.current_question_index ?? 0;
  const nextQuestion = flow.questions[questionIndex];

  return {
    status: "in_progress",
    nextQuestion,
  };
}

export async function answerFlowRun(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  flowId: string,
  questionId: string,
  answer: string,
): Promise<FlowStateResult> {
  const flow = await loadFlowDefinition(supabase, flowId);
  if (!flow) {
    throw new Error(`Flow ${flowId} is not configured`);
  }

  const { data: run, error: runError } = await supabase
    .from("flow_runs")
    .select("id,current_question_index,answers_json")
    .eq("session_id", sessionId)
    .eq("flow_id", flowId)
    .eq("status", "in_progress")
    .maybeSingle();

  if (runError) {
    throw new Error(`Could not query flow run: ${runError.message}`);
  }

  if (!run) {
    throw new Error(`No active flow run for ${flowId}`);
  }

  await saveMessage(supabase, sessionId, "user", answer, {
    flow_id: flowId,
    question_id: questionId,
  });

  const progression = progressFlowState({
    questions: flow.questions,
    currentQuestionIndex: run.current_question_index as number,
    answers: (run.answers_json as Record<string, string>) ?? {},
    questionId,
    answer,
  });

  if (progression.status === "in_progress") {
    const { error: updateError } = await supabase
      .from("flow_runs")
      .update({
        current_question_index: progression.nextQuestionIndex,
        answers_json: progression.answers,
      })
      .eq("id", run.id);

    if (updateError) {
      throw new Error(`Could not update flow run: ${updateError.message}`);
    }

    return {
      status: "in_progress",
      nextQuestion: progression.nextQuestion,
    };
  }

  const structuredAnswer = await buildFlowFinalAnswer(
    supabase,
    flowId,
    progression.answers,
  );

  const finalText = await guardAnswerText(formatStructuredAnswer(structuredAnswer));

  await saveMessage(supabase, sessionId, "assistant", finalText, {
    flow_id: flowId,
    completed: true,
  });

  const { error: completeError } = await supabase
    .from("flow_runs")
    .update({
      status: "completed",
      answers_json: progression.answers,
      current_question_index: progression.nextQuestionIndex,
    })
    .eq("id", run.id);

  if (completeError) {
    throw new Error(`Could not complete flow run: ${completeError.message}`);
  }

  await incrementFlowUsage(supabase, userId);

  return {
    status: "completed",
    answer: structuredAnswer,
  };
}
