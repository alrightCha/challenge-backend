import {integrationTestModule, integrationTestTeardown} from "../integration-test.module";
import {BearRepository} from "../persistence/repositories/bear.repository";
import {AppDataSource} from "../config/data-source";
import {TransactionalTestContext} from "typeorm-transactional-tests";
import {BearController} from "./bear.controller";
import {Bear} from "../persistence/entities/bear.entity";
import {BadRequestException} from "@nestjs/common";
import { Color } from "../persistence/entities/color.entity";
import { ColorRepository } from "../persistence/repositories/color.repository";
import { ColorController } from "./color.controller";

jest.setTimeout(60000);

let transactionalContext: TransactionalTestContext;
let testModule;
let bearRepository: BearRepository;
let bearController: BearController;

let colorRepository: ColorRepository; 
let colorController: ColorController; 

describe('BearController', () => {
    beforeAll(async () => {
        testModule = await integrationTestModule();
        bearRepository = testModule.get<BearRepository>(BearRepository);
        bearController = testModule.get<BearController>(BearController);
        colorRepository = testModule.get<ColorRepository>(ColorRepository); 
        colorController = testModule.get<ColorController>(ColorController); 
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
        expect(colorRepository).toBeDefined(); 
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
        expect(bears[0].name).toEqual('Grizzly');
    });

    it('color-size-in-range should return proper values', async () => {
        const gummyBear = new Bear(); 
        gummyBear.name = "GUMMY"; 
        gummyBear.size = 329; 
        const bearColor = new Color(); 
        bearColor.name = "black"; 
        bearColor.hex = "#000000";

        await colorRepository.save(bearColor); 
        await bearRepository.save(gummyBear); //Adding gummy bear
        await bearRepository.addBear("Grizzly", 320, ["black"]);  // Adding grizzly bear

        const bears = await bearController.getBearByColorsAndSizeInRange([bearColor.id], 0, 330); 
        //Only Grizzly bear has the color black
        expect(bears.length).toEqual(1); 
    }); 

    it('Should delete bears with same color on color deletion', async () => {
        const bearColor = new Color(); 
        bearColor.name = "black"; 
        bearColor.hex = "#000000";
        await colorRepository.save(bearColor); 
        await bearRepository.addBear("GummyBear", 100, ["black"]);
        await bearRepository.addBear("Grizzly", 320, ["black"]);

        let bears = await bearController.getBearBySizeInRange(0, 9999); 
        expect(bears.length).toEqual(2); 

        await colorRepository.deleteColor("black"); 
        bears = await bearController.getBearBySizeInRange(0, 9999); 
        expect(bears.length).toEqual(0); 
    });

    it('Should delete bear', async ()  => {
        const bear = new Bear(); 
        bear.name = "panda"; 
        bear.size = 100; 
        const panda = await bearRepository.save(bear); 
        let bears = await bearController.getBearBySizeInRange(0, 9999); 
        expect(bears.length).toEqual(1); 

        await bearRepository.deleteBear(panda.id); 
        bears = await bearController.getBearBySizeInRange(0, 9999); 
        console.log(bears); 
        expect(bears.length).toEqual(0); 
    })

    it("Should update bear name and size", async () => {
        const bear = new Bear(); 
        bear.name = "panda"; 
        bear.size = 100; 
        await bearRepository.save(bear); 
        let bears = await bearController.getBearBySizeInRange(0, 9999); 
        expect(bears[0].name).toEqual("panda"); 
        expect(bears[0].size).toEqual(100);

        await bearRepository.updateBearName(bear.id, "pandou"); 
        bears = await bearController.getBearBySizeInRange(0, 9999); 
        expect(bears[0].name).toEqual("pandou"); 

        await bearRepository.updateBearSize(bear.id, 20); 
        bears = await bearController.getBearBySizeInRange(0, 999); 
        expect(bears[0].size).toEqual(20); 
    })

    it("Should update bear colors to add a second one", async () => {
        const bear = new Bear(); 
        bear.name = "Soso"; 
        bear.size = 200;

        const myBear = await bearRepository.save(bear); 

        const red = new Color(); 
        red.name = "red"; 
        red.hex = "#FF6666"; 

        const myRed = await colorRepository.save(red); 

        await bearRepository.addColorToBear(myBear.id, myRed.id); 
        
        const bears = await bearRepository.findBearByColors([myRed.id]); 
        expect(bears[0].name).toEqual("Soso"); 
    })

    it("Should return bears with respective color", async () => {
        const bear = new Bear(); 
        bear.name = "panda"; 
        bear.size = 100;  

        await bearRepository.save(bear); 

        const colorBlack = new Color(); 
        colorBlack.name = "black"; 
        colorBlack.hex = "#000000"; 

        const black = await colorRepository.save(colorBlack); 
        
        const whiteColor = new Color();  
        whiteColor.name = "white"; 
        whiteColor.hex = "#FFFFFFF"; 

        const white = await colorRepository.save(whiteColor); 
        
        await bearRepository.addBear("GummyBear", 100, ["black"]);
        await bearRepository.addBear("GrizzlyBear", 200, ["black", "white"]); 

        let whiteBears = await bearController.getBearsByColor([white.id]); 
        console.log(whiteBears); 
        expect(whiteBears.length).toEqual(1); 

        let blackBears = await bearController.getBearsByColor([black.id]); 
        expect(blackBears.length).toEqual(2); 
    })
});
