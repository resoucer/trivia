CREATE TABLE `play_dedup` (
	`trivia_id` text NOT NULL,
	`visitor_key` text NOT NULL,
	`day` text NOT NULL,
	`play_id` text NOT NULL,
	PRIMARY KEY(`trivia_id`, `visitor_key`, `day`)
);
--> statement-breakpoint
CREATE INDEX `play_dedup_day_idx` ON `play_dedup` (`day`);