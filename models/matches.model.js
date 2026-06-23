const db = require('../_db/mysql');

/* =========================
   CREATE MATCH
   (esteso: persiste anche round/slot per le partite del tabellone;
    per le partite di girone restano NULL)
========================= */
async function createMatch(data) {
  const sql = `
    INSERT INTO matches
      (group_id, home_team_id, away_team_id, match_date, pitch_id, referee_id, status, round, slot)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    data.group_id || null,
    data.home_team_id,
    data.away_team_id,
    data.match_date || null,
    data.pitch_id || null,
    data.referee_id || null,
    data.status || 'scheduled',
    data.round || null,
    data.slot || null
  ];

  const [result] = await db.execute(sql, params);
  return result.insertId;
}

/* =========================
   GET MATCHES (WITH TEAMS)
========================= */
async function getMatches(filters = {}) {
  let sql = `
    SELECT
      m.*,

      ht.name AS home_team_name,
      at.name AS away_team_name,

      tg.name AS group_name

    FROM matches m

    LEFT JOIN teams ht ON m.home_team_id = ht.id
    LEFT JOIN teams at ON m.away_team_id = at.id
    LEFT JOIN tournament_groups tg ON m.group_id = tg.id

    WHERE 1=1
  `;

  const params = [];

  if (filters.status) {
    sql += ' AND m.status = ?';
    params.push(filters.status);
  }

  if (filters.group_id) {
    sql += ' AND m.group_id = ?';
    params.push(filters.group_id);
  }

  sql += ` ORDER BY m.match_date ASC`; // 👈 cronologico (vecchio → futuro)

  const [rows] = await db.execute(sql, params);
  return rows;
}

/* =========================
   GET MATCH BY ID
========================= */
async function getMatchById(id) {
  const sql = `
    SELECT
      m.*,

      ht.name AS home_team_name,
      at.name AS away_team_name,

      tg.name AS group_name

    FROM matches m

    LEFT JOIN teams ht ON m.home_team_id = ht.id
    LEFT JOIN teams at ON m.away_team_id = at.id
    LEFT JOIN tournament_groups tg ON m.group_id = tg.id

    WHERE m.id = ?
  `;

  const [rows] = await db.execute(sql, [id]);
  return rows[0];
}

/* =========================
   UPDATE MATCH
========================= */
async function updateMatch(id, data) {
  const sql = `
    UPDATE matches
    SET
      group_id = ?,
      home_team_id = ?,
      away_team_id = ?,
      match_date = ?,
      pitch_id = ?,
      referee_id = ?,
      status = ?
    WHERE id = ?
  `;

  const params = [
    data.group_id,
    data.home_team_id,
    data.away_team_id,
    data.match_date,
    data.pitch_id,
    data.referee_id,
    data.status,
    id
  ];

  const [result] = await db.execute(sql, params);
  return result;
}

/* =========================
   DELETE MATCH
========================= */
async function deleteMatch(id) {
  const sql = `DELETE FROM matches WHERE id = ?`;
  const [result] = await db.execute(sql, [id]);
  return result;
}

/* =========================
   ADDITIONAL METHODS
========================= */
async function startMatch(id) {

  await db.execute(
    `
    UPDATE matches
    SET status = 'live',
        phase = 'first_half',
        started_at = UTC_TIMESTAMP(),
        paused_at = NULL,
        paused_ms = 0
    WHERE id = ?
      AND status = 'scheduled'
    `,
    [id]
  );

  const [rows] = await db.execute(
    `
    SELECT 
      id,
      status,
      started_at,
      UTC_TIMESTAMP() AS mysql_utc_now,
      NOW() AS mysql_local_now
    FROM matches
    WHERE id = ?
    `,
    [id]
  );

  return true;
}

/* Fine 1° tempo → intervallo */
async function endFirstHalf(id) {
  await db.execute(
    `
    UPDATE matches
    SET phase = 'halftime',
        first_half_ended_at = UTC_TIMESTAMP(),
        paused_at = NULL
    WHERE id = ?
      AND status = 'live'
      AND phase = 'first_half'
    `,
    [id]
  );
  return true;
}

/* Inizio 2° tempo */
async function startSecondHalf(id) {
  await db.execute(
    `
    UPDATE matches
    SET phase = 'second_half',
        second_half_started_at = UTC_TIMESTAMP(),
        paused_at = NULL,
        paused_ms = 0
    WHERE id = ?
      AND status = 'live'
      AND phase = 'halftime'
    `,
    [id]
  );
  return true;
}

/* =========================
   PAUSA / RIPRESA CRONOMETRO
   - pauseTimer: registra l'istante di pausa (solo se in gioco e non già in pausa)
   - resumeTimer: somma la durata della pausa a paused_ms e azzera paused_at
========================= */
async function pauseTimer(id) {
  await db.execute(
    `
    UPDATE matches
    SET paused_at = UTC_TIMESTAMP()
    WHERE id = ?
      AND status = 'live'
      AND phase IN ('first_half', 'second_half')
      AND paused_at IS NULL
    `,
    [id]
  );
  return true;
}

async function resumeTimer(id) {
  await db.execute(
    `
    UPDATE matches
    SET paused_ms = paused_ms + TIMESTAMPDIFF(MICROSECOND, paused_at, UTC_TIMESTAMP()) / 1000,
        paused_at = NULL
    WHERE id = ?
      AND status = 'live'
      AND paused_at IS NOT NULL
    `,
    [id]
  );
  return true;
}

/*
  Fine partita.
  Se il punteggio dei tempi regolamentari è in parità,
  la partita NON si chiude: passa alla fase 'shootout' (calci di rigore).
  Altrimenti viene chiusa normalmente.
  Ritorna { shootout: true } se è andata ai rigori.
*/
async function finishMatch(id) {
  const [rows] = await db.execute(
    `SELECT status, phase, home_score, away_score FROM matches WHERE id = ?`,
    [id]
  );
  const match = rows[0];
  if (!match || match.status !== 'live') return { extra_time: false, shootout: false };

  const isDraw = Number(match.home_score || 0) === Number(match.away_score || 0);

  if (isDraw) {
    // Pareggio a fine 2° tempo → 2 minuti supplementari (Golden Goal)
    await db.execute(
      `
      UPDATE matches
      SET phase = 'extra_time'
      WHERE id = ?
        AND status = 'live'
      `,
      [id]
    );
    return { extra_time: true, shootout: false };
  }

  await db.execute(
    `
    UPDATE matches
    SET status = 'finished',
        phase = 'ended',
        ended_at = UTC_TIMESTAMP()
    WHERE id = ?
      AND status = 'live'
    `,
    [id]
  );
  return { extra_time: false, shootout: false };
}

/*
  Risolve i tempi supplementari (Golden Goal).
  - se una squadra è in vantaggio → vittoria, partita chiusa (3/0 in classifica)
  - se ancora in parità (nessun gol nei 2') → si va agli shootout
  Ritorna { finished, shootout }.
*/
async function resolveExtraTime(id) {
  const [rows] = await db.execute(
    `SELECT status, phase, home_score, away_score FROM matches WHERE id = ?`,
    [id]
  );
  const match = rows[0];
  if (!match || match.status !== 'live' || match.phase !== 'extra_time') {
    throw new Error('La partita non è nei tempi supplementari.');
  }

  const isDraw = Number(match.home_score || 0) === Number(match.away_score || 0);

  if (!isDraw) {
    await db.execute(
      `
      UPDATE matches
      SET status = 'finished',
          phase = 'ended',
          ended_at = UTC_TIMESTAMP()
      WHERE id = ?
        AND status = 'live'
        AND phase = 'extra_time'
      `,
      [id]
    );
    return { finished: true, shootout: false };
  }

  await db.execute(
    `
    UPDATE matches
    SET phase = 'shootout'
    WHERE id = ?
      AND status = 'live'
      AND phase = 'extra_time'
    `,
    [id]
  );
  return { finished: false, shootout: true };
}

/* Aggiorna il punteggio dei rigori (side: 'home' | 'away', delta: +1 / -1) */
async function updateShootoutScore(id, side, delta) {
  const column = side === 'away' ? 'away_shootout_score' : 'home_shootout_score';

  await db.execute(
    `
    UPDATE matches
    SET ${column} = GREATEST(0, ${column} + ?)
    WHERE id = ?
      AND status = 'live'
      AND phase = 'shootout'
    `,
    [Number(delta) || 0, id]
  );
  return true;
}

/* ============================================================
   SHOOTOUT TIRO-PER-TIRO
   ------------------------------------------------------------
   Ogni tiro è un match_event con goal_type='shootout':
     - segnato  → event_type='goal'          (conta nei marcatori)
     - sbagliato→ event_type='shootout_miss'  (solo tentativo)
   Il punteggio shootout (home/away_shootout_score) viene
   ricalcolato dai tiri segnati. NON tocca il punteggio
   dei tempi regolamentari.
============================================================ */

/* Ricalcola home/away_shootout_score dai gol shootout registrati */
async function recomputeShootoutScore(matchId) {
  const [mr] = await db.execute(
    `SELECT home_team_id, away_team_id FROM matches WHERE id = ?`, [matchId]
  );
  const m = mr[0];
  if (!m) return;

  const [rows] = await db.execute(
    `SELECT team_id, COUNT(*) AS made
       FROM match_events
      WHERE match_id = ? AND goal_type = 'shootout' AND event_type = 'goal' AND minute IS NULL
      GROUP BY team_id`,
    [matchId]
  );

  let home = 0, away = 0;
  rows.forEach(r => {
    if (String(r.team_id) === String(m.home_team_id)) home = Number(r.made);
    else if (String(r.team_id) === String(m.away_team_id)) away = Number(r.made);
  });

  await db.execute(
    `UPDATE matches SET home_shootout_score = ?, away_shootout_score = ? WHERE id = ?`,
    [home, away, matchId]
  );
}

/* Riepilogo shootout: tentativi e gol per lato */
async function getShootoutSummary(matchId) {
  const [mr] = await db.execute(
    `SELECT home_team_id, away_team_id FROM matches WHERE id = ?`, [matchId]
  );
  const m = mr[0];
  const res = { home: { made: 0, attempts: 0 }, away: { made: 0, attempts: 0 } };
  if (!m) return res;

  const [rows] = await db.execute(
    `SELECT team_id, event_type, COUNT(*) AS c
       FROM match_events
      WHERE match_id = ? AND goal_type = 'shootout' AND minute IS NULL
      GROUP BY team_id, event_type`,
    [matchId]
  );

  rows.forEach(r => {
    const side = String(r.team_id) === String(m.home_team_id) ? 'home'
               : String(r.team_id) === String(m.away_team_id) ? 'away' : null;
    if (!side) return;
    res[side].attempts += Number(r.c);
    if (r.event_type === 'goal') res[side].made += Number(r.c);
  });

  return res;
}

/* Aggiunge un tiro (scored=true → gol; false → errore) */
async function addShootoutKick(matchId, teamId, playerId, scored) {
  const [mr] = await db.execute(
    `SELECT status, phase FROM matches WHERE id = ?`, [matchId]
  );
  const match = mr[0];
  if (!match || match.status !== 'live' || match.phase !== 'shootout') {
    throw new Error('La partita non è in fase di shootout.');
  }

  const eventType = scored ? 'goal' : 'shootout_miss';
  const eventValue = scored ? 1 : 0;

  await db.execute(
    `INSERT INTO match_events (match_id, team_id, player_id, event_type, goal_type, event_value)
     VALUES (?, ?, ?, ?, 'shootout', ?)`,
    [matchId, teamId, playerId || null, eventType, eventValue]
  );

  await recomputeShootoutScore(matchId);
  return true;
}

/* Rimuove un tiro (solo se è un tiro shootout di questa partita) */
async function removeShootoutKick(matchId, eventId) {
  await db.execute(
    `DELETE FROM match_events
      WHERE id = ? AND match_id = ? AND goal_type = 'shootout'`,
    [eventId, matchId]
  );
  await recomputeShootoutScore(matchId);
  return true;
}

/*
  Chiusura dopo gli shootout.
  Regola: non può finire in pareggio. Si chiude solo se le due squadre
  hanno tentato lo STESSO numero di tiri e i gol sono DIVERSI.
*/
async function finishShootout(id) {
  const [mr] = await db.execute(
    `SELECT status, phase FROM matches WHERE id = ?`, [id]
  );
  const match = mr[0];
  if (!match || match.status !== 'live' || match.phase !== 'shootout') {
    throw new Error('La partita non è in fase di shootout.');
  }

  const s = await getShootoutSummary(id);
  if (s.home.attempts !== s.away.attempts) {
    throw new Error('Le due squadre devono aver tirato lo stesso numero di volte.');
  }
  if (s.home.made === s.away.made) {
    throw new Error('Non può finire in parità: serve un vincitore agli shootout.');
  }

  await db.execute(
    `
    UPDATE matches
    SET status = 'finished',
        phase = 'ended',
        ended_at = UTC_TIMESTAMP()
    WHERE id = ?
      AND status = 'live'
      AND phase = 'shootout'
    `,
    [id]
  );
  return true;
}

/* ============================================================
   FASE FINALE — TABELLONE A ELIMINAZIONE
   ------------------------------------------------------------
   Le partite del tabellone hanno group_id = NULL e usano:
     round = 'quarter' | 'semi' | 'final' | 'third'
     slot  = 'QF1'..'QF4' | 'SF1' | 'SF2' | 'FINAL' | 'THIRD'
============================================================ */

/*
  Classifica per girone (SOLO partite di girone: group_id NOT NULL),
  con la stessa regola punti della pagina classifiche:
    - vittoria nei tempi regolamentari: 3
    - pareggio deciso ai rigori: 2 al vincitore dei rigori, 1 al perdente
    - rigori non registrati / in parità: 1 a testa
  Le squadre del girone sono prese da group_teams (così compaiono
  anche quelle che non hanno ancora giocato).
  Ritorna: [{ id, name, teams: [ ...ordinate ] }] ordinato per nome girone.
*/
async function getGroupStandings() {
  const [groups] = await db.execute(
    `SELECT id, name FROM tournament_groups ORDER BY name ASC`
  );

  const [groupTeams] = await db.execute(
    `SELECT gt.group_id, gt.team_id, t.name
       FROM group_teams gt
       JOIN teams t ON t.id = gt.team_id`
  );

  const [matches] = await db.execute(
    `SELECT group_id, home_team_id, away_team_id, status,
            home_score, away_score, home_shootout_score, away_shootout_score
       FROM matches
      WHERE group_id IS NOT NULL`
  );

  const tables = {};               // groupId -> { teamId -> row }
  groups.forEach(g => { tables[g.id] = {}; });

  groupTeams.forEach(row => {
    if (!tables[row.group_id]) tables[row.group_id] = {};
    tables[row.group_id][row.team_id] = {
      id: row.team_id,
      name: row.name,
      played: 0, wins: 0, draws: 0, losses: 0,
      points: 0, goalsFor: 0, goalsAgainst: 0
    };
  });

  matches.forEach(m => {
    if (m.status !== 'finished') return;
    const t = tables[m.group_id];
    if (!t) return;

    const home = t[m.home_team_id];
    const away = t[m.away_team_id];
    if (!home || !away) return;    // squadra non presente in group_teams

    const hs = Number(m.home_score || 0);
    const as = Number(m.away_score || 0);

    home.played++; away.played++;
    home.goalsFor += hs; home.goalsAgainst += as;
    away.goalsFor += as; away.goalsAgainst += hs;

    if (hs > as) {
      home.wins++; home.points += 3; away.losses++;
    } else if (as > hs) {
      away.wins++; away.points += 3; home.losses++;
    } else {
      home.draws++; away.draws++;
      const hso = Number(m.home_shootout_score || 0);
      const aso = Number(m.away_shootout_score || 0);
      if (hso > aso)      { home.points += 2; away.points += 1; }
      else if (aso > hso) { away.points += 2; home.points += 1; }
      else                { home.points += 1; away.points += 1; }
    }
  });

  return groups.map(g => ({
    id: g.id,
    name: g.name,
    teams: Object.values(tables[g.id])
      .map(r => ({ ...r, goalDiff: r.goalsFor - r.goalsAgainst }))
      .sort((a, b) =>
        b.points - a.points ||
        b.goalDiff - a.goalDiff ||
        b.goalsFor - a.goalsFor ||
        a.name.localeCompare(b.name)
      )
  }));
}

/* Tutte le partite del tabellone (round valorizzato) */
async function getKnockoutMatches() {
  const [rows] = await db.execute(
    `SELECT id, round, slot, home_team_id, away_team_id, status,
            home_score, away_score, home_shootout_score, away_shootout_score
       FROM matches
      WHERE round IS NOT NULL`
  );
  return rows;
}

/* Vincitore / perdente di una partita (gestisce anche i rigori) */
function winnerLoserOf(match) {
  const hs = Number(match.home_score || 0);
  const as = Number(match.away_score || 0);
  if (hs > as) return { winner: match.home_team_id, loser: match.away_team_id };
  if (as > hs) return { winner: match.away_team_id, loser: match.home_team_id };

  const hso = Number(match.home_shootout_score || 0);
  const aso = Number(match.away_shootout_score || 0);
  if (hso > aso) return { winner: match.home_team_id, loser: match.away_team_id };
  if (aso > hso) return { winner: match.away_team_id, loser: match.home_team_id };

  return null; // esito non determinabile
}

/*
  GENERA I QUARTI ("chiudi gironi").
  Fotografa la classifica attuale dei 2 gironi e crea le 4 partite.
  Accoppiamenti:
    QF1: 1°A vs 4°B
    QF2: 2°B vs 3°A
    QF3: 1°B vs 4°A
    QF4: 2°A vs 3°B
  Idempotente: se i quarti esistono già non fa nulla.
*/
async function generateQuarterfinals(opts = {}) {
  const ko = await getKnockoutMatches();
  if (ko.some(m => m.round === 'quarter')) {
    return { created: 0, reason: 'already_exists' };
  }

  const standings = await getGroupStandings();
  if (standings.length < 2) {
    throw new Error('Servono almeno 2 gironi per generare i quarti.');
  }

  const A = standings[0].teams;  // Girone A (ordine alfabetico)
  const B = standings[1].teams;  // Girone B
  if (A.length < 4 || B.length < 4) {
    throw new Error('Ogni girone deve avere almeno 4 squadre per generare i quarti.');
  }

  const pairs = [
    { slot: 'QF1', home: A[0], away: B[3] }, // 1°A vs 4°B
    { slot: 'QF2', home: B[1], away: A[2] }, // 2°B vs 3°A
    { slot: 'QF3', home: B[0], away: A[3] }, // 1°B vs 4°A
    { slot: 'QF4', home: A[1], away: B[2] }, // 2°A vs 3°B
  ];

  let created = 0;
  for (const p of pairs) {
    await createMatch({
      group_id: null,
      home_team_id: p.home.id,
      away_team_id: p.away.id,
      match_date: opts.match_date || null,
      pitch_id: opts.pitch_id || null,
      referee_id: opts.referee_id || null,
      status: 'scheduled',
      round: 'quarter',
      slot: p.slot
    });
    created++;
  }

  return { created };
}

/*
  GENERA LE SEMIFINALI.
  Richiede i 4 quarti TUTTI terminati.
    SF1: vincente QF1 vs vincente QF2
    SF2: vincente QF3 vs vincente QF4
  Idempotente.
*/
async function generateSemifinals(opts = {}) {
  const ko = await getKnockoutMatches();
  if (ko.some(m => m.round === 'semi')) {
    return { created: 0, reason: 'already_exists' };
  }

  const quarters = ko.filter(m => m.round === 'quarter');
  if (quarters.length < 4) {
    throw new Error('I quarti non sono ancora stati generati.');
  }
  if (!quarters.every(m => m.status === 'finished')) {
    throw new Error('Tutti i quarti devono essere terminati prima di generare le semifinali.');
  }

  const bySlot = {};
  quarters.forEach(m => { bySlot[m.slot] = m; });

  const winnerOf = (slot) => {
    const r = winnerLoserOf(bySlot[slot]);
    if (!r) throw new Error(`Impossibile determinare il vincitore di ${slot}.`);
    return r.winner;
  };

  const pairs = [
    { slot: 'SF1', home: winnerOf('QF1'), away: winnerOf('QF2') },
    { slot: 'SF2', home: winnerOf('QF3'), away: winnerOf('QF4') },
  ];

  let created = 0;
  for (const p of pairs) {
    await createMatch({
      group_id: null,
      home_team_id: p.home,
      away_team_id: p.away,
      match_date: opts.match_date || null,
      pitch_id: opts.pitch_id || null,
      referee_id: opts.referee_id || null,
      status: 'scheduled',
      round: 'semi',
      slot: p.slot
    });
    created++;
  }

  return { created };
}

/*
  GENERA FINALE + FINALINA 3°/4°.
  Richiede le 2 semifinali TUTTE terminate.
    FINAL: vincente SF1 vs vincente SF2
    THIRD: perdente SF1 vs perdente SF2
  Idempotente.
*/
async function generateFinals(opts = {}) {
  const ko = await getKnockoutMatches();
  if (ko.some(m => m.round === 'final' || m.round === 'third')) {
    return { created: 0, reason: 'already_exists' };
  }

  const semis = ko.filter(m => m.round === 'semi');
  if (semis.length < 2) {
    throw new Error('Le semifinali non sono ancora state generate.');
  }
  if (!semis.every(m => m.status === 'finished')) {
    throw new Error('Tutte le semifinali devono essere terminate prima di generare la finale.');
  }

  const bySlot = {};
  semis.forEach(m => { bySlot[m.slot] = m; });

  const r1 = winnerLoserOf(bySlot['SF1']);
  const r2 = winnerLoserOf(bySlot['SF2']);
  if (!r1 || !r2) {
    throw new Error('Impossibile determinare vincitori/perdenti delle semifinali.');
  }

  const toCreate = [
    { round: 'final', slot: 'FINAL', home: r1.winner, away: r2.winner },
    { round: 'third', slot: 'THIRD', home: r1.loser,  away: r2.loser  },
  ];

  let created = 0;
  for (const c of toCreate) {
    await createMatch({
      group_id: null,
      home_team_id: c.home,
      away_team_id: c.away,
      match_date: opts.match_date || null,
      pitch_id: opts.pitch_id || null,
      referee_id: opts.referee_id || null,
      status: 'scheduled',
      round: c.round,
      slot: c.slot
    });
    created++;
  }

  return { created };
}

/* Svuota il tabellone (elimina TUTTE le partite knockout). Utile per ri-generare. */
async function deleteKnockoutMatches() {
  const [result] = await db.execute(`DELETE FROM matches WHERE round IS NOT NULL`);
  return result.affectedRows;
}

/* =========================
   CAMPI DA GIOCO (PITCHES)
========================= */
async function getPitches() {
  const [rows] = await db.execute(`SELECT id, name FROM pitches ORDER BY id ASC`);
  return rows;
}

module.exports = {
  createMatch,
  getMatches,
  getMatchById,
  updateMatch,
  deleteMatch,
  startMatch,
  finishMatch,
  resolveExtraTime,
  endFirstHalf,
  startSecondHalf,
  pauseTimer,
  resumeTimer,
  updateShootoutScore,
  finishShootout,

  // Shootout tiro-per-tiro
  addShootoutKick,
  removeShootoutKick,
  getShootoutSummary,

  // Fase finale
  getGroupStandings,
  getKnockoutMatches,
  generateQuarterfinals,
  generateSemifinals,
  generateFinals,
  deleteKnockoutMatches,

  // Campi
  getPitches
};