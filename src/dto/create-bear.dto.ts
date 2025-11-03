import { IsString, IsInt, Min, IsArray, IsOptional, ArrayMinSize, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBearDto {
  @IsString()
  @MaxLength(100, { message: 'Bear name must not exceed 100 characters' })
  name: string;

  @IsInt({ message: 'Size must be an integer' })
  @Min(1, { message: 'Size must be at least 1' })
  @Type(() => Number)
  size: number;

  @IsOptional()
  @IsArray({ message: 'Colors must be an array' })
  @IsString({ each: true, message: 'Each color must be a string' })
  @ArrayMinSize(0)
  colors?: string[];
}
