// import {
//   ExceptionFilter,
//   Catch,
//   ArgumentsHost,
//   HttpException,
//   HttpStatus,
//   Logger,
// } from '@nestjs/common';
// import { Request, Response } from 'express';

// @Catch()
// export class AllExceptionsFilter implements ExceptionFilter {
//   private readonly logger = new Logger(AllExceptionsFilter.name);

//   catch(exception: unknown, host: ArgumentsHost) {
//     const ctx = host.switchToHttp();
//     const response = ctx.getResponse<Response>();
//     const request = ctx.getRequest<Request>();

//     const status =
//       exception instanceof HttpException
//         ? exception.getStatus()
//         : HttpStatus.INTERNAL_SERVER_ERROR;

//     const message =
//       exception instanceof HttpException
//         ? exception.getResponse()
//         : 'เกิดข้อผิดพลาดภายในระบบ';

//     this.logger.error(
//       `🔥 Global Error Filter Caught: ${request.method} ${request.url}`,
//       JSON.stringify(message),
//     );

//     response.status(status).json({
//       statusCode: status,
//       message:
//         typeof message === 'string'
//           ? message
//           : (message as any)?.message || message,
//       error: (exception as any)?.name || 'Error',
//     });
//   }
// }
