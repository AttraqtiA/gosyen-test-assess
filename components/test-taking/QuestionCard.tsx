"use client";

import type { QuestionType } from "@prisma/client";
import { EssayQuestion } from "@/components/test-taking/question-types/EssayQuestion";
import { MCQQuestion } from "@/components/test-taking/question-types/MCQQuestion";
import { OpenQuestion } from "@/components/test-taking/question-types/OpenQuestion";
import { RankingQuestion } from "@/components/test-taking/question-types/RankingQuestion";
import { ScaleQuestion } from "@/components/test-taking/question-types/ScaleQuestion";
import { TrueFalseQuestion } from "@/components/test-taking/question-types/TrueFalseQuestion";

export type CandidateQuestion = {
  id: string;
  body: string;
  type: QuestionType;
  options: unknown;
};

type Props = {
  question: CandidateQuestion;
  value: string;
  onChange: (value: string) => void;
};

export function QuestionCard({ question, value, onChange }: Props) {
  return (
    <section className="panel grid gap-5 p-5">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{question.type.replace("_", " ")}</div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{question.body}</h2>
      </div>
      {question.type === "MCQ" && <MCQQuestion questionId={question.id} options={question.options} value={value} onChange={onChange} />}
      {question.type === "SCALE" && <ScaleQuestion options={question.options} value={value} onChange={onChange} />}
      {question.type === "ESSAY" && <EssayQuestion value={value} onChange={onChange} />}
      {question.type === "OPEN" && <OpenQuestion value={value} onChange={onChange} />}
      {question.type === "TRUE_FALSE" && <TrueFalseQuestion value={value} onChange={onChange} />}
      {question.type === "RANKING" && <RankingQuestion options={question.options} value={value} onChange={onChange} />}
    </section>
  );
}
