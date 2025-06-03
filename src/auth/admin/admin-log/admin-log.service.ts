import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

type AdminLogAction = 'create' | 'update' | 'delete' | 'import';

@Injectable()
export class AdminLogService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(params: {
    page: number;
    limit: number;
    search?: string;
    action?: AdminLogAction;
    entity?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }) {
    const {
      page,
      limit,
      search,
      action,
      entity,
      startDate,
      endDate,
      sortBy = 'createdAt',
      order = 'desc',
    } = params;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
        {
          user: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    if (action) where.action = action;
    if (entity) where.entity = { contains: entity, mode: 'insensitive' };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.adminLog.count({ where }),
      this.prisma.adminLog.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
        include: { user: true },
      }),
    ]);

    return { total, data };
  }

  async createLog(input: {
    userId: number;
    action: AdminLogAction;
    entity: string;
    entityId?: number;
    description?: string;
  }) {
    return this.prisma.adminLog.create({
      data: input,
    });
  }
}
