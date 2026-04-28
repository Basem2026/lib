ALTER TABLE `account_transactions` ADD `amountLYD` decimal(15,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `account_transactions` ADD `amountUSD` decimal(15,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `account_transactions` ADD `amountUSDT` decimal(15,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `account_transactions` DROP COLUMN `amount`;--> statement-breakpoint
ALTER TABLE `account_transactions` DROP COLUMN `currency`;