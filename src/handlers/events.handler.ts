import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js';
import { inject, injectable } from 'inversify';
import {
  IBasicGuild,
  IGuildMember,
  IGuildMemberUpdate,
  IGuildMessage,
  IGuildPresence,
  IMessageDelete,
  IMessageReaction,
  IMessageUpdate,
} from '../common/interface/shared.interface';
import { CommandService } from '../modules/commands/commands.service';
import { GuildService } from '../modules/guild/guild.service';
import { GuildStatsService } from '../modules/stats/guild-stats.service';
import { PortalService } from '../modules/portal/portal.service';
import { RolesService } from '../modules/roles/roles.service';
import { TYPES } from '../core/inversify.types';
import { EventsServiceHandlers } from '../proto/kitty_chan/EventsService';
import { NoResponse } from '../proto/kitty_chan/NoResponse';
import { ServiceStatus } from '../common/services/service-status.service';
import { WelcomerService } from '../modules/greet/welcomer.service';
import { LoggerService } from '../modules/logger/logger.service';
import { discordClient } from '../modules/app';
import { LanguageFilter } from '../modules/language/language-filter.service';
import { DiscordEventsType } from '../common/enum/discord-events.enum';
import { AutoSailConfigService } from '../modules/auto-sail/auto-sail-config.service';
import { AutoSailTriggerEvents } from '../modules/auto-sail/enum/auto-sail-trigger-events.enum';

@injectable()
export class EventsHandler implements EventsServiceHandlers {
  [name: string]: any;
  constructor(
    @inject(TYPES.LanguageFilter) private readonly langFilter: LanguageFilter,
    @inject(TYPES.GuildStatsService)
    private readonly guildStatsService: GuildStatsService,
    @inject(TYPES.CommandService)
    private readonly commandService: CommandService,
    @inject(TYPES.PortalService) private readonly portalService: PortalService,
    @inject(TYPES.RolesService) private readonly rolesService: RolesService,
    @inject(TYPES.GuildService) private readonly guildService: GuildService,
    @inject(TYPES.ServiceStatus) private readonly serviceStatus: ServiceStatus,
    @inject(TYPES.WelcomerService)
    private readonly welcomerService: WelcomerService,
    @inject(TYPES.LoggerService) private readonly loggerService: LoggerService,
    @inject(TYPES.AutoSailConfigService)
    private readonly autoSailConfigService: AutoSailConfigService,
  ) {}

  /**Message Create Events */
  async messageCreate(
    call: ServerUnaryCall<any, NoResponse>,
    callback: sendUnaryData<any>,
  ) {
    //Acknowledge gRPC call
    callback(null);

    const guildMessage = call.request as IGuildMessage;

    //Validate if Bot message
    if (guildMessage.isBot) return;

    //Guild Stats Logger
    this.guildStatsService.log_message(
      guildMessage,
      DiscordEventsType.messageCreate,
    );

    //Service Stats
    const serviceStats = await this.serviceStatus.validateCommand(guildMessage);
    if (serviceStats) return;

    //Check Portal Intent
    const isPortal = await this.portalService.validate_channel(guildMessage);
    if (isPortal) return;

    //Language Services
    this.langFilter.languageFactory(guildMessage);

    //Auto Sail
    this.autoSailConfigService.process(
      guildMessage,
      AutoSailTriggerEvents.MESSAGE_CREATE,
    );

    //Commands
    const isCommand = await this.commandService.validateCommand(guildMessage);
    if (isCommand) return;
  }

  /**Guild Message Update */
  async messageUpdate(
    call: ServerUnaryCall<any, NoResponse>,
    callback: sendUnaryData<any>,
  ) {
    callback(null);

    const message = call.request as IMessageUpdate;

    //Logger
    this.loggerService.messageUpdateDelete(
      message,
      DiscordEventsType.messageUpdate,
    );

    //Guild Stats
    this.guildStatsService.log_message(
      message,
      DiscordEventsType.messageUpdate,
    );
  }

  /**Guild Message Delete */
  async messageDelete(
    call: ServerUnaryCall<any, NoResponse>,
    callback: sendUnaryData<any>,
  ) {
    callback(null);

    const message = call.request as IMessageDelete;

    this.loggerService.messageUpdateDelete(
      message,
      DiscordEventsType.messageDelete,
    );

    this.guildStatsService.log_message(
      message,
      DiscordEventsType.messageDelete,
    );
  }

  /**Add Message Reaction Events */
  async messageReactionAdd(
    call: ServerUnaryCall<any, NoResponse>,
    callback: sendUnaryData<any>,
  ) {
    callback(null);

    const payload = call.request as IMessageReaction;
    this.rolesService.setReactionRole(payload);
  }

  /**Remove Message Reaction Events */
  async messageReactionRemove(
    call: ServerUnaryCall<any, NoResponse>,
    callback: sendUnaryData<any>,
  ) {
    callback(null);

    const payload = call.request as IMessageReaction;
    this.rolesService.removeReactionRole(payload);
  }

  /**Guild Create Events */
  async guildCreate(
    call: ServerUnaryCall<any, NoResponse>,
    callback: sendUnaryData<any>,
  ) {
    callback(null);

    const payload = call.request as IBasicGuild;

    await this.guildService.guildCreate(payload);
  }

  /**Guild Update Events */
  async guildUpdate(
    call: ServerUnaryCall<any, NoResponse>,
    callback: sendUnaryData<any>,
  ) {
    callback(null);

    const payload = call.request as IBasicGuild;

    await this.guildService.guildUpdate(payload);
  }

  /**Guild Create Events */
  async guildDelete(
    call: ServerUnaryCall<any, NoResponse>,
    callback: sendUnaryData<any>,
  ) {
    callback(null);

    const payload = call.request as IBasicGuild;

    await this.guildService.guildDelete(payload);
  }

  /**Guild Member Add */
  async guildMemberCreate(
    call: ServerUnaryCall<any, NoResponse>,
    callback: sendUnaryData<any>,
  ) {
    callback(null);
    const guildMember = call.request as IGuildMember;

    this.welcomerService.handle(guildMember);

    //Sync Guild Member
    this.guildService.guildMemberCreate(guildMember);

    this.guildStatsService.log_member(
      guildMember,
      DiscordEventsType.memberCreate,
    );
  }

  /**Guild Member Update */
  async guildMemberUpdate(
    call: ServerUnaryCall<any, NoResponse>,
    callback: sendUnaryData<any>,
  ) {
    callback(null);
    const guildMember = call.request as IGuildMemberUpdate;

    //Logger Service
    this.loggerService.memberUpdate(guildMember);

    //Update Member cache
    await discordClient.member.fetch(guildMember.guildId, guildMember.userId, {
      ignoreCache: true,
    });

    this.guildStatsService.log_member(
      guildMember,
      DiscordEventsType.memberUpdate,
    );
  }

  /**Guild Member Remove */
  async guildMemberRemove(
    call: ServerUnaryCall<any, NoResponse>,
    callback: sendUnaryData<any>,
  ) {
    callback(null);
    const guildMember = call.request as IGuildMember;

    //Sync Guild Member
    this.guildService.guildMemberDelete(guildMember);

    this.guildStatsService.log_member(
      guildMember,
      DiscordEventsType.memberDelete,
    );
  }

  /**Guild Presence Update */
  async guildPresenceUpdate(
    call: ServerUnaryCall<any, NoResponse>,
    callback: sendUnaryData<any>,
  ) {
    callback(null);
    const guildPresence = call.request as IGuildPresence;

    this.guildService.guildPresenceUpdate(guildPresence);
  }
}
