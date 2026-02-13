import {IsArray, IsDate, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested} from "class-validator";
import {Type} from "class-transformer";
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

class PushedMemo {
    @ApiProperty({ description: '메모 UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
    @IsUUID()
    @IsNotEmpty()
    id: string;

    @ApiPropertyOptional({ description: '메모 제목', example: '오늘의 할 일' })
    @IsString()
    @IsOptional()
    title: string;

    @ApiProperty({ description: '메모 내용', example: '# Hello World\nThis is a note.' })
    @IsString()
    content: string;

    @ApiProperty({ description: '클라이언트의 새 버전 번호', example: 2 })
    @IsInt()
    @IsNotEmpty()
    version: number;

    @ApiProperty({ description: '편집 시작 당시의 서버 버전 번호 (충돌 감지용)', example: 1 })
    @IsInt()
    @IsNotEmpty()
    baseVersion: number;

    @ApiProperty({ description: '생성 일시' })
    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    createdAt: Date;

    @ApiProperty({ description: '수정 일시' })
    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    updatedAt: Date;

    @ApiPropertyOptional({ description: '삭제 일시 (Soft Delete 시 전송)' })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    deletedAt: Date | null;

}

export class PushMemoDto {
    @ApiProperty({ type: [PushedMemo], description: '클라이언트에서 변경된 메모 목록' })
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => PushedMemo)
    @IsNotEmpty()
    pushedMemos: PushedMemo[];
}