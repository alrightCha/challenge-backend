import { DataSource, DataSourceOptions } from 'typeorm';
import ORMConfig = require('./typeOrmConfig');

export const AppDataSource = new DataSource(ORMConfig as DataSourceOptions);
