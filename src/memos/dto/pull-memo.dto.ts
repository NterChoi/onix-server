import {IsDate, IsOptional} from "class-validator";
import {Type} from "class-transformer";

export class PullMemoDto {
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    lastPulledAt: Date | null;
}