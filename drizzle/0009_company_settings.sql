-- إنشاء جدول إعدادات الشركة
CREATE TABLE IF NOT EXISTS `company_settings` (
  `id` varchar(64) NOT NULL DEFAULT 'default',
  `company_name` text NOT NULL DEFAULT 'شركة ليبيا للخدمات المالية',
  `company_name_en` text,
  `slogan` text DEFAULT 'حلول مالية احترافية موثوقة وآمنة',
  `logo_url` text,
  `favicon_url` text,
  `primary_color` varchar(20) DEFAULT '#1E2E3D',
  `accent_color` varchar(20) DEFAULT '#C9A34D',
  `phone` varchar(50) DEFAULT '0920563695',
  `phone2` varchar(50),
  `email` varchar(255),
  `website` varchar(255),
  `address` text DEFAULT 'صبراته - ليبيا',
  `city` varchar(100) DEFAULT 'صبراته',
  `country` varchar(100) DEFAULT 'ليبيا',
  `license_number` varchar(100),
  `tax_number` varchar(100),
  `currency` varchar(10) DEFAULT 'LYD',
  `currency_symbol` varchar(10) DEFAULT 'د.ل',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

-- إدراج السجل الافتراضي
INSERT IGNORE INTO `company_settings` (`id`) VALUES ('default');
