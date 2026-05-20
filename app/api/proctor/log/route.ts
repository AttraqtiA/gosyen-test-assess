import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { proctorLogSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const payload = proctorLogSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid proctoring payload." }, { status: 400 });
  }
  await prisma.proctoringLog.create({
    data: {
      attemptId: payload.data.attemptId,
      event: payload.data.event,
      metadata: payload.data.metadata === undefined ? undefined : (JSON.parse(JSON.stringify(payload.data.metadata)) as Prisma.InputJsonValue),
    },
  });
  return NextResponse.json({ ok: true });
}
