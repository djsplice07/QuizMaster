
CREATE TABLE IF NOT EXISTS `game_state` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `game_data` longtext NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `player_intents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `payload` longtext NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `settings` (
  `id` int(11) NOT NULL,
  `admin_password` varchar(255) NOT NULL,
  `api_key` varchar(255) DEFAULT '',
  `join_url` varchar(255) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Initialize Game State
INSERT INTO `game_state` (`id`, `game_data`) VALUES (1, '{}') ON DUPLICATE KEY UPDATE `id`=1;

-- Initialize Settings with plaintext 'admin'. 
-- api.php will detect this, log you in, and automatically hash it.
INSERT INTO `settings` (`id`, `admin_password`, `api_key`, `join_url`) 
VALUES (1, 'admin', '', '') 
ON DUPLICATE KEY UPDATE `admin_password`='admin';
