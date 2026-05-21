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

// teams
app.use('/teams', require('./routes/teams.routes'));


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