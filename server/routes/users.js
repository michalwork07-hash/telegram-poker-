const express = require('express');
const router = express.Router();
const { getUser, getOrCreateUser } = require('../db');
const { telegramAuthMiddleware } = require('../auth');

// GET /api/user/:telegramId
router.get('/:telegramId', (req, res) => {
  const user = getUser(req.params.telegramId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    telegram_id: user.telegram_id,
    username:    user.username,
    first_name:  user.first_name,
    chips:       user.chips,
    wins:        user.wins,
    largest_win: user.largest_win,
  });
});

// POST /api/user/init  — called on Mini App launch with Telegram initData
router.post('/init', telegramAuthMiddleware, (req, res) => {
  const tgUser = req.tgUser || req.body;
  if (!tgUser?.id) return res.status(400).json({ error: 'Missing user data' });
  const user = getOrCreateUser(
    String(tgUser.id),
    tgUser.username || '',
    tgUser.first_name || '',
  );
  res.json({ ...user });
});

module.exports = router;
