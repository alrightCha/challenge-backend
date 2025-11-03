import { IsString, IsInt, Min, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBearDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Bear name must not exceed 100 characters' })
  name?: string;

  @IsOptional()
  @IsInt({ message: 'Size must be an integer' })
  @Min(1, { message: 'Size must be at least 1' })
  @Type(() => Number)
  size?: number;
}
