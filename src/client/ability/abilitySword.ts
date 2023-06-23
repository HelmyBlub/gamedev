import { determineCharactersInDistance, characterTakeDamage } from "../character/character.js";
import { BossEnemyCharacter } from "../character/enemy/bossEnemy.js";
import { calculateDirection, calculateDistance, getNextId } from "../game.js";
import { Position, Game, IdCounter } from "../gameModel.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { GameMap } from "../map/map.js";
import { Player } from "../player.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, AbilityUpgradeOption } from "./ability.js";

type AbilitySword = Ability & {
    damage: number,
    swordLength: number,
    swordCount: number,
    angleChangePerTick: number,
    currentSwordAngle: number,
    angleChangePerSword: number,
    tickInterval: number,
    nextTickTime?: number,
}
const ABILITY_NAME = "Sword";

GAME_IMAGES[ABILITY_NAME] = {
    imagePath: "/images/sword.png",
    spriteRowHeights: [38],
    spriteRowWidths: [11],
};

export function addSwordAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME] = {
        tickAbility: tickAbilitySword,
        createAbilityUpgradeOptions: createAbilitySwordUpgradeOptions,
        paintAbility: paintAbilitySword,
        setAbilityToLevel: setAbilitySwordToLevel,
        createAbility: createAbilitySword,
        setAbilityToBossLevel: setAbilitySwordToBossLevel,
        isPassive: true,
        canBeUsedByBosses: true,
    };
}

export function createAbilitySword(
    idCounter: IdCounter,
    playerInputBinding?: string,
    damage: number = 50,
    swordLength: number = 30,
    swordCount: number = 1,
    angleChangePerTick: number = 0.01,
    angleChangePerSword: number = 1
): AbilitySword {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME,
        damage: damage,
        swordLength: swordLength,
        swordCount: swordCount,
        angleChangePerTick: angleChangePerTick,
        currentSwordAngle: 0,
        angleChangePerSword: angleChangePerSword,
        passive: true,
        tickInterval: 100,
        upgrades: {},
    };
}

function setAbilitySwordToLevel(ability: Ability, level: number){
    let abilitySword = ability as AbilitySword;
    abilitySword.damage = level * 50;
    abilitySword.swordCount = level;
    abilitySword.swordLength = 30 + level * 10;
    abilitySword.angleChangePerTick = 0.01 * level;
    abilitySword.angleChangePerSword = Math.PI * 2 / abilitySword.swordCount;
}

function setAbilitySwordToBossLevel(ability: Ability, level: number){
    let abilitySword = ability as AbilitySword;
    abilitySword.damage = level * 25;
    abilitySword.swordCount = level > 5 ? 2 : 1;
    abilitySword.swordLength = 30 + level * 25;
    abilitySword.angleChangePerTick = 0.01 + 0.005 * level;
    abilitySword.angleChangePerSword = Math.PI * 2 / abilitySword.swordCount;
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

function paintAbilitySword(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    let abilitySword = ability as AbilitySword;
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let paintX = Math.floor(abilityOwner.x - cameraPosition.x + centerX);
    let paintY = Math.floor(abilityOwner.y - cameraPosition.y + centerY);

    //ctx.fillStyle = character.color;
    let swordImage = GAME_IMAGES[ABILITY_NAME];
    loadImage(swordImage);

    for (let i = 0; i < abilitySword.swordCount; i++) {
        ctx.translate(paintX, paintY);
        ctx.rotate(abilitySword.currentSwordAngle + Math.PI / 2 + abilitySword.angleChangePerSword * i);
        ctx.translate(-paintX, -paintY);
        if (swordImage.imageRef?.complete) {
            let swordSizeImage: HTMLImageElement = swordImage.imageRef;
            if (abilitySword.swordLength > swordSizeImage.height + 10) {
                let imageSwordSize = Math.round(abilitySword.swordLength / 10) * 10;
                createBiggerSwordImage(imageSwordSize);
                swordSizeImage = swordImage.properties!.canvases![imageSwordSize];
            }
            ctx.drawImage(
                swordSizeImage,
                0,
                0,
                swordSizeImage.width,
                swordSizeImage.height,
                paintX - Math.floor(swordSizeImage.width / 2),
                paintY - abilitySword.swordLength - swordDistanceToHolder(abilityOwner),
                swordSizeImage.width,
                abilitySword.swordLength
            );
        }
        ctx.resetTransform();
    }
}

function swordDistanceToHolder(abilityOwner: AbilityOwner): number{
    const baseDistance = 10;
    let result = baseDistance;
    if(abilityOwner.width){
        result += abilityOwner.width / 2;
    }

    return result;
}

function tickAbilitySword(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilitySword = ability as AbilitySword;
    abilitySword.currentSwordAngle = (abilitySword.currentSwordAngle + abilitySword.angleChangePerTick) % (Math.PI * 2);    

    if(abilitySword.nextTickTime === undefined) abilitySword.nextTickTime = game.state.time + abilitySword.tickInterval;
    if(abilitySword.nextTickTime <= game.state.time){
        detectSwordToCharactersHit(abilityOwner, abilitySword, game.state.map, game.state.players, game.state.bossStuff.bosses, game);
        abilitySword.nextTickTime += abilitySword.tickInterval;
        if(abilitySword.nextTickTime <= game.state.time){
            abilitySword.nextTickTime = game.state.time + abilitySword.tickInterval;
        }
    }
}

function createAbilitySwordUpgradeOptions(): AbilityUpgradeOption[] {
    let upgradeOptions: AbilityUpgradeOption[] = [];
    upgradeOptions.push({
        name: "Damage+50", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySword;
            as.damage += 50;
        }
    });
    upgradeOptions.push({
        name: "SwordSize+", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySword;
            as.swordLength += 10;
        }
    });

    upgradeOptions.push({
        name: "SwordCount+", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySword;
            as.swordCount += 1;
            as.angleChangePerSword = Math.PI * 2 / as.swordCount;
        }
    });

    upgradeOptions.push({
        name: "SwordSpeed+", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySword;
            as.angleChangePerTick += 0.005;
        }
    });

    return upgradeOptions;
}

function detectSwordToCharactersHit(abilityOwner: AbilityOwner, ability: AbilitySword, map: GameMap, players: Player[], bosses: BossEnemyCharacter[], game: Game) {
    let maxEnemySizeEstimate = 40;

    let targetCharacters = determineCharactersInDistance(abilityOwner, map, players, bosses ,ability.swordLength + maxEnemySizeEstimate);
    for (let charIt = targetCharacters.length - 1; charIt >= 0; charIt--) {
        let targetCharacter = targetCharacters[charIt];
        if (targetCharacter.isDead || targetCharacter.faction === abilityOwner.faction) continue;
        for (let swordIndex = 0; swordIndex < ability.swordCount; swordIndex++) {
            let isHit = detectSwordToCharacterHit(abilityOwner, ability, targetCharacter, targetCharacter.width, swordIndex);
            if (isHit) {
                characterTakeDamage(targetCharacter, ability.damage, game, ability.id);
            }
        }
    }
}

function detectSwordToCharacterHit(abilityOwner: AbilityOwner, ability: AbilitySword, pos: Position, enemyWidth: number, swordIndex: number): boolean {
    let angle = calculateDirection(abilityOwner, pos);
    if (angle < 0) angle += Math.PI * 2;
    let currentSwordAngle = (ability.currentSwordAngle + (ability.angleChangePerSword * swordIndex)) % (Math.PI * 2);
    let angleSizeToCheck = (ability.angleChangePerTick * (ability.tickInterval / 16)) + 0.1;
    let startAngle = currentSwordAngle - angleSizeToCheck;
    angle = (angle - startAngle) % (Math.PI * 2);
    if (angle < 0) angle += Math.PI * 2;

    if (angle <= angleSizeToCheck) {
        let distance = calculateDistance(abilityOwner, pos);
        if (distance < ability.swordLength + swordDistanceToHolder(abilityOwner) + enemyWidth) {
            return true;
        }
    }

    return false;
}
