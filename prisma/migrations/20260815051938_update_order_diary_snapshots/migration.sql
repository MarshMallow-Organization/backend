/*
  Existing order snapshots are backfilled from their trades before corpCode and
  corpName become required. Run the preflight data checks before applying this
  migration because MySQL DDL statements commit implicitly.
*/
-- DropForeignKey
ALTER TABLE `diaries` DROP FOREIGN KEY `diaries_orderId_fkey`;

-- DropIndex
DROP INDEX `diaries_orderId_key` ON `diaries`;

-- AlterTable
ALTER TABLE `buy_diaries` MODIFY `buyReason` TEXT NOT NULL,
    MODIFY `goalPrice` DECIMAL(15, 2) NULL,
    MODIFY `memo` TEXT NULL;

-- Rename snapshot columns without losing existing diary data.
ALTER TABLE `diaries` RENAME COLUMN `candelChartAtUrl` TO `candleChartAtOrderUrl`,
    RENAME COLUMN `marketCapAtTrade` TO `marketCapAtOrder`,
    RENAME COLUMN `pbrAtTrade` TO `pbrAtOrder`,
    RENAME COLUMN `perAtTrade` TO `perAtOrder`;

-- AlterTable
ALTER TABLE `diaries`
    MODIFY `corpCode` VARCHAR(10) NOT NULL,
    MODIFY `corpName` VARCHAR(100) NOT NULL;

-- Add order snapshot columns as nullable so existing orders can be backfilled.
ALTER TABLE `orders` ADD COLUMN `candleChartAtOrderUrl` VARCHAR(2048) NULL,
    ADD COLUMN `corpCode` VARCHAR(10) NULL,
    ADD COLUMN `corpName` VARCHAR(100) NULL,
    ADD COLUMN `marketCapAtOrder` DECIMAL(20, 2) NULL,
    ADD COLUMN `pbrAtOrder` DECIMAL(15, 2) NULL,
    ADD COLUMN `perAtOrder` DECIMAL(15, 2) NULL;

-- Backfill only orders whose trades all refer to one consistent company.
UPDATE `orders` AS `o`
INNER JOIN (
    SELECT
        `ordersId`,
        MIN(`corpCode`) AS `corpCode`,
        MIN(`corpName`) AS `corpName`
    FROM `trades`
    GROUP BY `ordersId`
    HAVING COUNT(DISTINCT `corpCode`) = 1
       AND COUNT(DISTINCT `corpName`) = 1
) AS `t` ON `t`.`ordersId` = `o`.`id`
SET `o`.`corpCode` = `t`.`corpCode`,
    `o`.`corpName` = `t`.`corpName`;

-- Enforce the final schema. Preflight must confirm every order can be backfilled.
ALTER TABLE `orders`
    MODIFY `corpCode` VARCHAR(10) NOT NULL,
    MODIFY `corpName` VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE `sell_diaries` ALTER COLUMN `sellReasonCode` DROP DEFAULT,
    MODIFY `sellReasonDetail` VARCHAR(191) NULL,
    MODIFY `goalEvaluationCode` ENUM('KEPT_GOAL', 'SOLD_TOO_EARLY', 'SOLD_TOO_LATE', 'EMOTIONAL_SELL', 'AS_PLANNED', 'OTHER') NULL,
    MODIFY `goalEvaluationDetail` VARCHAR(191) NULL,
    MODIFY `memo` TEXT NULL;

-- CreateIndex
CREATE INDEX `diaries_orderId_deletedAt_idx` ON `diaries`(`orderId`, `deletedAt`);

-- AddForeignKey
ALTER TABLE `diaries` ADD CONSTRAINT `diaries_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
