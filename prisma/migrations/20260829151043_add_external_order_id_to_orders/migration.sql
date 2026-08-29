-- AlterTable
ALTER TABLE `orders` ADD COLUMN `externalOrderId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `orders_externalOrderId_key` ON `orders`(`externalOrderId`);
