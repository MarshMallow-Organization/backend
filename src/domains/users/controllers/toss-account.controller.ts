import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { JwtAuthGuard } from 'src/domains/auth/guards/jwt-auth.guard';
import { ConnectTossAccountDto } from '../dto/request/connect-toss-account.dto';
import { TossAccountConnectedDto } from '../dto/response/toss-account-connected.dto';
import { TossAccountService } from '../services/toss-account.service';

/**
 * 회원가입 직후든 마이페이지에서든 같은 엔드포인트 하나를 호출한다.
 * 호출 시점(화면)은 도메인 선택과 무관하고, "내 계정 설정을 관리한다"는
 * 성격상 users 도메인에 둔다. 이미 완성된 JwtAuthGuard를 쓰는 새
 * 컨트롤러라 이 파일 안에서는 StubAuthGuard를 쓰는 다른 users 컨트롤러
 * (UsersController 등)와 섞이지 않는다.
 */
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users/me/toss-account')
@UseGuards(JwtAuthGuard)
export class TossAccountController {
  constructor(private readonly tossAccountService: TossAccountService) {}

  @Post()
  connectTossAccount(
    @CurrentUser() user: AuthUser,
    @Body() dto: ConnectTossAccountDto,
  ): Promise<TossAccountConnectedDto> {
    return this.tossAccountService.connectTossAccount(user.id, dto);
  }
}
