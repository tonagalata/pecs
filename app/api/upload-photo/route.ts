import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("photo") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No photo provided" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const uuid = randomUUID();
  const key = `cards/photos/${uuid}.jpg`;
  const url = await uploadToR2(key, buffer, "image/jpeg");
  return NextResponse.json({ url });
}
