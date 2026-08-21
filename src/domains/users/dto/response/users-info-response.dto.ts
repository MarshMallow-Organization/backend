export class UserInfoResponseDto {
  id!: number;
  email!: string;
  name!: string;
  profileImageUrl!: string | null;

  tossApi!: {
    connected: boolean;
    connectedAt: string | null;
  };

  visitCount!: number;
  totalTradeCount!: number;
}
