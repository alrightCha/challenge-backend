import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const ORMConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  database: 'postgres',
  port: 5432,
  username: 'postgres',
  password: 'password',
  host: 'localhost',
  synchronize: false,
  logging: false,
  entities: [
    __dirname + '/../**/*.entity{.ts,.js}'
  ],
  migrations: [__dirname + '/../persistence/migrations/*{.ts,.js}']
};

export = ORMConfig;
