import {IsEmail, IsNotEmpty, IsString} from "class-validator";

export class SignInDto {
    @IsEmail({}, {message: '유효한 이메일 주소를 입력해주세요.'})
    @IsNotEmpty({message: '이메일을 입력해주세요.'})
    email: string;

    @IsString()
    @IsNotEmpty({message: '비밀번호를 입력해주세요'})
    password: string;
}