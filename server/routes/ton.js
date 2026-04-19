const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { adjustChips } = require('../db');

const CHIP_RATE = 1000; // chips per TON

// POST /api/ton/webhook — verify TON transaction and credit chips
router.post('/webhook', (req, res) => {
  const { tx_hash, from_address, amount_nano, telegram_id, comment } = req.body;

  if (!tx_hash || !from_address || !amount_nano || !telegram_id) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // Verify webhook signature if TON_WEBHOOK_SECRET is set
  const secret = process.env.TON_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers['x-ton-signature'];
    const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
    if (sig !== expected) return res.status(401).json({ error: 'Invalid signature' });
  }

  const amountTON = parseFloat(amount_nano) / 1e9;
  const chips = Math.round(amountTON * CHIP_RATE);
  if (chips < 1) return res.status(400).json({ error: 'Amount too small' });

  const updated = adjustChips(String(telegram_id), chips, 'ton_payment', { tx_hash, from_address, amount_nano });
  if (!updated) return res.status(404).json({ error: 'User not found' });

  res.json({ ok: true, chips_added: chips, new_balance: updated.chips });
});

module.exports = router;
