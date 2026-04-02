import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const { id } = await params;
    const body = await req.json();
    const fields: string[] = [];
    const args: (string | number | null)[] = [];

    if (body.label !== undefined) {
      fields.push("label = ?");
      args.push(String(body.label).trim());
    }
    if (body.pictogram_id !== undefined) {
      fields.push("pictogram_id = ?");
      args.push(body.pictogram_id === null ? null : Number(body.pictogram_id));
    }
    if (body.emoji !== undefined) {
      fields.push("emoji = ?");
      args.push(String(body.emoji));
    }
    if (body.category !== undefined) {
      fields.push("category = ?");
      args.push(String(body.category));
    }
    if (body.status !== undefined) {
      fields.push("status = ?");
      args.push(body.status);
    }
    if (body.preselected !== undefined) {
      fields.push("preselected = ?");
      args.push(body.preselected ? 1 : 0);
    }
    if (body.sort_order !== undefined) {
      fields.push("sort_order = ?");
      args.push(body.sort_order);
    }

    if (!fields.length) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    args.push(Number(id));
    const result = await db.execute({
      sql: `UPDATE cards SET ${fields.join(", ")} WHERE id = ? RETURNING *`,
      args,
    });

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const { id } = await params;
    await db.execute({
      sql: "UPDATE cards SET status = 'deleted' WHERE id = ?",
      args: [Number(id)],
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete card" }, { status: 500 });
  }
}
