import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super()
    this.$use(async (params, next) => {
      if (params.model === 'User') {
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          params.action = 'findFirst'
          if (!params.args) params.args = {}
          if (!params.args.where) params.args.where = {}
          if (!('deletedAt' in params.args.where)) {
            params.args.where.deletedAt = null
          }
        }
        if (params.action === 'findMany' || params.action === 'count') {
          if (!params.args) params.args = {}
          if (!params.args.where) params.args.where = {}
          if (!('deletedAt' in params.args.where)) {
            params.args.where.deletedAt = null
          }
        }
      }
      return next(params)
    })
  }

  async onModuleInit(): Promise<void> {
    await this.$connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
