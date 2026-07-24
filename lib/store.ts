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
  goToQuestionIndex: (index: number) => void;
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
  setAnswer: (questionId, answer) => {
    set((state) => {
      const nextAnswers = { ...state.answers, [questionId]: answer };
      const attemptId = state.attemptId;
      
      // Fire and forget autosave
      if (attemptId) {
        // Simple debounce using a global timeout (ok for singleton store)
        clearTimeout((window as any).__autosaveTimeout);
        (window as any).__autosaveTimeout = setTimeout(() => {
          fetch("/api/attempts/autosave", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ attemptId, answers: nextAnswers }),
          }).catch(console.error);
        }, 1500);
      }
      
      return { answers: nextAnswers };
    });
  },
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
  goToQuestionIndex: (index) => set({ currentQuestionIndex: index }),
}));
