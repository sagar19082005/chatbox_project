document.getElementById('createForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = { groupName: fd.get('groupName'), password: fd.get('password') };
  const res = await fetch('/api/groups/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await res.json();
  if (res.ok) {
    // navigate to chat with a prompt for display name
    const display = prompt('Enter display name (nickname):') || 'Anonymous';
    // include adminToken if returned so admin can manage the group
    const tokenParam = j.adminToken ? `&adminToken=${encodeURIComponent(j.adminToken)}` : '';
    window.location = `/chat.html?groupId=${j.groupId}&displayName=${encodeURIComponent(display)}${tokenParam}`;
  } else {
    alert(j.error || 'Failed to create group');
  }
});

document.getElementById('joinForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = { groupName: fd.get('groupName'), password: fd.get('password') };
  const res = await fetch('/api/groups/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await res.json();
  if (res.ok) {
    const display = fd.get('displayName') || (prompt('Enter display name (nickname):') || 'Anonymous');
    window.location = `/chat.html?groupId=${j.groupId}&displayName=${encodeURIComponent(display)}`;
  } else {
    alert(j.error || 'Failed to join group');
  }
});
