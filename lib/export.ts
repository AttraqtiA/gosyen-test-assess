import ExcelJS from "exceljs";
import type { Attempt, ProctoringLog, Question, Response, Result, SubTest, Test } from "@prisma/client";
import { jsonObject } from "@/lib/scoring";

type ResponseWithQuestion = Response & { question: Question; subTest: SubTest };
type AttemptExport = Attempt & {
  test: Test;
  result: Result | null;
  responses: ResponseWithQuestion[];
  proctoringLogs: ProctoringLog[];
};

function styleSheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber % 2 === 0) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    }
  });
  sheet.columns.forEach((column) => {
    let width = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      width = Math.max(width, Math.min(60, String(cell.value ?? "").length + 2));
    });
    column.width = width;
  });
}

function addObjectRows(sheet: ExcelJS.Worksheet, title: string, value: Record<string, unknown>) {
  Object.entries(value).forEach(([key, item]) => {
    sheet.addRow([title, key, typeof item === "object" ? JSON.stringify(item) : item]);
  });
}

export async function exportAttemptWorkbook(attempt: AttemptExport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Gosyen Assess";

  const summary = workbook.addWorksheet("Summary", { properties: { tabColor: { argb: "FF3B82F6" } } });
  summary.addRow(["Field", "Value", "Detail"]);
  summary.addRows([
    ["Candidate Name", attempt.candidateName],
    ["Candidate Email", attempt.candidateEmail],
    ["Test", attempt.test.title],
    ["Submitted At", attempt.submittedAt],
    ["Total Score", attempt.result?.totalScore],
    ["Profile", attempt.result?.profileLabel],
    ["Passed", attempt.result?.isPassed],
    ["Proctoring Violations", attempt.proctoringLogs.length],
  ]);
  addObjectRows(summary, "Subtest Score", jsonObject(attempt.result?.subtestScores ?? null));
  addObjectRows(summary, "Dimension", jsonObject(attempt.result?.dimensionMap ?? null));
  styleSheet(summary);

  const responses = workbook.addWorksheet("Responses", { properties: { tabColor: { argb: "FF8B5CF6" } } });
  responses.addRow(["Question", "Type", "Subtest", "Answer", "Auto Score", "LLM Score", "LLM Feedback", "Manual Score", "Final Score"]);
  attempt.responses.forEach((response) => {
    responses.addRow([
      response.question.body,
      response.question.type,
      response.subTest.title,
      response.answer,
      response.autoScore,
      response.llmScore,
      response.llmFeedback,
      response.manualScore,
      response.finalScore,
    ]);
  });
  styleSheet(responses);

  const proctoring = workbook.addWorksheet("Proctoring Log", { properties: { tabColor: { argb: "FFF59E0B" } } });
  proctoring.addRow(["Timestamp", "Event", "Metadata"]);
  attempt.proctoringLogs.forEach((log) => {
    proctoring.addRow([log.createdAt, log.event, JSON.stringify(log.metadata ?? {})]);
  });
  styleSheet(proctoring);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function exportBatchWorkbook(attempts: AttemptExport[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Gosyen Assess";

  const overview = workbook.addWorksheet("Candidates overview", { properties: { tabColor: { argb: "FF3B82F6" } } });
  overview.addRow(["Name", "Email", "Test", "Submitted At", "Total Score", "Profile", "Passed"]);
  attempts.forEach((attempt) => {
    overview.addRow([attempt.candidateName, attempt.candidateEmail, attempt.test.title, attempt.submittedAt, attempt.result?.totalScore, attempt.result?.profileLabel, attempt.result?.isPassed]);
  });
  styleSheet(overview);

  const raw = workbook.addWorksheet("Raw responses", { properties: { tabColor: { argb: "FF8B5CF6" } } });
  raw.addRow(["Candidate Name", "Candidate Email", "Question", "Answer", "Final Score"]);
  attempts.forEach((attempt) => {
    attempt.responses.forEach((response) => {
      raw.addRow([attempt.candidateName, attempt.candidateEmail, response.question.body, response.answer, response.finalScore]);
    });
  });
  styleSheet(raw);

  const breakdown = workbook.addWorksheet("Subtest breakdown", { properties: { tabColor: { argb: "FFF59E0B" } } });
  breakdown.addRow(["Candidate Name", "Candidate Email", "Subtest", "Score"]);
  attempts.forEach((attempt) => {
    Object.entries(jsonObject(attempt.result?.subtestScores ?? null)).forEach(([subtest, score]) => {
      breakdown.addRow([attempt.candidateName, attempt.candidateEmail, subtest, score]);
    });
  });
  styleSheet(breakdown);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
