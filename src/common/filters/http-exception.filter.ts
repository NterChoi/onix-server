import {ArgumentsHost, Catch, ExceptionFilter, HttpException} from "@nestjs/common";
import {Response, Request} from "express";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse();

        const errorDetails =
            typeof exceptionResponse === 'string'
                ? {message: exceptionResponse}
                : (exceptionResponse as object);

        response
            .status(status)
            .json({
                isSuccess: false,
                timestamp: new Date().toISOString(),
                path: request.url,
                statusCode: status,
                ...errorDetails,
            });
    }

}