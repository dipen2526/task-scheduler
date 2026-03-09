import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class CreateTaskDto {
  @IsUrl({
    require_protocol: true,
  })
  @IsNotEmpty()
  url: string;

  @IsObject()
  payload: any;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts?: number;
}
