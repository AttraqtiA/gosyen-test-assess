"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

const steps = ["Metadata", "Structure", "Questions", "Scoring", "Preview"];

export function TestBuilderWizard() {
  const [step, setStep] = useState(0);
  return (
    <main className="container-page grid gap-5 py-8 lg:grid-cols-[280px_1fr]">
      <aside className="panel h-fit p-4">
        <h2 className="font-semibold">New assessment</h2>
        <nav className="mt-4 grid gap-1 text-sm">
          {steps.map((item, index) => (
            <button key={item} type="button" onClick={() => setStep(index)} className={`rounded-md px-3 py-2 text-left ${index === step ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}>
              {index + 1}. {item}
            </button>
          ))}
        </nav>
      </aside>
      <section className="panel grid gap-4 p-5">
        <h1 className="text-2xl font-semibold">{steps[step]}</h1>
        {step === 0 && (
          <div className="grid gap-3">
            <Input placeholder="Test title" />
            <Textarea placeholder="Description" />
            <select className="h-10 rounded-md border border-slate-300 px-3 text-sm">
              <option>PERSONALITY</option>
              <option>IQ_LOGIC</option>
              <option>INTERVIEW</option>
              <option>COMPOSITE</option>
              <option>KAHOOT</option>
              <option>CUSTOM</option>
            </select>
          </div>
        )}
        {step === 1 && <p className="text-sm text-slate-600">Add subtests, timers, enable toggles, and order controls here.</p>}
        {step === 2 && <p className="text-sm text-slate-600">Question type editors for MCQ, essay, scale, ranking, true/false, and open responses are staged here.</p>}
        {step === 3 && <p className="text-sm text-slate-600">Configure per-subtest strategies, composite formulas, and profile mappings.</p>}
        {step === 4 && <p className="text-sm text-slate-600">Preview the candidate flow and publish the test with a generated session code.</p>}
        <div className="flex justify-between">
          <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>
            Previous
          </Button>
          <Button type="button" disabled={step === steps.length - 1} onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>
            Next
          </Button>
        </div>
      </section>
    </main>
  );
}
