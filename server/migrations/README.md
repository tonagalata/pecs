# Migrations

Plain SQL files, applied in name order when the server starts (each in a transaction, once).
Applied files are recorded in `schema_migrations`. Name them `001_cards.sql`, `002_….sql`, and
never edit one that has shipped; add a new file instead.

- `001_sharing.sql`: shared boards, members (owner / edit / view), invite codes, and the photos
  and recordings used on shared boards. See `api.mjs`.
