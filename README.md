# ChatBox — The Ultimate Privacy Tool

Simple group-based messaging app (no user accounts). Backend: Node/Express + Socket.IO, DB: MySQL.

Quick start:

1. Copy `.env.example` to `.env` and fill DB credentials.
2. Create DB/tables: run `db/schema.sql` in your MySQL server.
3. Install deps: `npm install`.
4. Start: `npm start` and open `http://localhost:3000`.

Files:
- [server.js](server.js) — main server
- [src/db.js](src/db.js) — MySQL pool
- [src/routes/groups.js](src/routes/groups.js) — create/join endpoints
- [public/index.html](public/index.html) — create/join UI
- [public/chat.html](public/chat.html) — chat UI
- [db/schema.sql](db/schema.sql) — DB schema
