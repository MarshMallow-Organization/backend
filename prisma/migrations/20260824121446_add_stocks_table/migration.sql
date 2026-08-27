-- CreateTable
CREATE TABLE `stocks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stockCode` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `market` VARCHAR(20) NOT NULL,
    `securityType` VARCHAR(30) NOT NULL,
    `isCommonShare` BOOLEAN NOT NULL,
    `isinCode` VARCHAR(20) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastSyncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stocks_stockCode_key`(`stockCode`),
    INDEX `stocks_name_idx`(`name`),
    INDEX `stocks_market_isActive_idx`(`market`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
