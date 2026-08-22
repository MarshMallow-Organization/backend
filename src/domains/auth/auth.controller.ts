import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { dataSchema } from 'src/common/swagger/dataResponse.schema';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AccessTokenResponseDto } from './dto/response/access-token-response.dto';
import { AuthErrorResponseDto } from './dto/response/auth-error-response.dto';
import { MeResponseDto } from './dto/response/me-response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const REFRESH_COOKIE_NAME = 'refreshToken';

@ApiTags('Auths')
@ApiExtraModels(AccessTokenResponseDto, AuthErrorResponseDto, MeResponseDto)
@Controller('auths')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  @ApiOperation({
    summary: '회원가입',
    description:
      '이메일/비밀번호/이름으로 회원가입한다. 성공하면 바로 로그인 상태(토큰 발급)가 된다.',
  })
  @ApiCreatedResponse({
    description: '회원가입 성공',
    schema: dataSchema(AccessTokenResponseDto),
  })
  @ApiConflictResponse({
    description: 'EMAIL_ALREADY_EXISTS: 이미 가입된 이메일',
    type: AuthErrorResponseDto,
  })
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponseDto> {
    const { accessToken, refreshToken, refreshExpiresInMs } =
      await this.authService.signup(dto);
    this.setRefreshCookie(res, refreshToken, refreshExpiresInMs);
    return { accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({
    summary: '로그인',
    description: '이메일/비밀번호로 로그인하고 토큰을 발급받는다.',
  })
  @ApiOkResponse({
    description: '로그인 성공',
    schema: dataSchema(AccessTokenResponseDto),
  })
  @ApiUnauthorizedResponse({
    description:
      'INVALID_CREDENTIALS: 이메일/비밀번호 불일치, PASSWORD_NOT_SET: 소셜 로그인 전용 계정',
    type: AuthErrorResponseDto,
  })
  async login(
    // 실제 검증은 LocalAuthGuard(passport-local)가 req.body를 직접 읽어서 처리한다.
    // 여기서는 Swagger에 요청 바디 스키마를 노출하기 위해서만 받는다.
    @Body() _dto: LoginDto,
    @Req() req: { user: { id: number; email: string } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponseDto> {
    const { accessToken, refreshToken, refreshExpiresInMs } =
      await this.authService.issueTokens(req.user);
    this.setRefreshCookie(res, refreshToken, refreshExpiresInMs);
    return { accessToken };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({
    summary: '내 정보 조회',
    description: 'access token으로 인증된 현재 로그인 유저 정보를 반환한다.',
  })
  @ApiOkResponse({
    description: '조회 성공',
    schema: dataSchema(MeResponseDto),
  })
  @ApiUnauthorizedResponse({
    description: 'access token이 없거나 유효하지 않음',
  })
  me(@CurrentUser() user: AuthUser): MeResponseDto {
    return user;
  }

  private setRefreshCookie(
    res: Response,
    refreshToken: string,
    maxAge: number,
  ) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>('app.env') !== 'local',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
  }
}
