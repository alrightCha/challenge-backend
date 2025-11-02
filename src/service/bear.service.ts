import {BadRequestException, Injectable, Logger} from '@nestjs/common';
import {BearRepository} from "../persistence/repositories/bear.repository";

@Injectable()
export class BearService {

    constructor(private readonly bearRepository: BearRepository) {
    }

    async findBearBySizeInRange(start: number, end: number): Promise<string[]> {
        const bears = await this.bearRepository.findBearBySizeInRange(start, end);
        return bears.map(bear => bear.name);
    }
}
