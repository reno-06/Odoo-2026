import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<{
    status: string;
    database: string;
    service: string;
    timestamp: string;
  }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      database: 'connected',
      service: 'brightloop-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
