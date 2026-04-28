CREATE TABLE `daily_operations` (
	`id` varchar(64) NOT NULL,
	`operationType` enum('card_withdrawal','transfer','aman_exchange','dollar_buy_sell','dollar_card_withdrawal','other') NOT NULL,
	`operationName` text NOT NULL,
	`customerName` text,
	`customerPhone` varchar(20),
	`baseAmount` decimal(15,2) NOT NULL,
	`percentage` decimal(5,2) DEFAULT '0',
	`commissionAmount` decimal(15,2) DEFAULT '0',
	`partnerShare` decimal(15,2) DEFAULT '0',
	`companyProfit` decimal(15,2) DEFAULT '0',
	`paymentMethod` enum('cash','bank_transfer') DEFAULT 'cash',
	`treasuryAccountId` varchar(64),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` varchar(64) NOT NULL,
	`createdByName` text NOT NULL,
	CONSTRAINT `daily_operations_id` PRIMARY KEY(`id`)
);
