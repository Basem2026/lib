ALTER TABLE `cards` ADD `paymentMethod` enum('cash','bank_transfer') DEFAULT 'cash';--> statement-breakpoint
ALTER TABLE `cards` ADD `treasuryAccountId` varchar(64);