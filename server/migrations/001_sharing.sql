-- Shared boards: a parent shares a board with therapists, teachers and family using invite codes.
-- Only the board itself is stored (words, pages, phrases, schedule, and the photos and recordings
-- used on it). Message history, settings and anything said on the board never leave the device.
CREATE TABLE boards (
  id          text PRIMARY KEY,
  doc         jsonb NOT NULL,
  rev         integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE members (
  id          text PRIMARY KEY,
  board_id    text NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  role        text NOT NULL CHECK (role IN ('owner', 'edit', 'view')),
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_seen   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX members_board ON members (board_id);

CREATE TABLE invites (
  code_hash   text PRIMARY KEY,
  board_id    text NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('edit', 'view')),
  created_by  text REFERENCES members(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  used_by     text REFERENCES members(id) ON DELETE SET NULL
);
CREATE INDEX invites_board ON invites (board_id);

CREATE TABLE media (
  board_id    text NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  id          text NOT NULL,
  mime        text NOT NULL,
  data        bytea NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (board_id, id)
);
