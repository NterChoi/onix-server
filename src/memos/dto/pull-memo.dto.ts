import {IsDate, IsOptional} from "class-validator";
import {Type} from "class-transformer";
import {ApiPropertyOptional} from "@nestjs/swagger";

export class PullMemoDto {
    @ApiPropertyOptional({ 
        description: '마지막으로 동기화된 시각. 이 시각 이후의 변경사항만 가져옵니다.',
        example: '2025-01-01T00:00:00.000Z'
    })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    lastPulledAt: Date | null;
}