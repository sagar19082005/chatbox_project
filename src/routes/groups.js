const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const crypto = require('crypto');

// Export a factory so server can pass `io` for admin actions
module.exports = function createGroupsRouter(io) {
  const router = express.Router();

  // Create group — returns adminToken (store it securely)
  router.post('/create', async (req, res) => {
    const { groupName, password } = req.body;
    if (!groupName || !password) return res.status(400).json({ error: 'groupName and password required' });
    try {
      const [existing] = await db.query('SELECT id FROM `groups` WHERE group_name = ?', [groupName]);
      if (existing.length) return res.status(409).json({ error: 'Group name already exists' });

      const hashed = await bcrypt.hash(password, 10);
      const adminToken = crypto.randomBytes(32).toString('hex');
      const [result] = await db.query('INSERT INTO `groups` (group_name, password, created_at, admin_token) VALUES (?, ?, NOW(), ?)', [groupName, hashed, adminToken]);
      return res.json({ success: true, groupId: result.insertId, adminToken });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'internal' });
    }
  });

  // Join group - verify password
  router.post('/join', async (req, res) => {
    const { groupName, password } = req.body;
    if (!groupName || !password) return res.status(400).json({ error: 'groupName and password required' });
    try {
      const [rows] = await db.query('SELECT id, password FROM `groups` WHERE group_name = ?', [groupName]);
      if (!rows.length) return res.status(404).json({ error: 'Group not found' });
      const group = rows[0];
      const match = await bcrypt.compare(password, group.password);
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });
      return res.json({ success: true, groupId: group.id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'internal' });
    }
  });

  // Admin: kick a user by display name
  router.post('/kick', async (req, res) => {
    const { groupId, adminToken, targetName } = req.body;
    if (!groupId || !adminToken || !targetName) return res.status(400).json({ error: 'groupId, adminToken and targetName required' });
    try {
      const [rows] = await db.query('SELECT id FROM `groups` WHERE id = ? AND admin_token = ?', [groupId, adminToken]);
      if (!rows.length) return res.status(403).json({ error: 'Unauthorized' });

      const room = `group_${groupId}`;
      const sockets = await io.in(room).fetchSockets();
      let kicked = 0;
      for (const s of sockets) {
        const d = s.data || {};
        if (d.groupId == String(groupId) || d.groupId == groupId) {
          if ((d.displayName || '') === targetName) {
            try { s.disconnect(true); kicked++; } catch (e) { console.warn('Failed to disconnect socket', e); }
          }
        }
      }
      return res.json({ success: true, kicked });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'internal' });
    }
  });

  // Admin: delete all messages in a group
  router.delete('/:groupId/messages', async (req, res) => {
    const { groupId } = req.params;
    const { adminToken } = req.body;
    if (!groupId || !adminToken) return res.status(400).json({ error: 'groupId and adminToken required' });
    try {
      const [rows] = await db.query('SELECT id FROM `groups` WHERE id = ? AND admin_token = ?', [groupId, adminToken]);
      if (!rows.length) return res.status(403).json({ error: 'Unauthorized' });
      await db.query('DELETE FROM `messages` WHERE group_id = ?', [groupId]);
      // notify room that messages were deleted
      const room = `group_${groupId}`;
      io.to(room).emit('messages_deleted');
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'internal' });
    }
  });

  return router;
};
