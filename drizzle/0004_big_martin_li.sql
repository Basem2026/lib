CREATE TABLE `account_transactions` (
	`id` varchar(64) NOT NULL,
	`transactionType` enum('capital_to_intermediary','intermediary_to_treasury','treasury_to_treasury','operation_revenue','operation_expense','expense','salary','adjustment') NOT NULL,
	`fromAccountType` enum('capital','intermediary','treasury'),
	`fromAccountId` varchar(64),
	`toAccountType` enum('capital','intermediary','treasury'),
	`toAccountId` varchar(64),
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
	CONSTRAINT `account_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `capital_account` (
	`id` varchar(64) NOT NULL,
	`accountName` varchar(100) NOT NULL DEFAULT 'رأس المال',
	`totalCapitalLYD` decimal(15,2) NOT NULL DEFAULT '0',
	`totalCapitalUSD` decimal(15,2) NOT NULL DEFAULT '0',
	`totalCapitalUSDT` decimal(15,2) NOT NULL DEFAULT '0',
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` varchar(64) NOT NULL,
	CONSTRAINT `capital_account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `intermediary_account` (
	`id` varchar(64) NOT NULL,
	`accountName` varchar(100) NOT NULL DEFAULT 'الحساب الوسطي',
	`balanceLYD` decimal(15,2) NOT NULL DEFAULT '0',
	`balanceUSD` decimal(15,2) NOT NULL DEFAULT '0',
	`balanceUSDT` decimal(15,2) NOT NULL DEFAULT '0',
	`isLocked` boolean NOT NULL DEFAULT false,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` varchar(64) NOT NULL,
	CONSTRAINT `intermediary_account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `treasury_accounts` (
	`id` varchar(64) NOT NULL,
	`accountType` enum('cash_lyd','cash_usd','cash_usdt','bank_account') NOT NULL,
	`accountName` varchar(100) NOT NULL,
	`balanceLYD` decimal(15,2) NOT NULL DEFAULT '0',
	`balanceUSD` decimal(15,2) NOT NULL DEFAULT '0',
	`balanceUSDT` decimal(15,2) NOT NULL DEFAULT '0',
	`bankName` varchar(100),
	`accountHolder` varchar(100),
	`accountNumber` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` varchar(64) NOT NULL,
	CONSTRAINT `treasury_accounts_id` PRIMARY KEY(`id`)
);
