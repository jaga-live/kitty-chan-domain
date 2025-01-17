import { inject, injectable } from 'inversify';
import { TYPES } from '../../core/inversify.types';
import { RedisService } from '../../common/services/redis.service';
import { IGuild } from '../../common/interface/shared.interface';
import featuresModel from '../features/model/features.model';
import { LanguageFilterDto } from './dto/language-filter.dto';
import { DataStructure } from '../../common/services/data-structure.service';
import {
  StrongLanguage,
  StrongLanguageConfig,
} from './dto/strong-language.dto';
import { StrongLanguageCodes } from './enum/strong-language.enum';
import { DiscordActionService } from '../../common/services/discord-action.service';
import { LanguageProcessorService } from './language-processor.service';
import { LanguageLibRefIds } from '../../common/store/language-lib.store';

@injectable()
export class LanguageFilter {
  constructor(
    @inject(TYPES.RedisService) private readonly redisService: RedisService,
    @inject(TYPES.DataStructureService)
    private readonly dataStructure: DataStructure,
    @inject(TYPES.DiscordActionService)
    private readonly discordActionService: DiscordActionService,
    @inject(TYPES.LanguageProcessorService)
    private readonly languageProcessor: LanguageProcessorService,
  ) {}

  async languageFactory(guild: IGuild): Promise<void> {
    /**Strong Language */
    const getStrongLanguageFF = await this.redisService.get(
      `guild-${guild.guildId}:feature:strongLanguage`,
    );

    if (getStrongLanguageFF) {
      await this.strongLanguage(guild);
    }

    /**Language Filter */
    const getLanguageFilterFF = await this.redisService.get(
      `guild-${guild.guildId}:feature:languageFilter`,
    );

    if (getLanguageFilterFF) {
      this.languageFilter(guild);
    }
  }

  /**System Default Service
   * If Feature is enabled checks for English Bad words
   */
  private async strongLanguage(guild: IGuild) {
    const strongLanguageConfig: StrongLanguage =
      await this.getStrongLanguageConfig(guild);

    if (!strongLanguageConfig?.isActive) return;

    const {
      actionConfig,
      languageConfig,
    }: { actionConfig: any; languageConfig: StrongLanguageConfig[] } =
      strongLanguageConfig;

    const { plainMessage } = guild;

    languageConfig.map(async (config) => {
      if (config.language === StrongLanguageCodes.EN) {
        const { detected } = await this.languageProcessor.textMatchAndWhiteList(
          'language-lib',
          LanguageLibRefIds['strong-language-en'],
          plainMessage,
          config.whitelistLib,
        );

        for (const config of actionConfig) {
          config.messageConfig.channelId = guild.channelId;
          config.messageConfig.messageId = guild.messageId;
        }

        if (detected) {
          await this.discordActionService.process(actionConfig);
        }
      }
    });
  }

  /**Language Filter
   * Uses Data Libs & Data Structure service
   */
  private async languageFilter(guild: IGuild) {
    const { languageFilterConfig } = await this.getLanguageFilterConfig(guild);

    for (const config of languageFilterConfig) {
      const { detected } = await this.languageProcessor.textMatchAndWhiteList(
        'language-lib',
        config.languageLibId,
        guild.plainMessage,
      );

      for (const actionConfig of config.actionConfig as any) {
        actionConfig.messageConfig.channelId = guild.channelId;
        actionConfig.messageConfig.messageId = guild.messageId;
      }

      if (detected) {
        await this.discordActionService.process(config.actionConfig);
      }
    }
  }

  /**Language FIlter Config */
  private async getLanguageFilterConfig(
    guild: IGuild,
  ): Promise<LanguageFilterDto> {
    let languageFilterConfig: LanguageFilterDto;
    const cacheKey = `guild-${guild.guildId}:feature:languageFilterConfig`;

    const cachedConfig = await this.redisService.get(cacheKey);

    if (!cachedConfig) {
      const languageFeature = await featuresModel.findOne(
        { guildId: guild.guildId },
        { language: 1 },
      );

      languageFilterConfig = languageFeature?.language?.languageFilter;

      await this.redisService.setWithExpiry(
        cacheKey,
        JSON.stringify(languageFilterConfig),
        300,
      );
    } else {
      languageFilterConfig = JSON.parse(cachedConfig);
    }

    return languageFilterConfig;
  }

  /**Strong Language Config */
  private async getStrongLanguageConfig(
    guild: IGuild,
  ): Promise<StrongLanguage> {
    let strongLanguageConfig: StrongLanguage;
    const cacheKey = `guild-${guild.guildId}:feature:strongLanguageConfig`;

    const cachedConfig = await this.redisService.get(cacheKey);

    if (!cachedConfig) {
      const languageFeature = await featuresModel.findOne(
        { guildId: guild.guildId },
        { language: 1 },
      );

      strongLanguageConfig = languageFeature?.language?.strongLanguage;

      await this.redisService.setWithExpiry(
        cacheKey,
        JSON.stringify(strongLanguageConfig),
        300,
      );
    } else {
      strongLanguageConfig = JSON.parse(cachedConfig);
    }

    return strongLanguageConfig;
  }
}
