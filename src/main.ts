import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {AppDataSource} from "./config/data-source";
import {Logger} from "@nestjs/common";

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);

    try {
        await AppDataSource.initialize();
        logger.log('Data Source has been initialized!');
        await AppDataSource.runMigrations();
        logger.log('Migrations have been run successfully.');
    } catch (error) {
        logger.error('Error during Data Source initialization or running migrations', error);
    }

    await app.listen(3000);
    logger.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap().then();
