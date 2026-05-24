require('dotenv').config({
  quiet: true
});
const express = require('express');
const app = express();
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const session = require('express-session');
const bcrypt = require('bcrypt');

const upload = multer({ dest: 'uploads/' }); // puoi anche usare memoryStorage


// ****************** LOGIN ***************************/
app.use(session({
  secret: 'super-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true only with HTTPS
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ******************************************************/


// Serve la cartella "public" per HTML, CSS, JS
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to read JSON from body
app.use(express.json());

// Auth
app.use('/', require('./routes/auth.routes'));

// bonuses
app.use('/bonuses', require('./routes/bonuses.routes'));

// chiosco_beers
app.use('/chiosco-beers', require('./routes/chiosco_beers.routes'));

// matches
app.use('/matches', require('./routes/matches.routes'));

// match_events
app.use('/match-events', require('./routes/match_events.routes'));

// players
app.use('/players', require('./routes/players.routes'));

// referees
app.use('/referees', require('./routes/referees.routes'));

// teams
app.use('/teams', require('./routes/teams.routes'));


/// Handle webhook
app.post('/HD07hVNDe7vAt2oe', (req, res) => {
    
    const secret = 'hacktheworld'; // Retrieve this from your environment or conf
    //const head = req.headers['X-Hub-Signature-256'];
    const head = req.headers['x-hub-signature-256'];
    if (!head) {
        return res.status(400).send('Signature not provided');
    }
    if (!verifySignature(secret, head, req)) {
        return res.status(401).send('Invalid signature');
    }
    // If the signature is valid, proceed with processing the webhook payload
    // Your webhook handling logic goes here
    res.status(200).send('Webhook received');

    setTimeout(() => {
        process.exit(111); // Exit with 111 code
    }, 2000);
});

let encoder = new TextEncoder();
async function verifySignature(secret, header, payload) {
    let parts = header.split("=");
    let sigHex = parts[1];

    let algorithm = { name: "HMAC", hash: { name: 'SHA-256' } };

    let keyBytes = encoder.encode(secret);
    let extractable = false;
    let key = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        algorithm,
        extractable,
        [ "sign", "verify" ],
    );

    let sigBytes = hexToBytes(sigHex);
    let dataBytes = encoder.encode(payload);
    let equal = await crypto.subtle.verify(
        algorithm.name,
        key,
        sigBytes,
        dataBytes,
    );

    return equal;
}

function hexToBytes(hex) {
    let len = hex.length / 2;
    let bytes = new Uint8Array(len);

    let index = 0;
    for (let i = 0; i < hex.length; i += 2) {
        let c = hex.slice(i, i + 2);
        let b = parseInt(c, 16);
        bytes[index] = b;
        index += 1;
    }

    return bytes;
}


// start the server
app.listen(3000, () => {
  const now = new Date();
  const timestamp = now.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) + ' ' + now.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  console.log(`Server avviato su http://localhost:3000 alle ${timestamp}`);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});