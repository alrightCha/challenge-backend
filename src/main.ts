import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {AppDataSource} from "./config/data-source";
import {Logger, ValidationPipe} from "@nestjs/common";

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);

    // Enable CORS
    app.enableCors();

    // Enable global validation
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // Strip properties that don't have decorators
            forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
            transform: true, // Automatically transform payloads to DTO instances
            transformOptions: {
                enableImplicitConversion: true, // Automatically convert types
            },
        })
    ); 
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
