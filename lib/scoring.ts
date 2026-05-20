import { QuestionType, type Prisma, type Question, type Response, type SubTest, type Test } from "@prisma/client";
import { mcqOptionSchema, scaleOptionsSchema, scoringConfigSchema } from "@/lib/validation";

type QuestionWithSubtest = Question & { subTest: SubTest };
type ResponseInput = Pick<Response, "questionId" | "answer" | "manualScore" | "llmScore" | "autoScore">;

export interface ResultPayload {
  totalScore: number | null;
  subtestScores: Record<string, number>;
  dimensionMap: Record<string, number>;
  profile: string | null;
  profileLabel: string | null;
  isPassed: boolean | null;
}

export interface ScoredResponse {
  questionId: string;
  autoScore: number | null;
  finalScore: number | null;
}

export interface ScoringOutput {
  result: ResultPayload;
  responses: ScoredResponse[];
}

function normalizeVarName(label: string): string {
  return label.replace(/[^A-Za-z0-9_$]/g, "_");
}

function evaluateExpression(expression: string, variables: Record<string, number>): number | boolean | null {
  const names = Object.keys(variables);
  const invalidIdentifiers = names.filter((name) => !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name));
  if (invalidIdentifiers.length > 0) {
    return null;
  }
  if (!/^[\d\s+\-*/().<>=!&|_$A-Za-z]+$/.test(expression)) {
    return null;
  }
  const fn = new Function(...names, `"use strict"; return (${expression});`) as (...args: number[]) => unknown;
  const result = fn(...names.map((name) => variables[name] ?? 0));
  if (typeof result === "number" && Number.isFinite(result)) {
    return result;
  }
  if (typeof result === "boolean") {
    return result;
  }
  return null;
}

function optionValue(question: Question, answer: string): number | null {
  const parsed = mcqOptionSchema.array().safeParse(question.options);
  if (!parsed.success) {
    return null;
  }
  const selected = parsed.data.find((item) => item.id === answer);
  return selected?.value ?? null;
}

function autoScoreQuestion(question: Question, answer: string): number | null {
  if (question.type === QuestionType.ESSAY || question.type === QuestionType.OPEN) {
    return null;
  }
  if (question.type === QuestionType.MCQ || question.type === QuestionType.TRUE_FALSE) {
    return question.correctAnswer && answer === question.correctAnswer ? question.weight : 0;
  }
  if (question.type === QuestionType.SCALE) {
    const parsed = scaleOptionsSchema.safeParse(question.options);
    const numeric = Number(answer);
    if (!parsed.success || !Number.isFinite(numeric)) {
      return null;
    }
    return numeric * question.weight;
  }
  if (question.type === QuestionType.RANKING) {
    return optionValue(question, answer) ?? null;
  }
  return null;
}

function finalScore(response: ResponseInput, autoScore: number | null): number | null {
  return response.manualScore ?? response.llmScore ?? autoScore;
}

function scoreSubtest(subTest: SubTest, questions: Question[], responses: Map<string, ResponseInput>) {
  const config = scoringConfigSchema.parse(subTest.scoringConfig);
  const strategy = config.strategy ?? "correct_count";
  const dimensionMap: Record<string, number> = {};
  const resolvedScores = questions.map((question) => {
    const response = responses.get(question.id);
    const autoScore = response ? autoScoreQuestion(question, response.answer) : null;
    const resolved = response ? finalScore(response, autoScore) : null;
    if (question.dimension && resolved !== null) {
      dimensionMap[question.dimension] = (dimensionMap[question.dimension] ?? 0) + resolved;
    }
    return { question, autoScore, finalScore: resolved };
  });

  if (strategy === "average_scale") {
    const scaleScores = resolvedScores
      .filter((item) => item.question.type === QuestionType.SCALE)
      .map((item) => item.finalScore)
      .filter((score): score is number => score !== null);
    const score = scaleScores.length > 0 ? scaleScores.reduce((sum, value) => sum + value, 0) / scaleScores.length : 0;
    return { score, dimensionMap, resolvedScores };
  }

  if (strategy === "custom_formula" && config.formula) {
    const evaluated = evaluateExpression(config.formula, dimensionMap);
    const score = typeof evaluated === "number" ? evaluated : 0;
    return { score, dimensionMap, resolvedScores };
  }

  const score = resolvedScores.reduce((sum, item) => sum + (item.finalScore ?? 0), 0);
  return { score, dimensionMap, resolvedScores };
}

export function scoreAttempt(
  test: Test,
  enabledSubtests: SubTest[],
  questions: QuestionWithSubtest[],
  responseInputs: ResponseInput[],
): ScoringOutput {
  const responses = new Map(responseInputs.map((response) => [response.questionId, response]));
  const subtestScores: Record<string, number> = {};
  const dimensionMap: Record<string, number> = {};
  const scoredResponses: ScoredResponse[] = [];

  for (const subTest of enabledSubtests) {
    const subtestQuestions = questions.filter((question) => question.subTestId === subTest.id);
    const scored = scoreSubtest(subTest, subtestQuestions, responses);
    const key = normalizeVarName(subTest.title);
    subtestScores[key] = scored.score;
    Object.entries(scored.dimensionMap).forEach(([dimension, score]) => {
      dimensionMap[dimension] = (dimensionMap[dimension] ?? 0) + score;
    });
    scored.resolvedScores.forEach((item) => {
      scoredResponses.push({ questionId: item.question.id, autoScore: item.autoScore, finalScore: item.finalScore });
    });
  }

  const testConfig = scoringConfigSchema.parse(test.scoringConfig);
  const variables = { ...subtestScores, ...dimensionMap };
  const evaluatedTotal = testConfig.compositeFormula ? evaluateExpression(testConfig.compositeFormula, variables) : Object.values(subtestScores).reduce((sum, score) => sum + score, 0);
  const totalScore = typeof evaluatedTotal === "number" ? evaluatedTotal : null;
  const mappingVars = { ...variables, totalScore: totalScore ?? 0 };
  const mapping = testConfig.profileMappings?.find((item) => evaluateExpression(item.condition, mappingVars) === true);
  const isPassed = test.passingThreshold === null || totalScore === null ? null : totalScore >= test.passingThreshold;

  return {
    result: {
      totalScore,
      subtestScores,
      dimensionMap,
      profile: mapping?.label ?? null,
      profileLabel: mapping?.description ?? mapping?.label ?? null,
      isPassed,
    },
    responses: scoredResponses,
  };
}

export function jsonObject(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
