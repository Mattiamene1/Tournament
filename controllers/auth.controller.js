const bcrypt = require('bcrypt');

const USER = {
  username: process.env.LOGIN_ADM,
  password: process.env.LOGIN_PSW
};

async function login(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Missing credentials' });
  }

  if (username !== USER.username) {
    return res.status(401).json({ success: false });
  }

  const match = await bcrypt.compare(password, USER.password);

  if (!match) {
    return res.status(401).json({ success: false });
  }

  req.session.user = { username };

  res.json({ success: true });
}

function logout(req, res) {
  req.session.destroy();
  res.json({ success: true });
}

function me(req, res) {
  res.json({
    logged: !!req.session.user
  });
}

module.exports = { login, logout, me };