require('dotenv').config({ quiet: true });

const express  = require('express');
const path     = require('node:path');        // FIX: node: prefix (S7772)
const multer   = require('multer');
const session  = require('express-session');

const app = express();

app.disable('x-powered-by');                  // FIX: non rivelare versione Express (S5689)

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }      // 5 MB max upload
});

// ── Sessione ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }   // Buffer of the exact bytes
}));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // FIX: secure:true in prod (S2092)
    httpOnly: true,
    sameSite: 'strict'
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/',              require('./routes/auth.routes'));
app.use('/bonuses',       require('./routes/bonuses.routes'));
app.use('/chiosco-beers', require('./routes/chiosco_beers.routes'));
app.use('/matches',       require('./routes/matches.routes'));
app.use('/match-events',  require('./routes/match_events.routes'));
app.use('/players',       require('./routes/players.routes'));
app.use('/referees',      require('./routes/referees.routes'));
app.use('/teams',         require('./routes/teams.routes'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Webhook GitHub ────────────────────────────────────────────────────────
app.post('/HD07hVNDe7vAt2oe', async (req, res) => {
  const secret = process.env.SECRET;
  const head   = req.headers['x-hub-signature-256'];

  if (!head) return res.status(400).send('Signature not provided');

  const valid = await verifySignature(secret, head, req.rawBody); // pass raw bytes
  if (!valid)  return res.status(401).send('Invalid signature');

  res.status(200).send('Webhook received');
  setTimeout(() => process.exit(111), 2000);
});

// ── Signature helpers ─────────────────────────────────────────────────────
const encoder = new TextEncoder();

async function verifySignature(secret, header, rawBody) {
  const [, sigHex] = header.split('=');
  const algorithm  = { name: 'HMAC', hash: { name: 'SHA-256' } };
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), algorithm, false, ['sign', 'verify']
  );
  // rawBody is already a Buffer (a Uint8Array), pass it directly — do NOT re-encode it
  return crypto.subtle.verify(algorithm.name, key, hexToBytes(sigHex), rawBody);
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16); // FIX: Number.parseInt (S7773)
  }
  return bytes;
}

// ── Avvio ─────────────────────────────────────────────────────────────────
app.listen(3000, () => {
  const now = new Date();
  const ts  = now.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
            + ' ' + now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  console.log(`Server avviato su http://localhost:3000 alle ${ts}`);
});
