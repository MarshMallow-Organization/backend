/*
  Warnings:

  - `virtual_portfolio_stocks`에 `userId`가 추가되고 유니크 제약이
    (virtualPortfolioId, stockCode) → (userId, stockCode)로 바뀝니다.
    같은 사용자가 같은 종목을 두 가상계좌에 담고 있었다면 실패합니다.

  주의: 이 파일은 손으로 작성했습니다. `prisma migrate diff`(7.8.0)가
  virtualPortfolioId FK를 DROP만 하고 되돌리지 않으며, 이미 존재하는
  orders_userId_fkey를 중복 추가하려 해 그대로 쓸 수 없었습니다.
*/

-- DropForeignKey
-- 삭제할 유니크 인덱스가 이 FK를 뒷받침하고 있어 FK를 먼저 떼어낸다.
ALTER TABLE `virtual_portfolio_stocks` DROP FOREIGN KEY `virtual_portfolio_stocks_virtualPortfolioId_fkey`;

-- DropIndex
DROP INDEX `virtual_portfolio_stocks_virtualPortfolioId_stockCode_key` ON `virtual_portfolio_stocks`;

-- AlterTable
ALTER TABLE `virtual_portfolio_stocks` ADD COLUMN `userId` INTEGER NOT NULL;

-- CreateIndex
-- 위 유니크 인덱스가 사라져 계좌별 조회 인덱스가 없어지므로 따로 만든다.
CREATE INDEX `virtual_portfolio_stocks_virtualPortfolioId_idx` ON `virtual_portfolio_stocks`(`virtualPortfolioId`);

-- CreateIndex
CREATE UNIQUE INDEX `virtual_portfolio_stocks_userId_stockCode_key` ON `virtual_portfolio_stocks`(`userId`, `stockCode`);

-- AddForeignKey
-- 맨 위에서 떼어낸 FK를 원래대로 되돌린다.
ALTER TABLE `virtual_portfolio_stocks` ADD CONSTRAINT `virtual_portfolio_stocks_virtualPortfolioId_fkey` FOREIGN KEY (`virtualPortfolioId`) REFERENCES `virtual_portfolios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `virtual_portfolio_stocks` ADD CONSTRAINT `virtual_portfolio_stocks_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
