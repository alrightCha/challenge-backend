import {integrationTestModule, integrationTestTeardown} from "../integration-test.module";
import {BearRepository} from "../persistence/bear.repository";
import {AppDataSource} from "../config/data-source";
import {TransactionalTestContext} from "typeorm-transactional-tests";
import {BearController} from "./bear.controller";
import {Bear} from "../persistence/bear.entity";
import {BadRequestException} from "@nestjs/common";

jest.setTimeout(60000);

let transactionalContext: TransactionalTestContext;
let testModule;
let bearRepository: BearRepository;
let bearController: BearController;

describe('BearController', () => {
    beforeAll(async () => {
        testModule = await integrationTestModule();
        bearRepository = testModule.get<BearRepository>(BearRepository);
        bearController = testModule.get<BearController>(BearController);
    });

    afterAll(async () => {
        await integrationTestTeardown();
    });

    beforeEach(async () => {
        if (AppDataSource.isInitialized) {
            transactionalContext = new TransactionalTestContext(AppDataSource);
            await transactionalContext.start();
        }
    });

    afterEach(async () => {
        if (transactionalContext) {
            await transactionalContext.finish();
        }
    });

    it('Should run', async () => {
        expect(bearRepository).toBeDefined();
    });

    it('size-in-range wrong parameters should raise error', async () => {
        try {
            await bearController.getBearBySizeInRange(10, 0)
        } catch (error) {
            const exception = error as BadRequestException;
            expect(exception.getStatus()).toEqual(400);
        }
    });

    it('size-in-range should return proper values', async () => {
        const gummyBear = new Bear();
        gummyBear.name = 'Gummybear';
        gummyBear.size = 5;
        const grizzlyBear = new Bear();
        grizzlyBear.name = 'Grizzly';
        grizzlyBear.size = 320;
        await bearRepository.save(gummyBear);
        await bearRepository.save(grizzlyBear);

        let bears = await bearController.getBearBySizeInRange(0, 4);
        expect(bears.length).toEqual(0);

        bears = await bearController.getBearBySizeInRange(5, 320);
        expect(bears.length).toEqual(2);

        bears = await bearController.getBearBySizeInRange(100, 500);
        expect(bears.length).toEqual(1);
        expect(bears[0]).toEqual('Grizzly');
    });
});
