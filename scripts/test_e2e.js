const { io } = require('socket.io-client');

async function createGroup(baseUrl, name, password) {
  const res = await fetch(`${baseUrl}/api/groups/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupName: name, password })
  });
  const j = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(j));
  return j.groupId;
}

function connectClient(baseUrl, groupId, displayName) {
  return new Promise((resolve) => {
    const socket = io(baseUrl, { transports: ['websocket'] });
    socket.on('connect', () => {
      socket.emit('join', { groupId, displayName });
      resolve(socket);
    });
  });
}

async function run() {
  const baseUrl = 'http://localhost:3000';
  const groupName = `testgroup_${Date.now()}`;
  const password = 'testpass';

  console.log('Creating group...', groupName);
  const groupId = await createGroup(baseUrl, groupName, password);
  console.log('Created groupId=', groupId);

  const [c1, c2] = await Promise.all([
    connectClient(baseUrl, groupId, 'Alice'),
    connectClient(baseUrl, groupId, 'Bob')
  ]);

  let receivedByC1 = 0, receivedByC2 = 0;

  c1.on('new_message', (m) => {
    console.log('C1 got', m);
    receivedByC1++;
  });
  c2.on('new_message', (m) => {
    console.log('C2 got', m);
    receivedByC2++;
  });

  // wait a bit for room join
  await new Promise(r => setTimeout(r, 500));

  console.log('C1 sending message');
  c1.emit('message', { groupId, senderName: 'Alice', messageText: 'Hello from Alice' });

  const start = Date.now();
  while (Date.now() - start < 5000) {
    if (receivedByC1 >= 1 && receivedByC2 >= 1) break;
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('Results: receivedByC1=', receivedByC1, 'receivedByC2=', receivedByC2);

  c1.disconnect();
  c2.disconnect();

  if (receivedByC1 >= 1 && receivedByC2 >= 1) {
    console.log('E2E test passed');
    process.exit(0);
  } else {
    console.error('E2E test failed');
    process.exit(2);
  }
}

run().catch(err => { console.error('Test error', err); process.exit(1); });
