import { Module } from "@nestjs/common";
import { BearController } from "./controller/bear.controller";
import { BearService } from "./service/bear.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import ORMConfig = require("./config/typeOrmConfig");
import { BearRepositoryProvider } from "./persistence/repositories/bear.repository";
import { ColorController } from "./controller/color.controller";
import { ColorRepositoryProvider } from "./persistence/repositories/color.repository";
import { ColorService } from "./service/color.service";

@Module({
  imports: [TypeOrmModule.forRoot(ORMConfig)],
  controllers: [BearController, ColorController],
  providers: [
    BearRepositoryProvider,
    ColorRepositoryProvider,
    BearService,
    ColorService,
  ],
})
export class AppModule {}
