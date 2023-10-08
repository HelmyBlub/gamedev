import { determineCharactersInDistance, characterTakeDamage } from "../character/character.js";
import { BossEnemyCharacter } from "../character/enemy/bossEnemy.js";
import { calculateDirection, calculateDistance, getNextId } from "../game.js";
import { Position, Game, IdCounter } from "../gameModel.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { GameMap } from "../map/map.js";
import { Player } from "../player.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner } from "./ability.js";

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
export const ABILITY_NAME_SWORD = "Sword";

GAME_IMAGES[ABILITY_NAME_SWORD] = {
    imagePath: "/images/sword.png",
    spriteRowHeights: [38],
    spriteRowWidths: [11],
};

export function addAbilitySword() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SWORD] = {
        tickAbility: tickAbilitySword,
        paintAbility: paintAbilitySword,
        setAbilityToLevel: setAbilitySwordToLevel,
        createAbility: createAbilitySword,
        setAbilityToBossLevel: setAbilitySwordToBossLevel,
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
        name: ABILITY_NAME_SWORD,
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
    const abilitySword = ability as AbilitySword;
    abilitySword.damage = level * 50;
    abilitySword.swordCount = level;
    abilitySword.swordLength = 30 + level * 10;
    abilitySword.angleChangePerTick = 0.01 * level;
    abilitySword.angleChangePerSword = Math.PI * 2 / abilitySword.swordCount;
}

function setAbilitySwordToBossLevel(ability: Ability, level: number){
    const abilitySword = ability as AbilitySword;
    abilitySword.damage = level * 25;
    abilitySword.swordCount = level > 5 ? 2 : 1;
    abilitySword.swordLength = 30 + level * 25;
    abilitySword.angleChangePerTick = Math.min(0.01 + 0.005 * level, 0.03);
    abilitySword.angleChangePerSword = Math.PI * 2 / abilitySword.swordCount;
}

function createBiggerSwordImage(newSwordSize: number) {
    const swordImage = GAME_IMAGES[ABILITY_NAME_SWORD];
    if (swordImage.imageRef === undefined) return;
    if (swordImage.properties === undefined) swordImage.properties = {};
    if (swordImage.properties.canvases === undefined) swordImage.properties.canvases = {};
    if (swordImage.properties.canvases[newSwordSize] === undefined) {
        if (newSwordSize < 25) {
            throw new Error("newSwordSize too small");
        }
        const canvas = document.createElement('canvas');
        canvas.width = swordImage.imageRef.width;
        canvas.height = Math.floor(newSwordSize);
        const imageCtx: CanvasRenderingContext2D = canvas.getContext("2d")!;
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
    const abilitySword = ability as AbilitySword;
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const paintX = Math.floor(abilityOwner.x - cameraPosition.x + centerX);
    const paintY = Math.floor(abilityOwner.y - cameraPosition.y + centerY);

    //ctx.fillStyle = character.color;
    const swordImage = GAME_IMAGES[ABILITY_NAME_SWORD];
    loadImage(swordImage);

    for (let i = 0; i < abilitySword.swordCount; i++) {
        ctx.translate(paintX, paintY);
        ctx.rotate(abilitySword.currentSwordAngle + Math.PI / 2 + abilitySword.angleChangePerSword * i);
        ctx.translate(-paintX, -paintY);
        if (swordImage.imageRef?.complete) {
            let swordSizeImage: HTMLImageElement = swordImage.imageRef;
            if (abilitySword.swordLength > swordSizeImage.height + 10) {
                const imageSwordSize = Math.round(abilitySword.swordLength / 10) * 10;
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
    const abilitySword = ability as AbilitySword;
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

function detectSwordToCharactersHit(abilityOwner: AbilityOwner, ability: AbilitySword, map: GameMap, players: Player[], bosses: BossEnemyCharacter[], game: Game) {
    const maxEnemySizeEstimate = 40;

    const targetCharacters = determineCharactersInDistance(abilityOwner, map, players, bosses ,ability.swordLength + maxEnemySizeEstimate);
    for (let charIt = targetCharacters.length - 1; charIt >= 0; charIt--) {
        const targetCharacter = targetCharacters[charIt];
        if (targetCharacter.isDead || targetCharacter.faction === abilityOwner.faction) continue;
        for (let swordIndex = 0; swordIndex < ability.swordCount; swordIndex++) {
            const isHit = detectSwordToCharacterHit(abilityOwner, ability, targetCharacter, targetCharacter.width, swordIndex);
            if (isHit) {
                characterTakeDamage(targetCharacter, ability.damage, game, ability.id);
            }
        }
    }
}

function detectSwordToCharacterHit(abilityOwner: AbilityOwner, ability: AbilitySword, pos: Position, enemyWidth: number, swordIndex: number): boolean {
    let angle = calculateDirection(abilityOwner, pos);
    if (angle < 0) angle += Math.PI * 2;
    const currentSwordAngle = (ability.currentSwordAngle + (ability.angleChangePerSword * swordIndex)) % (Math.PI * 2);
    const angleSizeToCheck = (ability.angleChangePerTick * (ability.tickInterval / 16)) + 0.1;
    const startAngle = currentSwordAngle - angleSizeToCheck;
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
