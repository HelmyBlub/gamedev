import { Game, IdCounter, LEVELING_CHARACTER_CLASSES, Position, UpgradeOptions } from "../../gameModel.js";
import { GameImage, GAME_IMAGES, loadImage } from "../../imageLoad.js";
import { GameMap } from "../../map/map.js";
import { RandomSeed, nextRandom } from "../../randomNumberGenerator.js";
import { determineCharactersInDistance, moveCharacterTick } from "../character.js";
import { Character } from "../characterModel.js";
import { defaultFillRandomUpgradeOptions, upgradeCharacter } from "./levelingCharacter.js";
import { createLevelingCharacter, LevelingCharacter, UpgradeOption } from "./levelingCharacterModel.js";

const SHOOTERCLASS = "Sword";
export function addSwordClass(){
    LEVELING_CHARACTER_CLASSES[SHOOTERCLASS] = {
        fillRandomUpgradeOptions: defaultFillRandomUpgradeOptions,
        createDefaultUpgradeOptions: createSwordUpgradeOptions,
        upgradeLevelingCharacter: upgradeCharacter,
        tickPlayerCharacter: tickSwordCharacter,
        createLevelingCharacter: createSwordCharacter,
        paintWeapon: drawSword,
    }   
}

type SwordCharacterClass = {
    damage: number,
    swordLength: number,
    attackNextTick: boolean,
    nextAttackDirection: number,
}

function createSwordCharacter(
    idCounter: IdCounter,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    moveSpeed: number,
    hp: number,
    damage: number,
    faction: string,
    seed: RandomSeed,
): LevelingCharacter {
    let characterClass = SHOOTERCLASS;
    let characterClassProperties: SwordCharacterClass = {
        damage: 10,
        swordLength: 30,
        attackNextTick: false,
        nextAttackDirection: 0,
    };

    let character = createLevelingCharacter(idCounter, x, y, width, height, color, moveSpeed, hp, damage, faction, seed, characterClass, characterClassProperties);
    return character;
}

GAME_IMAGES["sword"] = { 
    imagePath: "/images/sword.png", 
    spriteRowHeights: [38], 
    spriteRowWidths: [11],
};

function createBiggerSwordImage(newSwordSize: number){
    let swordImage = GAME_IMAGES["sword"];
    if(swordImage.imageRef === undefined) return;
    if(swordImage.properties === undefined) swordImage.properties = {};
    if(swordImage.properties.canvases === undefined) swordImage.properties.canvases = {};
    if(swordImage.properties.canvases[newSwordSize] === undefined){
        if(newSwordSize < 25){
            throw new Error("newSwordSize too small");
        }
        let canvas = document.createElement('canvas');
        canvas.width  = swordImage.imageRef.width;
        canvas.height = Math.floor(newSwordSize);
        let imageCtx: CanvasRenderingContext2D = canvas.getContext("2d")!;
        //sword tip
        imageCtx.drawImage(
            swordImage.imageRef,
            0,
            0,
            swordImage.imageRef.width,
            14,
            0,
            0,
            swordImage.imageRef.width,
            14
        );
        //scalled sword middle
        imageCtx.drawImage(
            swordImage.imageRef,
            0,
            14,
            swordImage.imageRef.width,
            14,
            0,
            14,
            swordImage.imageRef.width,
            newSwordSize - 10
        );
        //sword handle
        imageCtx.drawImage(
            swordImage.imageRef,
            0,
            28,
            swordImage.imageRef.width,
            10,
            0,
            newSwordSize - 10,
            swordImage.imageRef.width,
            10
        );

        swordImage.properties.canvases[newSwordSize] = canvas;
    }
}

function drawSword(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position){
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let paintX = Math.floor(character.x - cameraPosition.x + centerX);
    let paintY = Math.floor(character.y - cameraPosition.y + centerY);
    let properties: SwordCharacterClass = (character as LevelingCharacter).characterClassProperties;

    ctx.fillStyle = character.color;
    let swordImage = GAME_IMAGES["sword"];
    loadImage(swordImage);
    ctx.translate(paintX, paintY);
    ctx.rotate(properties.nextAttackDirection);
    ctx.translate(-paintX, -paintY);
    if(swordImage.imageRef?.complete){
        let swordSizeImage = swordImage.imageRef;
        if(properties.swordLength > swordSizeImage.height + 10){
            let imageSwordSize = Math.round(properties.swordLength/10)*10;
            createBiggerSwordImage(imageSwordSize);
            swordSizeImage = swordImage.properties.canvases[imageSwordSize];
        }
        ctx.drawImage(
            swordSizeImage,
            0,
            0,
            swordSizeImage.width,
            swordSizeImage.height,
            paintX - Math.floor(swordSizeImage.width/2),
            paintY - properties.swordLength - 10,
            swordSizeImage.width,
            properties.swordLength
        );
    }
    ctx.resetTransform();
}

function tickSwordCharacter(character: LevelingCharacter, game: Game) {
    if(character.isDead) return;
    let properties: SwordCharacterClass = character.characterClassProperties;
    properties.nextAttackDirection = (properties.nextAttackDirection + 0.03) % (Math.PI*2);
    if(properties.attackNextTick){
        properties.attackNextTick = false;
        attack(character);
    }
    detectSwordToCharactersHit(character, game.state.map, 14);
    moveCharacterTick(character, game.state.map, game.state.idCounter, true);
}

function createSwordUpgradeOptions(): Map<string, UpgradeOption>{
    let upgradeOptions = new Map<string, UpgradeOption>();
    upgradeOptions.set("Health+50", {
        name: "Health+50", upgrade: (c: LevelingCharacter) => {
            c.hp += 50;
        }
    });
    upgradeOptions.set("Speed+0.2", {
        name: "Speed+0.2", upgrade: (c: LevelingCharacter) => {
            c.moveSpeed += 0.2;
        }
    });
    upgradeOptions.set("Damage+10", {
        name: "Damage+10", upgrade: (c: LevelingCharacter) => {
            let properties: SwordCharacterClass =  c.characterClassProperties;
            properties.damage += 10;
        }
    });
    upgradeOptions.set("SwordSize+", {
        name: "SwordSize+", upgrade: (c: LevelingCharacter) => {
            let properties: SwordCharacterClass =  c.characterClassProperties;
            properties.swordLength += 10;
        }
    });

    return upgradeOptions;
}

function detectSwordToCharactersHit(sourceCharacter: LevelingCharacter, map: GameMap, swordWidth: number){
    let maxEnemySizeEstimate = 40;
    let properties: SwordCharacterClass =  sourceCharacter.characterClassProperties;

    let targetCharacters = determineCharactersInDistance(sourceCharacter, map, properties.swordLength + maxEnemySizeEstimate);
    for (let charIt = targetCharacters.length - 1; charIt >= 0; charIt--) {
        let targetCharacter = targetCharacters[charIt];
        if (targetCharacter.isDead || targetCharacter.faction === sourceCharacter.faction) continue;
        let isHit = detectSwordToCharacterHit(sourceCharacter, targetCharacter, swordWidth);
        if (isHit) {
            targetCharacter.hp -= properties.damage;
            targetCharacter.wasHitRecently = true;
        }
    }
}

function detectSwordToCharacterHit(sourceSwordCharacter: LevelingCharacter, pos: Position, swordWidth: number): boolean{
    let properties: SwordCharacterClass =  sourceSwordCharacter.characterClassProperties;
    let x1 = sourceSwordCharacter.x;
    let y1 = sourceSwordCharacter.y;
    let x2 = x1 + Math.cos(properties.nextAttackDirection - Math.PI/2) * properties.swordLength;
    let y2 = y1 + Math.sin(properties.nextAttackDirection - Math.PI/2) * properties.swordLength;
    if(x1 < x2){
        if(pos.x < x1 - swordWidth/2 || pos.x > x2 + swordWidth/2){
            return false;
        }
    }else{
        if(pos.x < x2 - swordWidth/2 || pos.x > x1 + swordWidth/2){
            return false;
        }
    }
    if(y1 < y2){
        if(pos.y < y1 - swordWidth/2 || pos.y > y2 + swordWidth/2){
            return false;
        }
    }else{
        if(pos.y < y2 - swordWidth/2 || pos.y > y1 + swordWidth/2){
            return false;
        }
    }

    let numerator = Math.abs(((x2 - x1)*(y1-pos.y)) - ((x1-pos.x)*(y2-y1)));
    let denominator = Math.sqrt(Math.pow((x2-x1), 2) + Math.pow((y2-y1), 2));

    let distance = numerator / denominator - swordWidth/2;

    return distance <= 0;
}

function attack(character: LevelingCharacter) {
    let properties: SwordCharacterClass = character.characterClassProperties;
}
