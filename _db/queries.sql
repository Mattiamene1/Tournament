Queries

/***********************************************/
CREATE TABLE teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/***********************************************/

CREATE TABLE coaches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    team_id INT UNIQUE,
    CONSTRAINT fk_coach_team
        FOREIGN KEY (team_id) REFERENCES teams(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/***********************************************/

CREATE TABLE players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('POR','DIF','CEN','ATT','PRE') NOT NULL,
    rating ENUM('1','2','3','4','5'),
    shirt_number INT NOT NULL,
    team_id INT,

    UNIQUE (team_id, shirt_number),

    CONSTRAINT fk_player_team
        FOREIGN KEY (team_id) REFERENCES teams(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/***********************************************/

CREATE TABLE referees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/***********************************************/

CREATE TABLE pitches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/***********************************************/

CREATE TABLE tournament_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/***********************************************/

CREATE TABLE group_teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    team_id INT NOT NULL,
    UNIQUE (group_id, team_id),

    CONSTRAINT fk_gt_group
        FOREIGN KEY (group_id) REFERENCES tournament_groups(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_gt_team
        FOREIGN KEY (team_id) REFERENCES teams(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/***********************************************/

CREATE TABLE matches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT,
    home_team_id INT NOT NULL,
    away_team_id INT NOT NULL,
    match_date DATETIME,
    pitch_id INT,
    referee_id INT,
    status ENUM('scheduled','live','finished') DEFAULT 'scheduled',

    CONSTRAINT fk_match_group
        FOREIGN KEY (group_id) REFERENCES tournament_groups(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_match_home_team
        FOREIGN KEY (home_team_id) REFERENCES teams(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_match_away_team
        FOREIGN KEY (away_team_id) REFERENCES teams(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_match_pitch
        FOREIGN KEY (pitch_id) REFERENCES pitches(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_match_referee
        FOREIGN KEY (referee_id) REFERENCES referees(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE matches ADD COLUMN home_score INT DEFAULT 0;
ALTER TABLE matches ADD COLUMN away_score INT DEFAULT 0;
ALTER TABLE matches ADD COLUMN started_at DATETIME NULL,
ALTER TABLE matches ADD COLUMN ended_at DATETIME NULL;
/***********************************************/

CREATE TABLE bonuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    value INT DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/***********************************************/
CREATE TABLE match_events (
    id INT AUTO_INCREMENT PRIMARY KEY,

    match_id INT NOT NULL,
    team_id INT NOT NULL,

    player_id INT NULL,
    assist_player_id INT NULL,

    event_type ENUM(
        'goal',
        'assist',
        'yellow_card',
        'red_card',
        'second_yellow',
        'bonus'
    ) NOT NULL,

    goal_type ENUM(
        'azione',
        'punizione',
        'rigore',
        'shootout',
        'rigore_presidenziale'
    ) NULL,

    card_type ENUM(
        'yellow_card',
        'red_card',
        'second_yellow'
    ) NULL,

    bonus_id INT NULL,

    event_value INT DEFAULT 1,

    minute INT NULL,
    extra_minute INT NULL,

    notes VARCHAR(255) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    /* =========================
       FOREIGN KEYS
    ========================= */

    CONSTRAINT fk_event_match
        FOREIGN KEY (match_id) REFERENCES matches(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_event_team
        FOREIGN KEY (team_id) REFERENCES teams(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_event_player
        FOREIGN KEY (player_id) REFERENCES players(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_event_assist_player
        FOREIGN KEY (assist_player_id) REFERENCES players(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_event_bonus
        FOREIGN KEY (bonus_id) REFERENCES bonuses(id)
        ON DELETE SET NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/***********************************************/

CREATE TABLE chiosco_beers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_chiosco_team
        FOREIGN KEY (team_id) REFERENCES teams(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/***********************************************/


/ ** TEAMS **/
INSERT INTO teams (name) VALUES
('Shangai'),
('Bastioni'),
('CSP BLUETIGERS'),
('Slavatar'),
('Los Locos'),
('Sperminator');


/ ** PLAYERS - Shangai **/
INSERT INTO players (first_name, last_name, role, rating, team_id) VALUES
('David', 'Zanatta', 'ATT', '4', 1),
('Marco', 'Battistella', 'DIF', '3', 1),
('Andrea', 'Giovannelli', 'POR', '2', 1),
('Anthony', 'Cavanha', 'CEN', '5', 1),
('Enrico', 'Battistella', 'CEN', '3', 1),
('Nicholas', 'Rossetto', 'DIF', '2', 1),
('Nicola', 'Trabucco', 'ATT', '4', 1);

/ ** PLAYERS - Bastioni **/
INSERT INTO players (first_name, last_name, role, rating, team_id) VALUES
('Matteo', 'Amadio', 'POR', '3', 2),
('Tommaso', 'Fantelli', 'ATT', '4', 2),
('Riccardo', 'Zanetti', 'DIF', '2', 2),
('Alessio', 'Pinarello', 'DIF', '3', 2),
('Oussama', 'Sabir', 'CEN', '5', 2),
('Alessandro', 'Papa', 'CEN', '2', 2);

/ ** PLAYERS - CSP Bluetiger **/
INSERT INTO players (first_name, last_name, role, rating, team_id) VALUES
('Marco', 'Stefani', 'ATT', '5', 3),
('Riccardo', 'Fusco', 'CEN', '3', 3),
('Jacopo', 'Maso', 'POR', '2', 3),
('Michele', 'Marian', 'CEN', '4', 3),
('Luis', 'Marinello', 'ATT', '3', 3),
('Sandri', 'Nicholas', 'DIF', '2', 3),
('Alex', 'Nalesso', 'DIF', '4', 3);

/ ** PLAYERS - Slavatar **/
INSERT INTO players (first_name, last_name, role, rating, team_id) VALUES
('Mattia', 'Meneghin', 'POR', '3', 4),
('Alvise', 'Magli', 'CEN', '2', 4),
('Achraf', 'Rezzou', 'ATT', '5', 4),
('Alex', 'Sima', 'CEN', '3', 4),
('Mauro', 'Panziera', 'DIF', '3', 4),
('Daniel', 'Trevisan', 'DIF', '2', 4),
('Alessio', 'Visentin', 'ATT', '4', 4);

/ ** PLAYERS - Los Locos **/
INSERT INTO players (first_name, last_name, role, rating, team_id) VALUES
('Luca', 'Perazzetta', 'POR', '5', 5),
('Nicola', 'Zanatta', 'DIF', '3', 5),
('Leo', 'Calliman', 'CEN', '4', 5),
('Matteo', 'Agresti', 'ATT', '5', 5),
('Tommaso', 'Guizzo', 'CEN', '3', 5),
('Gianpi', 'Sgarbugaro', 'DIF', '2', 5),
('Matteo', 'Marcon', 'ATT', '4', 5);

/ ** PLAYERS - Sperminators **/
INSERT INTO players (first_name, last_name, role, rating, team_id) VALUES
('Luca', 'Perazzetta', 'POR', '5', 5),
('Nicola', 'Zanatta', 'DIF', '3', 5),
('Leo', 'Calliman', 'CEN', '4', 5),
('Matteo', 'Agresti', 'ATT', '5', 5),
('Tommaso', 'Guizzo', 'CEN', '3', 5),
('Gianpi', 'Sgarbugaro', 'DIF', '2', 5),
('Matteo', 'Marcon', 'ATT', '4', 5);

/* =========================
   MATCHES - GIRONE A
========================= */
INSERT INTO matches (group_id, home_team_id, away_team_id, match_date, pitch_id, referee_id, status) VALUES
(1, 1, 2, '2026-04-24 18:00:00', 1, 1, 'scheduled'),
(1, 2, 3, '2026-04-24 19:00:00', 1, 1, 'scheduled'),
(1, 3, 1, '2026-04-24 20:00:00', 1, 1, 'scheduled');

/* =========================
   MATCHES - GIRONE B
========================= */
INSERT INTO matches (group_id, home_team_id, away_team_id, match_date, pitch_id, referee_id, status) VALUES
(2, 4, 5, '2026-04-24 18:30:00', 1, 1, 'scheduled'),
(2, 5, 6, '2026-04-24 19:30:00', 1, 1, 'scheduled'),
(2, 6, 4, '2026-04-24 20:30:00', 1, 1, 'scheduled');

/* =========================
   EVENTI - PARTITA 4
========================= */
