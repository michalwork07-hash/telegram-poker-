const crypto = require('crypto');

/**
 * Validate Telegram WebApp initData using HMAC-SHA256.
 * Returns parsed user object or throws on invalid signature.
 */
function validateTelegramWebAppData(initData, botToken) {
  if (!initData) throw new Error('No initData provided');

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('Missing hash in initData');

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (expectedHash !== hash) throw new Error('Invalid initData signature');

  const authDate = parseInt(params.get('auth_date'), 10);
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age > 86400) throw new Error('initData expired');

  const userJson = params.get('user');
  if (!userJson) throw new Error('No user in initData');

  return JSON.parse(userJson);
}

/**
 * Express middleware — reads initData from Authorization header or body.
 * Attaches req.tgUser on success.
 */
function telegramAuthMiddleware(req, res, next) {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) return next(); // skip in dev without token

  try {
    const initData =
      (req.headers.authorization || '').replace('tma ', '') ||
      req.body?.initData;

    const user = validateTelegramWebAppData(initData, botToken);
    req.tgUser = user;
    next();
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}

module.exports = { validateTelegramWebAppData, telegramAuthMiddleware };
