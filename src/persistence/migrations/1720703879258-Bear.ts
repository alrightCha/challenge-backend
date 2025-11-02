import { MigrationInterface, QueryRunner } from "typeorm";

export class Bear1720703879258 implements MigrationInterface {
    name = 'Bear1720703879258'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "bear" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "size" integer NOT NULL, CONSTRAINT "PK_cd1fb70b1a6d730ad8276551e36" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "bear"`);
    }

}
