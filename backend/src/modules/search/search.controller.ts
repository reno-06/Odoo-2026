import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CurrentUser, AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { SearchQueryDto } from './search.dto';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@CurrentUser() context: AuthenticatedContext, @Query() query: SearchQueryDto) {
    if (!context.workspaceId) {
      throw new BadRequestException('Select a workspace using X-Workspace-Id.');
    }
    return this.searchService.search(context.workspaceId, query.q);
  }
}
