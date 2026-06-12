const MatchEvent = require('../models/match_events.model');
const Bonus = require('../models/bonuses.model');

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

/* CREATE */
async function createMatchEvent(req, res) {
  try {
    const data = req.body;

    if (!data.match_id || !data.team_id || !data.event_type || !data.minute) {
      return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    }

    // Imposta bonus_outcome / event_value per i bonus
    await applyBonusOutcome(data);

    await MatchEvent.createMatchEvent(data);

    // Punteggio: gol = +1; bonus = +event_value (0 se sbagliato/accaduto)
    if (data.event_type === 'goal') {
      await MatchEvent.updateMatchScore(data.match_id, data.team_id, 1);
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
  if (event.event_type === 'goal') return 1;
  if (event.event_type === 'bonus') return Number(event.event_value || 0);
  return 0;
}

/* UPDATE */
async function updateMatchEvent(req, res) {
  try {
    // 1) annullo l'effetto del vecchio evento sul punteggio
    const oldEvent = await MatchEvent.getMatchEventById(req.params.id);
    if (oldEvent) {
      const oldDelta = scoreDeltaForEvent(oldEvent);
      if (oldDelta > 0) {
        await MatchEvent.updateMatchScore(oldEvent.match_id, oldEvent.team_id, -oldDelta);
      }
    }

    // 2) applico la modifica (normalizzando prima l'esito bonus)
    await applyBonusOutcome(req.body);
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