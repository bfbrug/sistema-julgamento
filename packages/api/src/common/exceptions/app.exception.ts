import { HttpException } from '@nestjs/common'

export class AppException extends HttpException {
  constructor(
    message: string,
    statusCode: number,
    public readonly code?: string,
  ) {
    super({ message, ...(code !== undefined && { code }) }, statusCode)
  }
}
