import {IsNotEmpty, IsString, MaxLength} from "class-validator";

export class CreateUserDto {
    @IsString()
    @IsNotEmpty({message: '이메일을 입력해주세요'})
    @MaxLength(50, {message: '이메일은 50글자를 넘길 수 없습니다.'})
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}