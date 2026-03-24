import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const db = getDb();
    const { rows } = await db.execute(
      "SELECT * FROM cards WHERE status = 'active' ORDER BY sort_order ASC, id ASC"
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch cards" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { pictogram_id, emoji, label, category } = body;

    if (!label || !category) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { rows: maxRows } = await db.execute("SELECT MAX(sort_order) as max_order FROM cards");
    const maxOrder = Number((maxRows[0] as unknown as { max_order: number | null }).max_order ?? 0);

    const result = await db.execute({
      sql: "INSERT INTO cards (emoji, pictogram_id, label, category, status, preselected, sort_order) VALUES (?, ?, ?, ?, 'active', 0, ?) RETURNING *",
      args: [emoji ?? "", pictogram_id ?? null, label.toLowerCase().trim(), category, maxOrder + 1],
    });

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create card" }, { status: 500 });
  }
}
