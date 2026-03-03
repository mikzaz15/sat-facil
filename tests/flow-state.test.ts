import { describe, expect, it } from "vitest";

import { progressFlowState } from "../src/lib/sat/flow-engine";

const questions = [
  { id: "q1", label: "Pregunta 1" },
  { id: "q2", label: "Pregunta 2" },
  { id: "q3", label: "Pregunta 3" },
];

describe("progressFlowState", () => {
  it("moves to next question while flow is in progress", () => {
    const result = progressFlowState({
      questions,
      currentQuestionIndex: 0,
      answers: {},
      questionId: "q1",
      answer: "respuesta 1",
    });

    expect(result.status).toBe("in_progress");
    expect(result.nextQuestion?.id).toBe("q2");
    expect(result.answers.q1).toBe("respuesta 1");
  });

  it("completes when last question is answered", () => {
    const result = progressFlowState({
      questions,
      currentQuestionIndex: 2,
      answers: { q1: "a", q2: "b" },
      questionId: "q3",
      answer: "c",
    });

    expect(result.status).toBe("completed");
    expect(result.nextQuestion).toBeUndefined();
    expect(result.answers.q3).toBe("c");
  });
});
