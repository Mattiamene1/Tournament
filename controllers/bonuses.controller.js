const Bonus = require('../models/bonuses.model');

async function createBonus(req, res) {
  try {
    const id = await Bonus.createBonus(req.body);
    res.status(201).json({ success: true, bonus_id: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getBonuses(req, res) {
  try {
    const bonuses = await Bonus.getBonuses({
      active: req.query.active
    });

    res.json(bonuses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getBonusById(req, res) {
  try {
    const bonus = await Bonus.getBonusById(req.params.id);

    if (!bonus) {
      return res.status(404).json({ error: 'Bonus not found' });
    }

    res.json(bonus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateBonus(req, res) {
  try {
    await Bonus.updateBonus(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteBonus(req, res) {
  try {
    await Bonus.deleteBonus(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createBonus,
  getBonuses,
  getBonusById,
  updateBonus,
  deleteBonus
};