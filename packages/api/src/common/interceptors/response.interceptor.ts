import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

type PaginatedBody = { data: unknown; meta: unknown }

function isPaginated(body: unknown): body is PaginatedBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'data' in body &&
    'meta' in body
  )
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<{ statusCode: number }>()

    return next.handle().pipe(
      map((body: unknown) => {
        if (response.statusCode === 204) return body
        if (isPaginated(body)) return body
        return { data: body ?? null }
      }),
    )
  }
}
