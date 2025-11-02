import {BadRequestException, Controller, Get, Param} from '@nestjs/common';
import { BearService } from '../service/bear.service';

@Controller('bear')
export class BearController {
    constructor(private readonly bearService: BearService) {}

    @Get('size-in-range/:start/:end')
    getBearBySizeInRange(
        @Param('start') start: number,
        @Param('end') end: number
    ): Promise<string[]> {

        if (start > end) {
            throw new BadRequestException(`Start ${start} is larger than end ${end}`);
        }

        return this.bearService.findBearBySizeInRange(start, end);
    }
}
