"use client";

import { create } from "zustand";
import type { ProctoringEvent } from "@prisma/client";

interface TestStore {
  attemptId: string | null;
  currentSubtestIndex: number;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  startedAt: Date | null;
  violations: ProctoringEvent[];
  isSubmitted: boolean;
  setAttempt: (attemptId: string) => void;
  setAnswer: (questionId: string, answer: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  addViolation: (event: ProctoringEvent) => void;
  submit: () => Promise<void>;
}

export const useTestStore = create<TestStore>((set, get) => ({
  attemptId: null,
  currentSubtestIndex: 0,
  currentQuestionIndex: 0,
  answers: {},
  startedAt: null,
  violations: [],
  isSubmitted: false,
  setAttempt: (attemptId) => set({ attemptId, startedAt: new Date(), isSubmitted: false }),
  setAnswer: (questionId, answer) => set((state) => ({ answers: { ...state.answers, [questionId]: answer } })),
  nextQuestion: () => set((state) => ({ currentQuestionIndex: state.currentQuestionIndex + 1 })),
  prevQuestion: () => set((state) => ({ currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1) })),
  addViolation: (event) => set((state) => ({ violations: [...state.violations, event] })),
  submit: async () => {
    const { attemptId, answers } = get();
    if (!attemptId) {
      throw new Error("Cannot submit without an attempt.");
    }
    await fetch("/api/attempts/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attemptId, answers }),
    });
    set({ isSubmitted: true });
  },
}));
