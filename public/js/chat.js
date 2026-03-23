const socket = io();
const params = new URLSearchParams(location.search);
const groupId = params.get('groupId');
const displayName = params.get('displayName') || 'Anonymous';
// Prefer token from URL, fallback to stored token for this group
const urlAdminToken = params.get('adminToken') || '';
const storageKey = `chatbox_adminToken_${groupId}`;
let adminToken = urlAdminToken || (groupId ? localStorage.getItem(storageKey) : '') || '';

// If token came from URL, persist it for this group
if (urlAdminToken && groupId) {
  try { localStorage.setItem(storageKey, urlAdminToken); } catch (e) { /* ignore */ }
  adminToken = urlAdminToken;
}

document.getElementById('roomHeader').textContent = `Group: ${groupId} — ${displayName}`;

const messagesEl = document.getElementById('messages');
const msgForm = document.getElementById('msgForm');
const msgInput = document.getElementById('msgInput');

socket.emit('join', { groupId, displayName });

socket.on('init_messages', (rows) => {
  rows.forEach(addMessage);
});

socket.on('new_message', (m) => addMessage(m));

socket.on('messages_deleted', () => {
  messagesEl.innerHTML = '';
  const note = document.createElement('div');
  note.textContent = 'Messages were deleted by admin.';
  note.style.fontStyle = 'italic';
  messagesEl.appendChild(note);
});

msgForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = msgInput.value.trim();
  if (!text) return;
  socket.emit('message', { groupId, senderName: displayName, messageText: text });
  msgInput.value = '';
});

function addMessage(m) {
  const div = document.createElement('div');
  const time = new Date(m.timestamp).toLocaleTimeString();
  div.textContent = `[${time}] ${m.sender_name}: ${m.message_text}`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Admin UI wiring
if (adminToken) {
  const adminPanel = document.getElementById('adminPanel');
  const adminTokenDisplay = document.getElementById('adminTokenDisplay');
  const kickBtn = document.getElementById('kickBtn');
  const kickTarget = document.getElementById('kickTarget');
  const deleteMsgsBtn = document.getElementById('deleteMsgsBtn');

  adminTokenDisplay.value = adminToken;
  adminPanel.style.display = 'block';

  // expose a copy button for convenience
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy Token';
  copyBtn.style.marginLeft = '8px';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText(adminTokenDisplay.value).then(() => {
      alert('Admin token copied to clipboard');
    }).catch(() => { alert('Copy failed'); });
  });
  adminTokenDisplay.parentNode.appendChild(copyBtn);

  kickBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const target = kickTarget.value.trim();
    if (!target) return alert('Enter a display name to kick');
    try {
      const res = await fetch('/api/groups/kick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, adminToken, targetName: target })
      });
      const j = await res.json();
      if (res.ok) {
        alert(`Kicked ${j.kicked} socket(s)`);
      } else {
        alert(j.error || 'Kick failed');
      }
    } catch (err) {
      console.error(err);
      alert('Kick request failed');
    }
  });

  deleteMsgsBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!confirm('Delete all messages in this group?')) return;
    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/messages`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken })
      });
      const j = await res.json();
      if (res.ok) {
        alert('Messages deleted');
        messagesEl.innerHTML = '';
      } else {
        alert(j.error || 'Delete failed');
      }
    } catch (err) {
      console.error(err);
      alert('Delete request failed');
    }
  });
}
