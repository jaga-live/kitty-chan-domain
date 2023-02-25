import { inject, injectable } from 'inversify';
import { Types } from 'mongoose';
import { TYPES } from '../../../core/inversify.types';
import { RedisService } from '../../../shared/redis.service';
import { IGuild } from '../../interface/shared.interface';
import { ServerRepo } from '../../repository/server.repo';


@injectable()
export class FeatureFlagService{
	constructor(
        @inject(TYPES.ServerRepo) private readonly serverRepo: ServerRepo,
        @inject(TYPES.RedisService) private readonly redisService: RedisService,
	) { }

    
	async create_featureFlag(payload: any) {
		await this.serverRepo.create(payload);
	}
    
	async getFeatureFlag(guild: IGuild) {
		const guildFlag = await this.redisService.get(`guild:${guild.guildId}:flags`);
		return guildFlag ? JSON.parse(guildFlag) : null;
	}

	async viewAllFeatureFlag() {
		return await this.serverRepo.get();
	}

	async update_featureFlag(_id: Types.ObjectId, payload: any) {
		return await this.serverRepo.update(_id, payload);
	}
}
