import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { StubAuthGuard } from 'src/common/auth/stubAuth.guard';
import { UsersService } from '../services/users.service';
import {
  UserInfoResponseDto,
  UserInfoUpdateResponseDto,
} from '../dto/response/users-info-response.dto';
import { UpdateUsersInfoDto } from '../dto/request/update-users-info.dto';

@Controller('users')
@UseGuards(StubAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getUsersInfo(@CurrentUser() user: AuthUser): Promise<UserInfoResponseDto> {
    return this.usersService.getUserInfo(user.id);
  }

  @Patch('me')
  updateUsersInfo(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateUsersInfoDto,
  ): Promise<UserInfoUpdateResponseDto> {
    return this.usersService.updateUserInfo(user.id, dto);
  }
}
