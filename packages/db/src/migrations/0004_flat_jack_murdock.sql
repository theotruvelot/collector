CREATE TABLE `price_offer` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`article_id` text NOT NULL,
	`buyer_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`proposed_price` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `chat`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`article_id`) REFERENCES `article`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`buyer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`seller_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `priceOffer_chatId_idx` ON `price_offer` (`chat_id`);--> statement-breakpoint
CREATE INDEX `priceOffer_buyerId_idx` ON `price_offer` (`buyer_id`);--> statement-breakpoint
CREATE INDEX `priceOffer_sellerId_idx` ON `price_offer` (`seller_id`);--> statement-breakpoint
CREATE INDEX `priceOffer_status_idx` ON `price_offer` (`status`);