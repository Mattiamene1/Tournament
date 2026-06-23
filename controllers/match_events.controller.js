const MatchEvent = require('../models/match_events.model');
const Bonus = require('../models/bonuses.model');
const Player = require('../models/players.model');
const Match = require('../models/matches.model');

/*
  Normalizza un evento bonus in base all'esito scelto:
    bonus_outcome = 'scored' | 'missed' | 'happened'
    event_value   = gol del bonus se 'scored', altrimenti 0
  Per gli eventi non-bonus azzera bonus_outcome.
  (Muta l'oggetto data passato.)
*/
async function applyBonusOutcome(data) {
  if (data.event_type !== 'bonus') {
    data.bonus_outcome = null;
    return;
  }

  const bonus = await Bonus.getBonusById(data.bonus_id);
  if (!bonus) throw new Error('Bonus non trovato');

  const outcome = data.bonus_outcome || data.outcome || 'scored';
  data.bonus_outcome = outcome;
  data.event_value = (outcome === 'scored') ? Number(bonus.goal_value || 0) : 0;
}

/*
  Validazioni di dominio per gol e cartellini.
  Ritorna una stringa d'errore se l'evento NON è valido, altrimenti null.
  Può MUTARE `data` (il 2° giallo diventa una doppia ammonizione/espulsione).
  `excludeId` serve in update per ignorare l'evento che si sta modificando.
*/
async function validateEventRules(data, excludeId = null) {
  // ── GOL ─────────────────────────────────────────────────────────────
  if (data.event_type === 'goal') {
    // marcatore e assist non possono essere lo stesso giocatore
    if (data.assist_player_id &&
        Number(data.assist_player_id) === Number(data.player_id)) {
      return 'Il marcatore e l\u2019assist non possono essere lo stesso giocatore.';
    }
    // un presidente (PRE) non può segnare
    if (data.player_id) {
      const scorer = await Player.getPlayerById(data.player_id);
      if (scorer && scorer.role === 'PRE') {
        return 'Un presidente (PRE) non può segnare un gol.';
      }
    }
    // …né fare assist
    if (data.assist_player_id) {
      const assistant = await Player.getPlayerById(data.assist_player_id);
      if (assistant && assistant.role === 'PRE') {
        return 'Un presidente (PRE) non può fare un assist.';
      }
    }

    // un giocatore espulso non può partecipare a eventi successivi
    if (data.player_id) {
      const cards = await MatchEvent.getPlayerCards(data.match_id, data.player_id, excludeId);
      if (cards.some(c => c.event_type === 'red_card' || c.event_type === 'second_yellow')) {
        return 'Giocatore espulso: non può segnare.';
      }
    }
    if (data.assist_player_id) {
      const cards = await MatchEvent.getPlayerCards(data.match_id, data.assist_player_id, excludeId);
      if (cards.some(c => c.event_type === 'red_card' || c.event_type === 'second_yellow')) {
        return 'Giocatore espulso: non può fare assist.';
      }
    }
  }

  // ── CARTELLINI ──────────────────────────────────────────────────────
  if ((data.event_type === 'yellow_card' || data.event_type === 'red_card') &&
      data.player_id) {
    const cards = await MatchEvent.getPlayerCards(data.match_id, data.player_id, excludeId);

    // giocatore già espulso (rosso diretto o doppia ammonizione): stop
    const alreadyExpelled = cards.some(c =>
      c.event_type === 'red_card' || c.event_type === 'second_yellow');
    if (alreadyExpelled) {
      return 'Giocatore già espulso: non è possibile registrare altri cartellini.';
    }

    // doppio giallo = espulsione: il 2° giallo diventa "doppia ammonizione"
    if (data.event_type === 'yellow_card') {
      const yellows = cards.filter(c => c.event_type === 'yellow_card').length;
      if (yellows >= 1) {
        data.event_type = 'second_yellow';
        data.card_type  = 'second_yellow';
      }
    }
  }

  return null;
}

/* CREATE */
async function createMatchEvent(req, res) {
  try {
    const data = req.body;

    if (!data.match_id || !data.team_id || !data.event_type || !data.minute) {
      return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    }

    // Imposta bonus_outcome / event_value per i bonus
    await applyBonusOutcome(data);

    // Regole di dominio (gol presidente/assist uguale, doppio giallo, ecc.)
    const ruleError = await validateEventRules(data);
    if (ruleError) {
      return res.status(400).json({ error: ruleError });
    }

    // Evento Dado: neutro e informativo → registrato per ENTRAMBE le squadre
    if (data.event_type === 'dado') {
      const match = await Match.getMatchById(data.match_id);
      if (!match) {
        return res.status(404).json({ error: 'Partita non trovata' });
      }
      for (const tid of [match.home_team_id, match.away_team_id]) {
        await MatchEvent.createMatchEvent({ ...data, team_id: tid, player_id: null });
      }
      return res.json({ success: true });
    }

    // Regola: ogni squadra ha UN solo Rigore Presidenziale
    if (data.event_type === 'goal' && data.goal_type === 'rigore_presidenziale') {
      const used = await MatchEvent.countGoalType(data.match_id, data.team_id, 'rigore_presidenziale');
      if (used >= 1) {
        return res.status(400).json({ error: 'Rigore presidenziale già utilizzato da questa squadra.' });
      }
    }

    // Regola: ogni squadra può usare UNA SOLA carta speciale
    if (data.event_type === 'special_card') {
      const used = await MatchEvent.countEventType(data.match_id, data.team_id, 'special_card');
      if (used >= 1) {
        return res.status(400).json({ error: 'Questa squadra ha già usato la sua carta speciale.' });
      }
    }

    await MatchEvent.createMatchEvent(data);

    // Punteggio: gol = +event_value (1, oppure 2 se "vale doppio");
    //            bonus = +event_value (0 se sbagliato/accaduto)
    if (data.event_type === 'goal') {
      await MatchEvent.updateMatchScore(data.match_id, data.team_id, Number(data.event_value) || 1);
    } else if (data.event_type === 'bonus' && Number(data.event_value) > 0) {
      await MatchEvent.updateMatchScore(data.match_id, data.team_id, Number(data.event_value));
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/* GET ALL */
async function getMatchEvents(req, res) {
  try {
    const filters = {
      match_id: req.query.match_id,
      team_id: req.query.team_id,
      player_id: req.query.player_id,
      event_type: req.query.event_type
    };

    const events = await MatchEvent.getMatchEvents(filters);
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel recupero eventi partita' });
  }
}

/* GET BY ID */
async function getMatchEventById(req, res) {
  try {
    const event = await MatchEvent.getMatchEventById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Match event not found' });
    }

    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/*
  Calcola quanti gol vale un evento ai fini del punteggio del tabellone.
  - goal  → 1
  - bonus → event_value memorizzato (gol del bonus se "segnato", 0 se
            "sbagliato"/"accaduto"), così update/delete restano coerenti
  - altro → 0
*/
function scoreDeltaForEvent(event) {
  if (!event) return 0;
  if (event.event_type === 'goal')  return Number(event.event_value || 1);
  if (event.event_type === 'bonus') return Number(event.event_value || 0);
  return 0;
}

/* UPDATE */
async function updateMatchEvent(req, res) {
  try {
    // 0) normalizzo l'esito bonus e valido le regole PRIMA di toccare il punteggio
    await applyBonusOutcome(req.body);

    const ruleError = await validateEventRules(req.body, req.params.id);
    if (ruleError) {
      return res.status(400).json({ error: ruleError });
    }

    // 1) annullo l'effetto del vecchio evento sul punteggio
    const oldEvent = await MatchEvent.getMatchEventById(req.params.id);
    if (oldEvent) {
      const oldDelta = scoreDeltaForEvent(oldEvent);
      if (oldDelta > 0) {
        await MatchEvent.updateMatchScore(oldEvent.match_id, oldEvent.team_id, -oldDelta);
      }
    }

    // 2) applico la modifica

    // Regola: un solo Rigore Presidenziale per squadra (escludo l'evento corrente)
    if (req.body.event_type === 'goal' && req.body.goal_type === 'rigore_presidenziale') {
      const used = await MatchEvent.countGoalType(
        req.body.match_id, req.body.team_id, 'rigore_presidenziale', req.params.id
      );
      if (used >= 1) {
        // ripristino l'effetto del vecchio evento sul punteggio prima di uscire
        if (oldEvent) {
          const restoreDelta = scoreDeltaForEvent(oldEvent);
          if (restoreDelta > 0) {
            await MatchEvent.updateMatchScore(oldEvent.match_id, oldEvent.team_id, restoreDelta);
          }
        }
        return res.status(400).json({ error: 'Rigore presidenziale già utilizzato da questa squadra.' });
      }
    }

    await MatchEvent.updateMatchEvent(req.params.id, req.body);

    // 3) applico l'effetto del nuovo evento (gestisce cambio squadra/tipo/bonus)
    const newEvent = await MatchEvent.getMatchEventById(req.params.id);
    if (newEvent) {
      const newDelta = scoreDeltaForEvent(newEvent);
      if (newDelta > 0) {
        await MatchEvent.updateMatchScore(newEvent.match_id, newEvent.team_id, newDelta);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/* DELETE */
async function deleteMatchEvent(req, res) {
  try {
    // annullo l'effetto sul punteggio prima di cancellare
    const event = await MatchEvent.getMatchEventById(req.params.id);
    if (event) {
      const delta = scoreDeltaForEvent(event);
      if (delta > 0) {
        await MatchEvent.updateMatchScore(event.match_id, event.team_id, -delta);
      }
    }

    await MatchEvent.deleteMatchEvent(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createMatchEvent,
  getMatchEvents,
  getMatchEventById,
  updateMatchEvent,
  deleteMatchEvent
};