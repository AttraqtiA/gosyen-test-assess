import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure public/uploads directory exists
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    // Generate unique file name
    const ext = file.name.split(".").pop();
    const uniqueName = `${randomUUID()}.${ext}`;
    const filePath = join(uploadDir, uniqueName);

    // Save file
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${uniqueName}`;

    return NextResponse.json({ 
      url: fileUrl,
      name: file.name,
      type: file.type
    });
  } catch (err: any) {
    console.error("Upload error", err);
    return NextResponse.json({ error: "Internal server error during upload." }, { status: 500 });
  }
}
