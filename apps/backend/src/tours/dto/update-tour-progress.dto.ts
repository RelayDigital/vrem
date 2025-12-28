import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { TourTrack } from '@prisma/client';

export class UpdateTourProgressDto {
  @IsEnum(TourTrack)
  tourTrack: TourTrack;

  @IsString()
  stepId: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsBoolean()
  skipped?: boolean;
}

export class CompleteTourTrackDto {
  @IsEnum(TourTrack)
  tourTrack: TourTrack;
}
