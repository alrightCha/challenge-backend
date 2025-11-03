import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { BearController } from "./controller/bear.controller";
import { BearService } from "./service/bear.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import ORMConfig = require("./config/typeOrmConfig");
import { BearRepositoryProvider } from "./persistence/repositories/bear.repository";
import { ColorController } from "./controller/color.controller";
import { ColorRepositoryProvider } from "./persistence/repositories/color.repository";
import { ColorService } from "./service/color.service";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { LoggerMiddleware } from "./logger.middleware";

@Module({
  imports: [
    TypeOrmModule.forRoot(ORMConfig),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Time window in milliseconds (60 seconds = 1 minute)
        limit: 100, // Maximum number of requests per ttl window per IP
      },
    ]),
  ],
  controllers: [BearController, ColorController],
  providers: [
    BearRepositoryProvider,
    ColorRepositoryProvider,
    BearService,
    ColorService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Apply rate limiting globally to all routes
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply logger middleware to all routes
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
