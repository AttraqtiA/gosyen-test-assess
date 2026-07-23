import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  const session = await prisma.testSession.findUnique({
    where: { code: code.toUpperCase() },
    include: { test: true },
  });

  if (!session) {
    return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
  }

  if (!session.test.isActive) {
    return NextResponse.json({ error: "Ujian dinonaktifkan oleh penyelenggara" }, { status: 400 });
  }

  return NextResponse.json({
    sessionId: session.id,
    testTitle: session.test.title,
    candidateFields: session.test.candidateFields,
  });
}
