import { determineCharactersInDistance } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { LevelingCharacter } from "../character/levelingCharacters/levelingCharacterModel.js";
import { calculateDirection, calculateDistance } from "../game.js";
import { Position, Game } from "../gameModel.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { GameMap } from "../map/map.js";
import { ABILITIES_FUNCTIONS, Ability, UpgradeOptionAbility } from "./ability.js";

type AbilitySword = Ability & {
    damage: number,
    swordLength: number,
    swordCount: number,
    angleChangePerTick: number,
    currentSwordAngle: number,
    angleChangePerSword: number,
}
const ABILITY_NAME = "Sword";
const SWORD_DISTANCE_TO_HODLDER = 10;
GAME_IMAGES[ABILITY_NAME] = {
    imagePath: "/images/sword.png",
    spriteRowHeights: [38],
    spriteRowWidths: [11],
};

export function addSwordAbility(){
    ABILITIES_FUNCTIONS[ABILITY_NAME] = {
        tickAbility: tickAbilitySword,
        createAbiltiyUpgradeOptions: createAbilitySwordUpgradeOptions,
        paintAbility: paintAbilitySword
    };
}

export function createAbilitySword(
    damage: number = 10,
    swordLength: number = 30,
    swordCount: number = 1,
    angleChangePerTick: number = 0.01,
    angleChangePerSword: number = 1
): AbilitySword {
    return {
        name: ABILITY_NAME,
        damage: damage,
        swordLength: swordLength,
        swordCount: swordCount,
        angleChangePerTick: angleChangePerTick,
        currentSwordAngle: 0,
        angleChangePerSword: angleChangePerSword
    };
}

function createBiggerSwordImage(newSwordSize: number) {
    let swordImage = GAME_IMAGES[ABILITY_NAME];
    if (swordImage.imageRef === undefined) return;
    if (swordImage.properties === undefined) swordImage.properties = {};
    if (swordImage.properties.canvases === undefined) swordImage.properties.canvases = {};
    if (swordImage.properties.canvases[newSwordSize] === undefined) {
        if (newSwordSize < 25) {
            throw new Error("newSwordSize too small");
        }
        let canvas = document.createElement('canvas');
        canvas.width = swordImage.imageRef.width;
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

function paintAbilitySword(ctx: CanvasRenderingContext2D, character: Character, ability: Ability, cameraPosition: Position) {
    let abilitySword = ability as AbilitySword;
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let paintX = Math.floor(character.x - cameraPosition.x + centerX);
    let paintY = Math.floor(character.y - cameraPosition.y + centerY);

    ctx.fillStyle = character.color;
    let swordImage = GAME_IMAGES[ABILITY_NAME];
    loadImage(swordImage);

    for (let i = 0; i < abilitySword.swordCount; i++) {
        ctx.translate(paintX, paintY);
        ctx.rotate(abilitySword.currentSwordAngle + Math.PI / 2 + abilitySword.angleChangePerSword * i);
        ctx.translate(-paintX, -paintY);
        if (swordImage.imageRef?.complete) {
            let swordSizeImage = swordImage.imageRef;
            if (abilitySword.swordLength > swordSizeImage.height + 10) {
                let imageSwordSize = Math.round(abilitySword.swordLength / 10) * 10;
                createBiggerSwordImage(imageSwordSize);
                swordSizeImage = swordImage.properties.canvases[imageSwordSize];
            }
            ctx.drawImage(
                swordSizeImage,
                0,
                0,
                swordSizeImage.width,
                swordSizeImage.height,
                paintX - Math.floor(swordSizeImage.width / 2),
                paintY - abilitySword.swordLength - SWORD_DISTANCE_TO_HODLDER,
                swordSizeImage.width,
                abilitySword.swordLength
            );
        }
        ctx.resetTransform();
    }
}

function tickAbilitySword(character: LevelingCharacter, ability: Ability, game: Game) {
    let abilitySword = ability as AbilitySword;
    abilitySword.currentSwordAngle = (abilitySword.currentSwordAngle + abilitySword.angleChangePerTick) % (Math.PI * 2);
    detectSwordToCharactersHit(character, abilitySword, game.state.map);
}

function createAbilitySwordUpgradeOptions(): UpgradeOptionAbility[] {
    let upgradeOptions: UpgradeOptionAbility[] = [];
    upgradeOptions.push({
        name: "Damage+10", upgrade: (a: Ability) => {
            let as = a as AbilitySword;
            as.damage += 10;
        }
    });
    upgradeOptions.push({
        name: "SwordSize+", upgrade: (a: Ability) => {
            let as = a as AbilitySword;
            as.swordLength += 10;
        }
    });

    upgradeOptions.push({
        name: "SwordCount+", upgrade: (a: Ability) => {
            let as = a as AbilitySword;
            as.swordCount += 1;
            as.angleChangePerSword = Math.PI * 2 / as.swordCount;
        }
    });

    upgradeOptions.push({
        name: "SwordSpeed+", upgrade: (a: Ability) => {
            let as = a as AbilitySword;
            as.angleChangePerTick += 0.005;
        }
    });

    return upgradeOptions;
}

function detectSwordToCharactersHit(sourceCharacter: Character, ability: AbilitySword, map: GameMap) {
    let maxEnemySizeEstimate = 40;

    let targetCharacters = determineCharactersInDistance(sourceCharacter, map, ability.swordLength + maxEnemySizeEstimate);
    for (let charIt = targetCharacters.length - 1; charIt >= 0; charIt--) {
        let targetCharacter = targetCharacters[charIt];
        if (targetCharacter.isDead || targetCharacter.faction === sourceCharacter.faction) continue;
        for (let swordIndex = 0; swordIndex < ability.swordCount; swordIndex++) {
            let isHit = detectSwordToCharacterHit(sourceCharacter, ability, targetCharacter, targetCharacter.width, swordIndex);
            if (isHit) {
                targetCharacter.hp -= ability.damage;
                targetCharacter.wasHitRecently = true;
            }
        }
    }
}

function detectSwordToCharacterHit(sourceSwordCharacter: Character, ability: AbilitySword, pos: Position, enemyWidth: number, swordIndex: number): boolean {
    let angle = calculateDirection(sourceSwordCharacter, pos);
    if (angle < 0) angle += Math.PI * 2;
    let currentSwordAngle = (ability.currentSwordAngle + (ability.angleChangePerSword * swordIndex)) % (Math.PI * 2);
    let angleSizeToCheck = ability.angleChangePerTick + 0.1;
    let startAngle = currentSwordAngle - angleSizeToCheck;
    angle = (angle - startAngle) % (Math.PI * 2);
    if (angle < 0) angle += Math.PI * 2;

    if (angle <= angleSizeToCheck) {
        let distance = calculateDistance(sourceSwordCharacter, pos);
        if (distance < ability.swordLength + SWORD_DISTANCE_TO_HODLDER + enemyWidth) {
            return true;
        }
    }

    return false;
}
