CREATE TABLE `auth_attempts` (
	`key` text NOT NULL,
	`window_start` text NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`key`, `window_start`)
);
--> statement-breakpoint
CREATE INDEX `auth_attempts_window_idx` ON `auth_attempts` (`window_start`);