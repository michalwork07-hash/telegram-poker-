const express = require('express');
const router = express.Router();
const { adjustChips, getUser } = require('../db');
const { telegramAuthMiddleware } = require('../auth');

const PACKAGES = {
  '500':  { tons: 0.5,  chips: 500 },
  '2000': { tons: 1.5,  chips: 2000 },
  '5000': { tons: 3.0,  chips: 5000 },
};

// POST /api/chips/purchase  — records a chip purchase after TON payment verified
router.post('/purchase', telegramAuthMiddleware, (req, res) => {
  const { telegram_id, package_id, tx_hash } = req.body;
  if (!telegram_id || !package_id) return res.status(400).json({ error: 'Missing fields' });

  const pkg = PACKAGES[String(package_id)];
  if (!pkg) return res.status(400).json({ error: 'Invalid package' });

  const user = getUser(telegram_id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const updated = adjustChips(telegram_id, pkg.chips, 'purchase', { package_id, tx_hash });
  res.json({ chips: updated?.chips ?? user.chips + pkg.chips, added: pkg.chips });
});

module.exports = router;
