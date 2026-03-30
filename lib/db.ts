import { createClient } from "@libsql/client";

let _client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) throw new Error("TURSO_DATABASE_URL is not set");

    _client = createClient({
      url,
      authToken: authToken || undefined,
    });
  }
  return _client;
}

export async function initDb() {
  const db = getDb();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emoji TEXT,
      pictogram_id INTEGER,
      label TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      preselected INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Migration: add pictogram_id to existing databases
  try {
    await db.execute("ALTER TABLE cards ADD COLUMN pictogram_id INTEGER");
  } catch {
    // Column already exists — safe to ignore
  }

  // Migration: clear old emoji-only seed rows so they get replaced with ARASAAC pictograms
  await db.execute(
    "DELETE FROM cards WHERE pictogram_id IS NULL AND emoji IS NOT NULL AND sort_order < 32"
  );

  const { rows } = await db.execute("SELECT COUNT(*) as count FROM cards");
  const count = Number((rows[0] as unknown as { count: number }).count);

  if (count === 0) {
    // [label, category, arasaac_pictogram_id]
    const defaults: [string, string, number][] = [
      // Starters (PECS action phrases)
      ["I want",   "Starters", 7650],
      ["I need",   "Starters", 5023],
      ["more",     "Starters", 3833],
      ["help",     "Starters", 4997],
      ["stop",     "Starters", 5466],
      ["yes",      "Starters", 5827],
      ["no",       "Starters", 5464],
      ["finished", "Starters", 3766],
      ["apple",    "Food",     2462],
      ["drink",    "Food",     6061],
      ["cookie",   "Food",     8312],
      ["banana",   "Food",     2530],
      ["juice",    "Food",    11461],
      ["sandwich", "Food",     2281],
      ["play",     "Actions", 23392],
      ["bathroom", "Actions",  5921],
      ["sleep",    "Actions",  6479],
      ["hug",      "Actions",  4550],
      ["walk",     "Actions", 29951],
      ["read",     "Actions",  7141],
      ["happy",    "Feelings", 35533],
      ["sad",      "Feelings", 35545],
      ["angry",    "Feelings", 35539],
      ["scared",   "Feelings", 35535],
      ["tired",    "Feelings", 35537],
      ["sick",     "Feelings",  7040],
      ["home",     "Places",   6964],
      ["school",   "Places",  32446],
      ["doctor",   "Places",   6561],
      ["store",    "Places",  35695],
      ["outside",  "Places",   5475],
      ["mom",      "People",   2458],
      ["dad",      "People",  31146],
      ["sister",   "People",   2422],
      ["brother",  "People",   2423],
      ["teacher",  "People",   6556],
      ["toy",      "Objects",  9813],
      ["tablet",   "Objects", 28099],
      ["music",    "Objects", 24791],
      ["crayons",  "Objects",  4951],
      // ABCs
      ["A", "ABCs",  3049], ["B", "ABCs",  3061], ["C", "ABCs",  3069],
      ["D", "ABCs",  3088], ["E", "ABCs",  3096], ["F", "ABCs",  3101],
      ["G", "ABCs",  3104], ["H", "ABCs",  3112], ["I", "ABCs",  3117],
      ["J", "ABCs",  3119], ["K", "ABCs",  3120], ["L", "ABCs",  3121],
      ["M", "ABCs",  3125], ["N", "ABCs",  3133], ["O", "ABCs",  3136],
      ["P", "ABCs",  3137], ["Q", "ABCs",  3146], ["R", "ABCs",  3147],
      ["S", "ABCs",  3152], ["T", "ABCs",  3158], ["U", "ABCs",  3164],
      ["V", "ABCs",  3165], ["W", "ABCs",  3167], ["X", "ABCs",  3168],
      ["Y", "ABCs",  3171], ["Z", "ABCs",  3173],
      // Numbers
      ["1",  "Numbers",  2627], ["2",  "Numbers",  2628], ["3",  "Numbers",  2629],
      ["4",  "Numbers",  2630], ["5",  "Numbers",  2631], ["6",  "Numbers",  2632],
      ["7",  "Numbers",  2633], ["8",  "Numbers",  2634], ["9",  "Numbers",  2635],
      ["10", "Numbers",  7025], ["11", "Numbers", 29260], ["12", "Numbers", 29262],
      ["13", "Numbers", 29264], ["14", "Numbers", 29266], ["15", "Numbers", 29268],
      ["16", "Numbers", 29270], ["17", "Numbers", 29272], ["18", "Numbers", 29274],
      ["19", "Numbers", 29276], ["20", "Numbers", 29550],
    ];

    for (let i = 0; i < defaults.length; i++) {
      const [label, category, pictogram_id] = defaults[i];
      await db.execute({
        sql: "INSERT INTO cards (emoji, pictogram_id, label, category, status, preselected, sort_order) VALUES ('', ?, ?, ?, 'active', 0, ?)",
        args: [pictogram_id, label, category, i],
      });
    }
  } else {
    // Seed ABCs and Numbers into existing databases that were created before these categories
    const abcSeeds: [string, number][] = [
      ["A", 3049], ["B", 3061], ["C", 3069], ["D", 3088], ["E", 3096], ["F", 3101],
      ["G", 3104], ["H", 3112], ["I", 3117], ["J", 3119], ["K", 3120], ["L", 3121],
      ["M", 3125], ["N", 3133], ["O", 3136], ["P", 3137], ["Q", 3146], ["R", 3147],
      ["S", 3152], ["T", 3158], ["U", 3164], ["V", 3165], ["W", 3167], ["X", 3168],
      ["Y", 3171], ["Z", 3173],
    ];
    const numberSeeds: [string, number][] = [
      ["1", 2627], ["2", 2628], ["3", 2629], ["4", 2630], ["5", 2631], ["6", 2632],
      ["7", 2633], ["8", 2634], ["9", 2635], ["10", 7025], ["11", 29260], ["12", 29262],
      ["13", 29264], ["14", 29266], ["15", 29268], ["16", 29270], ["17", 29272],
      ["18", 29274], ["19", 29276], ["20", 29550],
    ];

    const { rows: abcRows } = await db.execute("SELECT COUNT(*) as count FROM cards WHERE category = 'ABCs'");
    if (Number((abcRows[0] as unknown as { count: number }).count) === 0) {
      const { rows: maxRows } = await db.execute("SELECT MAX(sort_order) as m FROM cards");
      let order = Number((maxRows[0] as unknown as { m: number | null }).m ?? 0) + 1;
      for (const [label, pictogram_id] of abcSeeds) {
        await db.execute({
          sql: "INSERT INTO cards (emoji, pictogram_id, label, category, status, preselected, sort_order) VALUES ('', ?, ?, 'ABCs', 'active', 0, ?)",
          args: [pictogram_id, label, order++],
        });
      }
    }

    const { rows: numRows } = await db.execute("SELECT COUNT(*) as count FROM cards WHERE category = 'Numbers'");
    if (Number((numRows[0] as unknown as { count: number }).count) === 0) {
      const { rows: maxRows } = await db.execute("SELECT MAX(sort_order) as m FROM cards");
      let order = Number((maxRows[0] as unknown as { m: number | null }).m ?? 0) + 1;
      for (const [label, pictogram_id] of numberSeeds) {
        await db.execute({
          sql: "INSERT INTO cards (emoji, pictogram_id, label, category, status, preselected, sort_order) VALUES ('', ?, ?, 'Numbers', 'active', 0, ?)",
          args: [pictogram_id, label, order++],
        });
      }
    }

    const { rows: starterRows } = await db.execute("SELECT COUNT(*) as count FROM cards WHERE category = 'Starters'");
    if (Number((starterRows[0] as unknown as { count: number }).count) === 0) {
      const starterSeeds: [string, number][] = [
        ["I want", 7650], ["I need", 5023], ["more", 3833], ["help", 4997],
        ["stop", 5466], ["yes", 5827], ["no", 5464], ["finished", 3766],
      ];
      // Insert starters at sort_order -8..-1 so they always appear first
      let order = -8;
      for (const [label, pictogram_id] of starterSeeds) {
        await db.execute({
          sql: "INSERT INTO cards (emoji, pictogram_id, label, category, status, preselected, sort_order) VALUES ('', ?, ?, 'Starters', 'active', 0, ?)",
          args: [pictogram_id, label, order++],
        });
      }
    }
  }
}

export interface Card {
  id: number;
  emoji: string | null;
  pictogram_id: number | null;
  label: string;
  category: string;
  status: "active" | "deleted";
  preselected: boolean;
  sort_order: number;
  created_at: string;
}
