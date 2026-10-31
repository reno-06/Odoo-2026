import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/auth/public.decorator';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  async getHealth(): Promise<{ data: Awaited<ReturnType<HealthService['getHealth']>> }> {
    return { data: await this.healthService.getHealth() };
  }
}
