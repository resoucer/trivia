CREATE TABLE IF NOT EXISTS `password_credentials` (
	`user_id` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `plays` (
	`id` text PRIMARY KEY NOT NULL,
	`trivia_id` text NOT NULL,
	`correct_count` integer NOT NULL,
	`total_count` integer NOT NULL,
	`played_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `plays_trivia_idx` ON `plays` (`trivia_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `trivia_claims` (
	`trivia_id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `trivias` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`owner_type` text NOT NULL,
	`owner_user_id` text,
	`author_name` text NOT NULL,
	`questions_json` text NOT NULL,
	`play_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_activity_at` text NOT NULL,
	CONSTRAINT "trivias_owner_type_check" CHECK("trivias"."owner_type" IN ('anonymous', 'user')),
	CONSTRAINT "trivias_owner_user_check" CHECK(("trivias"."owner_type" = 'user') = ("trivias"."owner_user_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `trivias_owner_play_idx` ON `trivias` (`owner_type`,`play_count`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `trivias_owner_created_idx` ON `trivias` (`owner_type`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `trivias_owner_user_idx` ON `trivias` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `trivias_activity_idx` ON `trivias` (`owner_type`,`last_activity_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);