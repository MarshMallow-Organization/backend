import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUsersInfoDto } from './update-users-info.dto';

describe('UpdateUsersInfoDto', () => {
  const validateRequest = (input: Record<string, unknown>) =>
    validate(plainToInstance(UpdateUsersInfoDto, input));

  it('프로토콜을 포함한 URL을 허용한다', async () => {
    await expect(
      validateRequest({
        profileImageUrl: 'https://example.com/profile.jpg',
      }),
    ).resolves.toHaveLength(0);
  });

  it('URL 형식이 아닌 profileImageUrl을 거부한다', async () => {
    const errors = await validateRequest({ profileImageUrl: 'not-a-url' });

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints?.isUrl).toBe(
      'profileImageUrl 형식이 올바르지 않습니다.',
    );
  });

  it('profileImageUrl을 생략할 수 있다', async () => {
    await expect(validateRequest({ name: '홍길동' })).resolves.toHaveLength(0);
  });

  it('공백으로만 이루어진 name을 거부한다', async () => {
    const errors = await validateRequest({ name: '   ' });

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints?.isNotEmpty).toBe(
      'name은 비워둘 수 없습니다.',
    );
  });
});
