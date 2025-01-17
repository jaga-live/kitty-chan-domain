import { injectable } from 'inversify';
import { DiscordEmbeds } from '../../types/discord.types';
import ReactionRoles from './model/reaction-roles.model';
import ReactionRole from './model/reaction-roles.model';
import { IMessageReaction } from '../../common/interface/shared.interface';
import { compareRolesMapping } from '../../utils/roles-mapping';
import { discordClient } from '../app';

/**
 * Reaction Roles Action
 */
export class ReactionRolesActionDto {
  name: string;
  guildId: string;
  channelId: string;
  action: string;
  rolesMapping: any[];
  reactionRoleMessageRef: string;
  discordEmbedConfig?: DiscordEmbeds;
}

@injectable()
export class RolesService {
  ///Update Reaction Role
  async updateReactionRole(dto: ReactionRolesActionDto) {
    const { channelId, rolesMapping, reactionRoleMessageRef } = dto;
    const embed: DiscordEmbeds[] = [
      {
        ...dto.discordEmbedConfig,
      },
    ];

    const reaction_role = await ReactionRole.findOne({
      messageId: reactionRoleMessageRef,
    });

    if (!reaction_role) {
      return false;
    }

    ///Update Message
    await discordClient.message.editEmbed(
      channelId,
      reactionRoleMessageRef,
      embed,
    );

    ///Update Roles Mapping Changes
    await ReactionRole.updateOne(
      { _id: reaction_role._id },
      {
        $set: {
          rolesMapping,
        },
      },
    );

    const emojiToBeUpdated: any[] = compareRolesMapping(
      rolesMapping,
      reaction_role.roleEmojiMapping,
    );

    for (let index = 0; index < emojiToBeUpdated.length; index++) {
      const emoji = emojiToBeUpdated[index].emoji;

      await discordClient.message.react(
        channelId,
        reactionRoleMessageRef,
        emoji.type === 'standard'
          ? encodeURIComponent(emoji.standardEmoji)
          : encodeURIComponent(`${emoji.name}:${emoji.id}`),
      );
    }

    return {
      reactionRoleMessageRef,
    };
  }

  async deleteReactionRole(dto: ReactionRolesActionDto) {
    const { channelId, reactionRoleMessageRef } = dto;

    const reaction_role = await ReactionRole.findOne({
      messageId: reactionRoleMessageRef,
    });

    if (!reaction_role) {
      return false;
    }

    ///Delete Message
    await discordClient.message.delete(channelId, reactionRoleMessageRef);
    await ReactionRoles.deleteOne({ messageId: reactionRoleMessageRef });

    return {
      reactionRoleMessageRef,
    };
  }

  /**
   * Role Reactions
   * Handle Reactions
   */
  async setReactionRole(payload: IMessageReaction) {
    const { isBot, messageId, emoji, userId } = payload;

    if (isBot) return false;

    const reaction_role = await ReactionRole.findOne({ messageId });
    if (!reaction_role) return false;

    const emojiType = emoji.id ? 'guild' : 'standard';
    let role: any;

    if (emojiType === 'guild') {
      role = reaction_role.roleEmojiMapping.find(
        (e: any) => e.emoji.id === emoji.id,
      );
    }

    if (emojiType === 'standard') {
      role = reaction_role.roleEmojiMapping.find(
        (e: any) => e.emoji.standardEmoji === emoji.name,
      );
    }

    if (!role) {
      return false;
    }

    ///Add role to User
    return discordClient.roles.set(reaction_role.guildId, userId, role.roleId);
  }

  ///Handle Role React
  async removeReactionRole(guild: IMessageReaction) {
    const { emoji, isBot, messageId, userId } = guild;
    if (isBot) return false;

    const reaction_role = await ReactionRole.findOne({ messageId });
    if (!reaction_role) return false;

    const emojiType = emoji.id ? 'guild' : 'standard';
    let role;

    if (emojiType === 'guild') {
      role = reaction_role.roleEmojiMapping.find(
        (e: any) => e.emoji.id === emoji.id,
      );
    }

    if (emojiType === 'standard') {
      role = reaction_role.roleEmojiMapping.find(
        (e: any) => e.emoji.standardEmoji === emoji.name,
      );
    }

    if (!role) {
      return false;
    }

    ///Add role to User
    await discordClient.roles.remove(
      reaction_role.guildId,
      userId,
      role.roleId,
    );
  }
}
