const express = require('express');
const router = express.Router();

// GET /api/rooms — list active game rooms (gameService injected by index.js)
router.get('/', (req, res) => {
  const gameService = req.app.get('gameService');
  res.json(gameService.getTables());
});

module.exports = router;
