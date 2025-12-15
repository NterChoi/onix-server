import { IsNotEmpty, IsOptional, IsString, MaxLength} from "class-validator";

export class CreateMemoDto{
    @IsString()
    @IsNotEmpty({message: '제목은 필수 입력 항목입니다.'})
    @MaxLength(50, {message: '제목은 50글자를 넘길 수 없습니다.'})
    title: string;

    @IsString()
    @IsOptional()
    content?: string;
}