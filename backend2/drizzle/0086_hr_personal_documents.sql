CREATE TABLE `hr_personal_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `documentType` varchar(100) NOT NULL,
  `fileName` varchar(255) NOT NULL,
  `filePath` varchar(500) NOT NULL,
  `fileSize` int NULL,
  `mimeType` varchar(100) NULL,
  `version` int NOT NULL DEFAULT 1,
  `notes` text NULL,
  `uploadedBy` bigint NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
