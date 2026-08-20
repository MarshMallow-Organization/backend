import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateUsersInfoDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsNotEmpty({ message: 'name은 비워둘 수 없습니다.' })
  name?: string;

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: 'profileImageUrl 형식이 올바르지 않습니다.' },
  )
  profileImageUrl?: string;
}
