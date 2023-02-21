import { EmbedBuilder, GuildEmoji, MessageReaction } from 'discord.js';
import { inject, injectable } from 'inversify';
import { ReactionRolesActionDto } from '../../../api/live_cord/_dto/roles.dto';
import { TYPES } from '../../../core/inversify.types';
import { DiscordEmbeds } from '../../../types/discord.types';
import ReactionRoles from '../../../model/reaction_roles.model';
import { ResponseService } from '../shared/response.service';
import { HttpException } from '../../../core/exception';
import { REPLY } from '../../enum/reply';
import ReactionRole from '../../../model/reaction_roles.model';
import { ActionService } from '../shared/action.service';
import { ACTIONS } from '../../enum/action';
import { IGuild, IMessageReaction } from '../../interface/shared.interface';
import { compareRolesMapping } from '../../../utils/roles_mapping';
import { ReactMessageLimiter } from '../../../jobs/rate-limiter';


@injectable()
export class RolesService{
	constructor(
        @inject(TYPES.ResponseService) private readonly responseService: ResponseService,
        @inject(TYPES.ActionService) private readonly actionService: ActionService,
	) { }
    
	///Trigger from LiveCord
	///Create Reaction Role
	async createReactionRole(dto: ReactionRolesActionDto) {
		const { guildId, channelId, rolesMapping } = dto;
		const embed: DiscordEmbeds[] = [{
			...dto.discordEmbedConfig
		}];
        
		 
		const res:any = await this.responseService.embedMessage(embed, {
			guildId: dto.guildId,
			channelId: dto.channelId
		});

		if (!res?.id) throw new HttpException('Unable to create Reaction Role', 400);

		///Persist Role mapping
		await ReactionRoles.insertMany({
			name: dto.name,
			guildId: dto.guildId,
			channelId: dto.channelId,
			rolesMapping: dto.rolesMapping,
			messageId: res.id
		});

		///Map all emoji
		for (let index = 0; index < rolesMapping.length; index++) {
			const emoji= rolesMapping[index].emoji;
			await this.responseService.respond({
				type: REPLY.addReaction,
				guild: {guildId, channelId, messageId: res.id},
				body: {
					emoji: emoji.type ===  'standard' ? encodeURIComponent(emoji.standardEmoji) :  encodeURIComponent(`${emoji.name}:${emoji.id}`)
				}
			});
		}

		const reaction_role_message_ref = res.id;
		return {
			reaction_role_message_ref
		};
	}

	///Update Reaction Role
	async updateReactionRole(dto: ReactionRolesActionDto) {
		const { guildId, channelId, rolesMapping, reaction_role_message_ref } = dto;
		const embed: DiscordEmbeds[] = [{
			...dto.discordEmbedConfig
		}];

		const reaction_role = await ReactionRole.findOne({ messageId: reaction_role_message_ref });
		if (!reaction_role) throw new HttpException('Cannot find Reaction Role', 400);
		

		///Update Message
		await this.responseService.editEmbedMessage(embed, {
			guildId,
			channelId,
			messageId: reaction_role_message_ref
		});

		///Update Roles Mapping Changes
		await ReactionRole.updateOne({ _id: reaction_role._id }, {
			$set: {
				rolesMapping
			}
		});

		const emojiToBeUpdated: any[] = compareRolesMapping(rolesMapping, reaction_role.rolesMapping);
		
		for (let index = 0; index < emojiToBeUpdated.length; index++) {
			const emoji= emojiToBeUpdated[index].emoji;
			await this.responseService.respond({
				type: REPLY.addReaction,
				guild: { guildId, channelId, messageId: reaction_role_message_ref },
				body: {
					emoji: emoji.type ===  'standard' ? encodeURIComponent(emoji.standardEmoji) :  encodeURIComponent(`${emoji.name}:${emoji.id}`)
				}
			});
			
		}
	}

	/**
	 * Role Reactions
	 */
	async setReactionRole(reaction: MessageReaction, user) {
		if (user.isBot) return false;
		const reaction_role = await ReactionRole.findOne({ messageId: reaction.message.id });
		if (!reaction_role) return false;

		const emojiType = reaction.emoji instanceof GuildEmoji ? 'guild' : 'standard';
		let role;
		if (emojiType === 'guild') {
			role = reaction_role.rolesMapping.find((e: any) => e.emoji.id === reaction.emoji.id);
		}

		if (emojiType === 'standard') {
			role = reaction_role.rolesMapping.find((e: any) => e.emoji.standardEmoji === reaction.emoji.name);
		}

		if (!role) return false;
		///Add role to User
		console.log('RUN');
		this.actionService.call({
			type: ACTIONS.setRole,
			guild: {
				guildId: reaction_role.guildId,
				channelId: reaction_role.channelId,
				userId: user.id
			},
			body: {
				roleId: role.roleId
			}
		});

	}

	///Handle Role React
	async removeReactionRole(guild: IMessageReaction) {
		if (guild.isBot) return false;

		const reaction_role = await ReactionRole.findOne({ messageId: guild.messageId });
		if (!reaction_role) return false;

		const emojiType = guild.emoji.id ? 'guild' : 'standard';
		let role;
		if (emojiType === 'guild') {
			role = reaction_role.rolesMapping.find((e: any) => e.emoji.id === guild.emoji.id);
		}

		if (emojiType === 'standard') {
			role = reaction_role.rolesMapping.find((e: any) => e.emoji.standardEmoji === guild.emoji.name);
		}

		if (!role) return false;
		///Add role to User
		this.actionService.call({
			type: ACTIONS.deleteRole,
			guild: {
				guildId: reaction_role.guildId,
				channelId: reaction_role.channelId,
				userId: guild.userId
			},
			body: {
				roleId: role.roleId
			}
		});

	}

}