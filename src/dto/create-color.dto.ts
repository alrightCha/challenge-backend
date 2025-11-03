import { IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class CreateColorDto {
  @IsString()
  @MinLength(1, { message: 'Color name must not be empty' })
  @MaxLength(50, { message: 'Color name must not exceed 50 characters' })
  name: string;

  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Hex must be a valid hex color code (e.g., #FF5733 or #F57)',
  })
  hex: string;
}
