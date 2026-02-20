CREATE TABLE `article` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text NOT NULL,
	`price` real NOT NULL,
	`shipping_cost` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`category_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`seller_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `article_slug_unique` ON `article` (`slug`);--> statement-breakpoint
CREATE INDEX `article_categoryId_idx` ON `article` (`category_id`);--> statement-breakpoint
CREATE INDEX `article_sellerId_idx` ON `article` (`seller_id`);--> statement-breakpoint
CREATE INDEX `article_status_idx` ON `article` (`status`);--> statement-breakpoint
CREATE TABLE `article_image` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`url` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `article`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `articleImage_articleId_idx` ON `article_image` (`article_id`);--> statement-breakpoint
CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_slug_unique` ON `category` (`slug`);--> statement-breakpoint
CREATE TABLE `notification` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`article_id` text,
	`read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`article_id`) REFERENCES `article`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `notification_userId_idx` ON `notification` (`user_id`);--> statement-breakpoint
CREATE INDEX `notification_read_idx` ON `notification` (`read`);--> statement-breakpoint
CREATE TABLE `order` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`buyer_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`amount` real NOT NULL,
	`commission` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `article`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`buyer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`seller_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `order_buyerId_idx` ON `order` (`buyer_id`);--> statement-breakpoint
CREATE INDEX `order_sellerId_idx` ON `order` (`seller_id`);--> statement-breakpoint
CREATE INDEX `order_articleId_idx` ON `order` (`article_id`);--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`old_price` real NOT NULL,
	`new_price` real NOT NULL,
	`changed_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `article`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `priceHistory_articleId_idx` ON `price_history` (`article_id`);