import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { StubAuthGuard } from 'src/common/auth/stubAuth.guard';
import { HiddenStockService } from './hidden-stock.service';
import { PostHiddenStockDto } from './dto/post-hidden-stock.dto';

@Controller('users/me/hidden-stocks')
@UseGuards(StubAuthGuard)
export class HiddenStockController {
  constructor(private readonly hiddenStockService: HiddenStockService) {}

  @Post()
  hideStock(@CurrentUser() user: AuthUser, @Body() dto: PostHiddenStockDto) {
    return this.hiddenStockService.hideStock(user.id, dto);
  }
  // @Get()

  // @Patch()

  // @Delete()
}
