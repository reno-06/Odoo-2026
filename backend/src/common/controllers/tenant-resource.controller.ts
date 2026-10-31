import {
  Body,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, AuthenticatedContext } from '../auth/current-user.decorator';
import { ListQueryDto } from '../validation/list-query.dto';
import { RecordInputDto } from '../validation/record-input.dto';
import { TenantCrudService } from '../services/tenant-crud.service';

export class TenantResourceController {
  constructor(protected readonly service: TenantCrudService) {}

  @Get()
  list(
    @CurrentUser() context: AuthenticatedContext,
    @Query() query: ListQueryDto,
  ) {
    return this.service.list(context, query);
  }

  @Post()
  create(
    @CurrentUser() context: AuthenticatedContext,
    @Body() input: RecordInputDto,
  ) {
    return this.service.create(context, input as unknown as Record<string, unknown>);
  }

  @Get(':id')
  get(
    @CurrentUser() context: AuthenticatedContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.get(context, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() context: AuthenticatedContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: RecordInputDto,
  ) {
    return this.service.update(
      context,
      id,
      input as unknown as Record<string, unknown>,
    );
  }

  @Delete(':id')
  remove(
    @CurrentUser() context: AuthenticatedContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.remove(context, id);
  }
}
