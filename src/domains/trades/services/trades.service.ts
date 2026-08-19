import { Injectable } from '@nestjs/common';
import { CreateTradeDto } from '../dto/request/create-trade.dto';
import { GetTradesQueryDto } from '../dto/request/get-trades-query.dto';
import { TradeResponseDto } from '../dto/response/trade-response.dto';
import { TradeListResponseDto } from '../dto/response/trade-list-response.dto';
import { BusinessException } from 'src/common/exception/businessException';
import { TradesErrorCode } from '../errors/trades.error';
import { TradesRepository } from './trades.repository';

@Injectable()
export class TradesService {
  constructor(private readonly tradesRepository: TradesRepository) {}

  // 1. 체결 내역 생성
  async createTrade(
    userId: number,
    dto: CreateTradeDto,
  ): Promise<TradeResponseDto> {
    if (dto.price <= 0 || dto.quantity <= 0) {
      throw new BusinessException(
        TradesErrorCode.INVALID_TRADE_PRICE_OR_QUANTITY,
      );
    }

    // 중복 외부 체결 번호 확인
    const existing = await this.tradesRepository.findByExternalTradeId(
      dto.externalTradeId,
    );
    if (existing) {
      throw new BusinessException(TradesErrorCode.DUPLICATE_EXTERNAL_TRADE_ID);
    }

    const totalPrice = dto.price * dto.quantity;
    const trade = await this.tradesRepository.create(userId, dto, totalPrice);

    return TradeResponseDto.from(trade);
  }

  // 2. 체결 내역 목록 조회 (페이징 & 필터링)
  async getTrades(
    userId: number,
    query: GetTradesQueryDto,
  ): Promise<TradeListResponseDto> {
    const { items, totalCount, page, size } =
      await this.tradesRepository.findAll(userId, query);

    const responseItems = items.map((item) => TradeResponseDto.from(item));

    return TradeListResponseDto.of(responseItems, totalCount, page, size);
  }

  // 3. 체결 내역 단건 조회
  async getTradeById(idStr: string, userId: number): Promise<TradeResponseDto> {
    let id: bigint;
    try {
      id = BigInt(idStr);
    } catch {
      throw new BusinessException(TradesErrorCode.TRADE_NOT_FOUND);
    }

    const trade = await this.tradesRepository.findById(id, userId);
    if (!trade) {
      throw new BusinessException(TradesErrorCode.TRADE_NOT_FOUND);
    }

    return TradeResponseDto.from(trade);
  }
}
