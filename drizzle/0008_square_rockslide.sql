CREATE TABLE `expenses` (
	`id` varchar(64) NOT NULL,
	`expenseType` enum('rent','utilities','maintenance','supplies','transportation','communication','other') NOT NULL,
	`description` text NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`currency` enum('LYD','USD','USDT') NOT NULL DEFAULT 'LYD',
	`paymentMethod` enum('cash','bank_transfer') DEFAULT 'cash',
	`treasuryAccountId` varchar(64),
	`expenseDate` varchar(20) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` varchar(64) NOT NULL,
	`createdByName` text NOT NULL,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salaries` (
	`id` varchar(64) NOT NULL,
	`employeeId` varchar(64) NOT NULL,
	`employeeName` text NOT NULL,
	`baseSalary` decimal(15,2) NOT NULL,
	`bonuses` decimal(15,2) DEFAULT '0',
	`deductions` decimal(15,2) DEFAULT '0',
	`totalSalary` decimal(15,2) NOT NULL,
	`currency` enum('LYD','USD','USDT') NOT NULL DEFAULT 'LYD',
	`salaryMonth` varchar(7) NOT NULL,
	`paymentMethod` enum('cash','bank_transfer') DEFAULT 'cash',
	`treasuryAccountId` varchar(64),
	`paymentDate` varchar(20) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` varchar(64) NOT NULL,
	`createdByName` text NOT NULL,
	CONSTRAINT `salaries_id` PRIMARY KEY(`id`)
);
