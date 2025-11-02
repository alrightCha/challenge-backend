import { Test, TestingModule } from '@nestjs/testing';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { DataSource } from 'typeorm';
import {AppDataSource} from "./config/data-source";
import {BearRepositoryProvider} from "./persistence/repositories/bear.repository";
import {BearController} from "./controller/bear.controller";
import {BearService} from "./service/bear.service";

let dbContainer: StartedTestContainer;
let dataSource: DataSource;

export async function integrationTestModule(): Promise<TestingModule> {
    jest.setTimeout(60000);

    const integrationTestModule = await Test.createTestingModule({
        imports: [],
        providers: [
            BearRepositoryProvider,
            BearController,
            BearService,
            {
                provide: DataSource,
                useFactory: setupTestContainer
            }
        ],
        exports: [DataSource]
    }).compile();

    dataSource = integrationTestModule.get<DataSource>(DataSource);
    await runTypeOrmMigrations(dataSource);
    return integrationTestModule;
}

export async function integrationTestTeardown(): Promise<void> {
    await dataSource.dropDatabase();
    await dataSource.destroy();
    await dbContainer.stop();
}

async function setupTestContainer(): Promise<DataSource> {
    dbContainer = await new GenericContainer('postgres')
        .withEnvironment({
            POSTGRES_USER: 'test',
            POSTGRES_PASSWORD: 'test',
            POSTGRES_DB: 'test'
        })
        .withExposedPorts(5432)
        .withWaitStrategy(
            Wait.forLogMessage(
                /.*database system is ready to accept connections.*/,
                2
            )
        )
        .start();

    AppDataSource.setOptions({
        host: dbContainer.getHost(),
        port: dbContainer.getMappedPort(5432),
        username: 'test',
        password: 'test',
        database: 'test',
        ssl: false,
        synchronize: false,
        logging: false
    });
    return await AppDataSource.initialize();
}

async function runTypeOrmMigrations(dataSource: DataSource) {
    await dataSource.runMigrations();
}