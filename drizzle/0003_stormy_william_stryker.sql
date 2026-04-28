CREATE TABLE `unified_account` (
	`id` varchar(64) NOT NULL,
	`accountType` enum('main') NOT NULL DEFAULT 'main',
	`balanceLYD` decimal(15,2) NOT NULL DEFAULT '0',
	`balanceUSD` decimal(15,2) NOT NULL DEFAULT '0',
	`balanceUSDT` decimal(15,2) NOT NULL DEFAULT '0',
	`totalRevenueLYD` decimal(15,2) NOT NULL DEFAULT '0',
	`totalRevenueUSD` decimal(15,2) NOT NULL DEFAULT '0',
	`totalRevenueUSDT` decimal(15,2) NOT NULL DEFAULT '0',
	`totalExpensesLYD` decimal(15,2) NOT NULL DEFAULT '0',
	`totalExpensesUSD` decimal(15,2) NOT NULL DEFAULT '0',
	`totalExpensesUSDT` decimal(15,2) NOT NULL DEFAULT '0',
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `unified_account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `unified_transactions` (
	`id` varchar(64) NOT NULL,
	`transactionType` enum('revenue','expense') NOT NULL,
	`category` varchar(100) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`currency` enum('LYD','USD','USDT') NOT NULL,
	`description` text NOT NULL,
	`relatedEntityType` varchar(50),
	`relatedEntityId` varchar(64),
	`processedBy` varchar(64) NOT NULL,
	`processedByName` text NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`metadata` json,
	CONSTRAINT `unified_transactions_id` PRIMARY KEY(`id`)
);
