import { z } from "zod";

export const mcqOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number().optional(),
  dimension: z.string().optional(),
});

export const scaleOptionsSchema = z.object({
  min: z.number(),
  max: z.number(),
  minLabel: z.string(),
  maxLabel: z.string(),
});

export const scoringConfigSchema = z
  .object({
    strategy: z.enum(["correct_count", "sum_by_dimension", "average_scale", "weighted_sum", "custom_formula"]).optional(),
    formula: z.string().optional(),
    dimensionMap: z.record(z.string()).optional(),
    compositeFormula: z.string().optional(),
    profileMappings: z
      .array(
        z.object({
          condition: z.string(),
          label: z.string(),
          description: z.string(),
        }),
      )
      .optional(),
    autoLlmReview: z.boolean().optional(),
  })
  .passthrough();

export const answerPayloadSchema = z.object({
  attemptId: z.string(),
  answers: z.record(z.string()),
});

export const startAttemptSchema = z.object({
  code: z.string().trim().min(6).max(6),
  candidateName: z.string().trim().min(1).optional(),
  candidateEmail: z.string().trim().email().optional(),
  position: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

export const proctorLogSchema = z.object({
  attemptId: z.string(),
  event: z.enum(["TAB_SWITCH", "FOCUS_LOSS", "FULLSCREEN_EXIT", "SNAPSHOT"]),
  metadata: z.record(z.unknown()).optional(),
});
