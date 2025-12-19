import {CanActivate, ExecutionContext, Injectable, UnauthorizedException} from "@nestjs/common";
import {JwtService} from "@nestjs/jwt";
import { Request } from "express";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService
    ) {
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new UnauthorizedException('인증 토큰이 없습니다.');
        }

        try {
            const payload = await this.jwtService.verifyAsync(token);
            // 요청 객체(request) 에 payload를 할당하여
            // 이후 라우트 핸들러에서 접근할 수 있도록 만듭니다.
            // 예: request.user
            request['user'] = payload;
        } catch {
            throw new UnauthorizedException('유효하지 않은 토큰입니다.');
        }
        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }

}