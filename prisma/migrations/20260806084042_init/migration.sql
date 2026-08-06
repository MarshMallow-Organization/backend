-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `visitCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `toss_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `apiKey` VARCHAR(191) NOT NULL,
    `secretKey` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `toss_accounts_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oauth_provider` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `oauth_provider_provider_key`(`provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oauth` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `providerKey` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `providerId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `oauth_providerId_providerKey_key`(`providerId`, `providerKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_pics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `imageUrl` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `profile_pics_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trades` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `externalTradeId` VARCHAR(191) NOT NULL,
    `tradeType` ENUM('BUY', 'SELL') NOT NULL,
    `corpCode` VARCHAR(191) NOT NULL,
    `corpName` VARCHAR(191) NOT NULL,
    `tradedAt` DATETIME(3) NOT NULL,
    `price` DECIMAL(15, 2) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `totalPrice` DECIMAL(20, 2) NOT NULL,
    `realizedProfit` DECIMAL(20, 2) NULL,
    `returnRate` DECIMAL(6, 2) NULL,
    `userId` INTEGER NOT NULL,
    `currenciesId` INTEGER NOT NULL,
    `ordersId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trades_externalTradeId_key`(`externalTradeId`),
    INDEX `trades_userId_tradedAt_idx`(`userId`, `tradedAt`),
    INDEX `trades_userId_tradeType_tradedAt_idx`(`userId`, `tradeType`, `tradedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `buy_diaries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `buyReason` VARCHAR(191) NOT NULL,
    `goalPrice` DECIMAL(15, 2) NOT NULL,
    `goalHoldPeriod` VARCHAR(50) NOT NULL,
    `emotion` INTEGER NOT NULL,
    `memo` VARCHAR(191) NOT NULL,
    `ordersId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `buy_diaries_ordersId_key`(`ordersId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sell_diaries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sellReasonCode` ENUM('GOAL_REACHED', 'STOP_LOSS', 'REBALANCING', 'PROFIT_TAKING', 'OTHER') NOT NULL DEFAULT 'GOAL_REACHED',
    `sellReasonDetail` VARCHAR(191) NOT NULL,
    `goalEvaluationCode` ENUM('KEPT_GOAL', 'SOLD_TOO_EARLY', 'SOLD_TOO_LATE', 'EMOTIONAL_SELL', 'AS_PLANNED', 'OTHER') NOT NULL,
    `goalEvaluationDetail` VARCHAR(191) NOT NULL,
    `emotion` INTEGER NOT NULL,
    `retrospectiveMemo` VARCHAR(191) NOT NULL,
    `ordersId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `sell_diaries_ordersId_key`(`ordersId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `virtual_portfolios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `virtual_portfolios_userId_sortOrder_idx`(`userId`, `sortOrder`),
    UNIQUE INDEX `virtual_portfolios_userId_name_key`(`userId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `virtual_portfolio_stocks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stockCode` VARCHAR(191) NOT NULL,
    `virtualPortfolioId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `virtual_portfolio_stocks_virtualPortfolioId_stockCode_key`(`virtualPortfolioId`, `stockCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorite_stocks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stockCode` VARCHAR(191) NOT NULL,
    `stockName` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `favorite_stocks_userId_stockCode_key`(`userId`, `stockCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hidden_stocks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stockCode` VARCHAR(191) NOT NULL,
    `stockName` VARCHAR(191) NOT NULL,
    `hiddenUntil` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `hidden_stocks_userId_stockCode_key`(`userId`, `stockCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderType` ENUM('MARKET', 'LIMIT', 'CONDITIONAL') NOT NULL DEFAULT 'MARKET',
    `tradeType` ENUM('BUY', 'SELL') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `price` DECIMAL(15, 2) NULL,
    `status` ENUM('PENDING', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `userId` INTEGER NOT NULL,
    `currenciesId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_conditions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `triggerPrice` DECIMAL(65, 30) NOT NULL,
    `expiredAt` DATETIME(3) NOT NULL,
    `orderId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `order_conditions_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `currencies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `currency` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `toss_accounts` ADD CONSTRAINT `toss_accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauth` ADD CONSTRAINT `oauth_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauth` ADD CONSTRAINT `oauth_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `oauth_provider`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_pics` ADD CONSTRAINT `profile_pics_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trades` ADD CONSTRAINT `trades_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trades` ADD CONSTRAINT `trades_currenciesId_fkey` FOREIGN KEY (`currenciesId`) REFERENCES `currencies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trades` ADD CONSTRAINT `trades_ordersId_fkey` FOREIGN KEY (`ordersId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `buy_diaries` ADD CONSTRAINT `buy_diaries_ordersId_fkey` FOREIGN KEY (`ordersId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sell_diaries` ADD CONSTRAINT `sell_diaries_ordersId_fkey` FOREIGN KEY (`ordersId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `virtual_portfolios` ADD CONSTRAINT `virtual_portfolios_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `virtual_portfolio_stocks` ADD CONSTRAINT `virtual_portfolio_stocks_virtualPortfolioId_fkey` FOREIGN KEY (`virtualPortfolioId`) REFERENCES `virtual_portfolios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorite_stocks` ADD CONSTRAINT `favorite_stocks_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hidden_stocks` ADD CONSTRAINT `hidden_stocks_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_currenciesId_fkey` FOREIGN KEY (`currenciesId`) REFERENCES `currencies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_conditions` ADD CONSTRAINT `order_conditions_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
