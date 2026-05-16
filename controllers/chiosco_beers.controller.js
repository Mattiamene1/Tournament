const ChioscoBeer = require('../models/chiosco_beers.model');

/* CREATE */
async function createBeerEvent(req, res) {
  try {
    const id = await ChioscoBeer.createBeerEvent(req.body);
    res.status(201).json({ success: true, beer_event_id: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/* GET STANDINGS */
async function getChioscoStandings(req, res) {
  try {
    const standings = await ChioscoBeer.getChioscoStandings();
    res.json(standings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel recupero classifica chiosco' });
  }
}

/* GET EVENTS */
async function getBeerEvents(req, res) {
  try {
    const filters = {
      team_id: req.query.team_id
    };

    const events = await ChioscoBeer.getBeerEvents(filters);
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel recupero eventi chiosco' });
  }
}

/* DELETE */
async function deleteBeerEvent(req, res) {
  try {
    await ChioscoBeer.deleteBeerEvent(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createBeerEvent,
  getChioscoStandings,
  getBeerEvents,
  deleteBeerEvent
};