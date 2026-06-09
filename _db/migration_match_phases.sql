-- ============================================================
--  Migrazione: rigori (shootout) + cronometro a 2 tempi
--  La colonna `phase` ESISTE GIÀ:
--    ENUM('not_started','first_half','halftime','second_half','ended')
--  Qui aggiungiamo SOLO il valore 'shootout' e le colonne mancanti.
--  Eseguire UNA volta sul database, PRIMA di usare il codice aggiornato.
-- ============================================================

-- 1) Aggiungo il valore 'shootout' all'ENUM esistente (gli altri restano invariati)
ALTER TABLE matches
  MODIFY COLUMN phase
    ENUM('not_started','first_half','halftime','second_half','shootout','ended')
    DEFAULT 'not_started';

-- 2) Nuove colonne (home_score/away_score/started_at/ended_at esistono già)
ALTER TABLE matches
  ADD COLUMN first_half_ended_at    DATETIME NULL DEFAULT NULL,
  ADD COLUMN second_half_started_at DATETIME NULL DEFAULT NULL,
  ADD COLUMN home_shootout_score INT NOT NULL DEFAULT 0,
  ADD COLUMN away_shootout_score INT NOT NULL DEFAULT 0;

-- 3) Backfill: eventuali partite GIÀ "live" passano al "primo tempo",
--    altrimenti avrebbero phase = 'not_started' e nessun comando di fase.
UPDATE matches
SET phase = 'first_half'
WHERE status = 'live' AND phase IN ('not_started');
