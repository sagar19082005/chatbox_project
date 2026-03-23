require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { createServer } = http;
const { Server } = require('socket.io');

const createGroupsRouter = require('./src/routes/groups');
const db = require('./src/db');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ensure admin_token column exists for current DB
async function ensureAdminColumn() {
  try {
    await db.query('ALTER TABLE groups ADD COLUMN IF NOT EXISTS admin_token VARCHAR(128)');
  } catch (err) {
    // some MySQL versions don't support IF NOT EXISTS for ADD COLUMN — handle gracefully
    if (err && err.errno) console.warn('Could not run ALTER TABLE to add admin_token (it may already exist)');
  }
}

ensureAdminColumn().then(() => {
  app.use('/api/groups', createGroupsRouter(io));
}).catch((e) => {
  console.error('Failed to ensure admin column:', e);
  app.use('/api/groups', createGroupsRouter(io));
});

// Socket.IO real-time handling
io.on('connection', (socket) => {
  socket.on('join', async ({ groupId, displayName }) => {
    if (!groupId) return;
    const room = `group_${groupId}`;
    socket.join(room);
    socket.data = { groupId, displayName };

    // send existing messages
    try {
      const [rows] = await db.query('SELECT sender_name, message_text, timestamp FROM messages WHERE group_id = $1 ORDER BY timestamp ASC', [groupId]);
      socket.emit('init_messages', rows);
    } catch (err) {
      console.error('Error fetching messages', err);
    }
  });

  socket.on('message', async ({ groupId, senderName, messageText }) => {
    if (!groupId || !messageText) return;
    const room = `group_${groupId}`;
    try {
      await db.query('INSERT INTO messages (group_id, sender_name, message_text, timestamp) VALUES ($1, $2, $3, NOW())', [groupId, senderName || 'Anonymous', messageText]);
      const payload = { sender_name: senderName || 'Anonymous', message_text: messageText, timestamp: new Date() };
      io.to(room).emit('new_message', payload);
    } catch (err) {
      console.error('Error saving message', err);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
