/*
  Warnings:

  - The primary key for the `buy_diaries` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `buy_diaries` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `buy_diaries` table. All the data in the column will be lost.
  - You are about to drop the column `ordersId` on the `buy_diaries` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `buy_diaries` table. All the data in the column will be lost.
  - You are about to alter the column `goalHoldPeriod` on the `buy_diaries` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Enum(EnumId(2))`.
  - The values [CONDITIONAL] on the enum `orders_orderType` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `sell_diaries` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `sell_diaries` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `sell_diaries` table. All the data in the column will be lost.
  - You are about to drop the column `ordersId` on the `sell_diaries` table. All the data in the column will be lost.
  - You are about to drop the column `retrospectiveMemo` on the `sell_diaries` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `sell_diaries` table. All the data in the column will be lost.
  - Added the required column `diaryId` to the `buy_diaries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `diaryId` to the `sell_diaries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `memo` to the `sell_diaries` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `buy_diaries` DROP FOREIGN KEY `buy_diaries_ordersId_fkey`;

-- DropForeignKey
ALTER TABLE `sell_diaries` DROP FOREIGN KEY `sell_diaries_ordersId_fkey`;

-- DropIndex
DROP INDEX `buy_diaries_ordersId_key` ON `buy_diaries`;

-- DropIndex
DROP INDEX `sell_diaries_ordersId_key` ON `sell_diaries`;

-- AlterTable
ALTER TABLE `buy_diaries` DROP PRIMARY KEY,
    DROP COLUMN `createdAt`,
    DROP COLUMN `id`,
    DROP COLUMN `ordersId`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `customGoalHoldPeriod` VARCHAR(255) NULL,
    ADD COLUMN `diaryId` INTEGER NOT NULL,
    MODIFY `goalHoldPeriod` ENUM('SHORT_TERM', 'MID_TERM', 'LONG_TERM', 'CUSTOM') NULL,
    ADD PRIMARY KEY (`diaryId`);

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `orderCategory` ENUM('GENERAL', 'CONDITIONAL') NOT NULL DEFAULT 'GENERAL',
    MODIFY `orderType` ENUM('MARKET', 'LIMIT') NOT NULL DEFAULT 'MARKET';

-- AlterTable
ALTER TABLE `sell_diaries` DROP PRIMARY KEY,
    DROP COLUMN `createdAt`,
    DROP COLUMN `id`,
    DROP COLUMN `ordersId`,
    DROP COLUMN `retrospectiveMemo`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `diaryId` INTEGER NOT NULL,
    ADD COLUMN `memo` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`diaryId`);

-- CreateTable
CREATE TABLE `diaries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('BUY', 'SELL') NOT NULL,
    `date` DATE NOT NULL,
    `corpCode` VARCHAR(191) NOT NULL,
    `corpName` VARCHAR(191) NOT NULL,
    `perAtTrade` DECIMAL(15, 2) NULL,
    `pbrAtTrade` DECIMAL(15, 2) NULL,
    `marketCapAtTrade` DECIMAL(20, 2) NULL,
    `candelChartAtUrl` VARCHAR(2048) NULL,
    `deletedAt` DATETIME(3) NULL,
    `userId` INTEGER NOT NULL,
    `orderId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `diaries_orderId_key`(`orderId`),
    INDEX `diaries_userId_deletedAt_date_idx`(`userId`, `deletedAt`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `diaries` ADD CONSTRAINT `diaries_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diaries` ADD CONSTRAINT `diaries_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `buy_diaries` ADD CONSTRAINT `buy_diaries_diaryId_fkey` FOREIGN KEY (`diaryId`) REFERENCES `diaries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sell_diaries` ADD CONSTRAINT `sell_diaries_diaryId_fkey` FOREIGN KEY (`diaryId`) REFERENCES `diaries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
