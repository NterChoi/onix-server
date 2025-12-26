import {IsArray, IsDate, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested} from "class-validator";
import {Type} from "class-transformer";

class PushedMemo {
    @IsUUID()
    @IsNotEmpty()
    id: string;

    @IsString()
    content: string;

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    createdAt: Date;

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    updatedAt: Date;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    deletedAt: Date | null;

}

export class PushMemoDto {

    @IsArray()
    @ValidateNested({each: true})
    @Type(() => PushedMemo)
    @IsNotEmpty()
    pushedMemos: PushedMemo[];
}