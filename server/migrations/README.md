# Migrations

Plain SQL files, applied in name order when the server starts (each in a transaction, once).
Applied files are recorded in `schema_migrations`. Name them `001_cards.sql`, `002_….sql`, and
never edit one that has shipped; add a new file instead.

There are none yet: v2 keeps boards, photos and recordings on the device. Add the first one with
the first feature that stores something on the server (for example opt-in backup/sync).
