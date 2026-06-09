const MatchEvent = require('../models/match_events.model');
const Bonus = require('../models/bonuses.model');

/* CREATE */
async function createMatchEvent(req, res) {
  try {
    const data = req.body;

    if (!data.match_id || !data.team_id || !data.event_type || !data.minute) {
      return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    }

    await MatchEvent.createMatchEvent(data);

    // ⚽ GOAL STANDARD
    if (data.event_type === 'goal') {
      await MatchEvent.updateMatchScore(data.match_id, data.team_id, 1);
    }

    // ⭐ BONUS
    if (data.event_type === 'bonus') {
      const bonus = await Bonus.getBonusById(data.bonus_id);

      if (!bonus) {
        return res.status(404).json({ error: 'Bonus non trovato' });
      }

      // 👉 opzionale: gestisci esito
      if (data.outcome === 'missed') {
        return res.json({ success: true }); // nessun gol
      }

      const goalsToAdd = Number(bonus.goal_value || 0);

      if (goalsToAdd > 0) {
        await MatchEvent.updateMatchScore(
          data.match_id,
          data.team_id,
          goalsToAdd
        );
      }
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
  - bonus → goal_value del bonus (getMatchEventById restituisce già bonus_value
            tramite il JOIN sulla tabella bonuses)
  - altro → 0
  Rispecchia la logica di createMatchEvent, così update/delete possono
  "annullare" o "riapplicare" l'effetto sullo score in modo coerente.
*/
function scoreDeltaForEvent(event) {
  if (!event) return 0;
  if (event.event_type === 'goal') return 1;
  if (event.event_type === 'bonus') return Number(event.bonus_value || 0);
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

    // 2) applico la modifica
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