import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser, AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { Public } from '../../common/auth/public.decorator';
import {
  AcceptInvitationDto,
  CreateInvitationDto,
  UpdateMembershipDto,
  UpdateWorkspaceDto,
} from './workspaces.dto';
import { WorkspacesService } from './workspaces.service';
import { Roles } from '../../common/auth/roles.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  list(@CurrentUser() context: AuthenticatedContext) {
    return this.workspaces.list(context);
  }

  @Get(':workspaceId')
  get(
    @CurrentUser() context: AuthenticatedContext,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ) {
    return this.workspaces.get(context, workspaceId);
  }

  @Patch(':workspaceId')
  @Roles('owner', 'admin')
  update(
    @CurrentUser() context: AuthenticatedContext,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() input: UpdateWorkspaceDto,
  ) {
    return this.workspaces.update(context, workspaceId, input);
  }

  @Public()
  @Post('invitations/accept')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  acceptInvitation(@Body() input: AcceptInvitationDto) {
    return this.workspaces.acceptInvitation(
      input.token,
      input.password,
      input.fullName,
    );
  }

  @Get(':workspaceId/members')
  members(
    @CurrentUser() context: AuthenticatedContext,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ) {
    return this.workspaces.members(context, workspaceId);
  }

  @Post(':workspaceId/invitations')
  invite(
    @CurrentUser() context: AuthenticatedContext,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() input: CreateInvitationDto,
  ) {
    return this.workspaces.createInvitation(
      context,
      workspaceId,
      input.email,
      input.role,
    );
  }

  @Patch(':workspaceId/members/:userId')
  updateMember(
    @CurrentUser() context: AuthenticatedContext,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() input: UpdateMembershipDto,
  ) {
    return this.workspaces.updateMember(
      context.userId,
      workspaceId,
      userId,
      input.role,
    );
  }

  @Delete(':workspaceId/members/:userId')
  removeMember(
    @CurrentUser() context: AuthenticatedContext,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.workspaces.removeMember(context.userId, workspaceId, userId);
  }
}
