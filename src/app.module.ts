import { Module } from '@nestjs/common';
import { BearController } from './controller/bear.controller';
import { BearService } from './service/bear.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import ORMConfig = require("./config/typeOrmConfig");
import {BearRepositoryProvider} from "./persistence/repositories/bear.repository";

@Module({
    imports: [
        TypeOrmModule.forRoot(ORMConfig)
    ],
    controllers: [BearController],
    providers: [
        BearRepositoryProvider,
        BearService
    ],
})
export class AppModule {}
