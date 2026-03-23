const fetch = global.fetch || require('node-fetch');
const ioClient = require('socket.io-client');
const db = require('../src/db');

async function createGroup(name, password) {
  const res = await fetch('http://localhost:3000/api/groups/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupName: name, password })
  });
  return res.json();
}

async function run() {
  const groupName = 'test_group_' + Date.now();
  console.log('Creating group', groupName);
  const created = await createGroup(groupName, 'testpass');
  if (!created.groupId) {
    console.error('Failed to create group', created);
    process.exit(1);
  }
  const groupId = created.groupId;

  const url = 'http://localhost:3000';
  const clientA = ioClient(url);
  const clientB = ioClient(url);

  clientA.on('connect', () => {
    clientA.emit('join', { groupId, displayName: 'Alice' });
    setTimeout(() => {
      clientA.emit('message', { groupId, senderName: 'Alice', messageText: 'Hello from A' });
    }, 500);
  });

  clientB.on('connect', () => {
    clientB.emit('join', { groupId, displayName: 'Bob' });
  });

  clientB.on('new_message', async (m) => {
    console.log('Client B received message:', m);
    // verify DB has the message
    const [rows] = await db.query('SELECT sender_name, message_text FROM `messages` WHERE group_id = ? ORDER BY timestamp DESC LIMIT 1', [groupId]);
    console.log('Latest DB message:', rows[0]);
    clientA.close();
    clientB.close();
    process.exit(0);
  });

  clientA.on('connect_error', (e) => { console.error('A connect_error', e); });
  clientB.on('connect_error', (e) => { console.error('B connect_error', e); });

  // timeout failure
  setTimeout(() => {
    console.error('Test timed out');
    clientA.close();
    clientB.close();
    process.exit(1);
  }, 10000);
}

run().catch(err => { console.error(err); process.exit(1); });
