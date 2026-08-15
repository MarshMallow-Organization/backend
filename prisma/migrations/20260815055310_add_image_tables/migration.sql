/*
  Warnings:

  - You are about to drop the column `candleChartAtOrderUrl` on the `diaries` table. All the data in the column will be lost.
  - You are about to drop the column `candleChartAtOrderUrl` on the `orders` table. All the data in the column will be lost.
  - The primary key for the `profile_pics` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `profile_pics` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `profile_pics` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `profile_pics` table. All the data in the column will be lost.
  - Added the required column `imageId` to the `profile_pics` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `diaries` DROP COLUMN `candleChartAtOrderUrl`;

-- AlterTable
ALTER TABLE `orders` DROP COLUMN `candleChartAtOrderUrl`;

-- AlterTable
ALTER TABLE `profile_pics` DROP PRIMARY KEY,
    DROP COLUMN `createdAt`,
    DROP COLUMN `id`,
    DROP COLUMN `imageUrl`,
    ADD COLUMN `imageId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`imageId`);

-- CreateTable
CREATE TABLE `images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `imageUrl` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `snapshot` (
    `imageId` INTEGER NOT NULL,
    `orderId` INTEGER NOT NULL,

    UNIQUE INDEX `snapshot_orderId_key`(`orderId`),
    PRIMARY KEY (`imageId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profile_pics` ADD CONSTRAINT `profile_pics_imageId_fkey` FOREIGN KEY (`imageId`) REFERENCES `images`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `snapshot` ADD CONSTRAINT `snapshot_imageId_fkey` FOREIGN KEY (`imageId`) REFERENCES `images`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `snapshot` ADD CONSTRAINT `snapshot_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
