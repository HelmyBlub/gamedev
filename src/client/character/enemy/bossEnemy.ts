import { ABILITIES_FUNCTIONS, Ability } from "../../ability/ability.js";
import { ABILITY_NAME_LEASH, AbilityLeash } from "../../ability/abilityLeash.js";
import { createAbilityMelee } from "../../ability/abilityMelee.js";
import { tickCharacterDebuffs } from "../../debuff/debuff.js";
import { calculateDirection, deepCopy, getNextId, getTimeSinceFirstKill } from "../../game.js";
import { IdCounter, Game, Position, BossStuff, FACTION_ENEMY } from "../../gameModel.js";
import { findNearNonBlockingPosition, getMapMidlePosition, moveByDirectionAndDistance } from "../../map/map.js";
import { getPlayerFurthestAwayFromSpawn } from "../../player.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, getPlayerCharacters, calculateCharacterMovePosition, moveCharacterTick, tickCharacters } from "../character.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, IMAGE_SLIME, createCharacter } from "../characterModel.js";
import { paintCharacterDefault, paintCharacterHpBar, paintCharacters } from "../characterPaint.js";
import { getPathingCache, PathingCache } from "../pathing.js";
import { TamerPetCharacter } from "../playerCharacters/tamer/tamerPetCharacter.js";

export type BossEnemyCharacter = Character;
export const CHARACTER_TYPE_BOSS_ENEMY = "BossEnemyCharacter";

export function addBossType() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_BOSS_ENEMY] = {
        tickFunction: tickBossEnemyCharacter,
        paintCharacterType: paintBossEnemyCharacter,
    }
}

export function createBossWithLevel(idCounter: IdCounter, level: number, game: Game): BossEnemyCharacter {
    let bossSize = 60;
    let color = "black";
    let moveSpeed = Math.min(6, 1.5 + level * 0.5);
    let hp = 1000 * Math.pow(level, 4);
    let experienceWorth = Math.pow(level, 2) * 100;
    let spawn: Position = getBossSpawnPosition(game);

    let bossCharacter = createCharacter(getNextId(idCounter), spawn.x, spawn.y, bossSize, bossSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_BOSS_ENEMY, experienceWorth);
    bossCharacter.paint.image = IMAGE_SLIME;
    let abilities: Ability[] = createBossAbilities(level, game);
    bossCharacter.abilities = abilities;
    let pets: TamerPetCharacter[] | undefined = createBossPets(level, bossCharacter, game);
    bossCharacter.pets = pets;
    return bossCharacter;
}

export function tickBossCharacters(bossStuff: BossStuff, game: Game) {
    let pathingCache = getPathingCache(game);
    let bosses = bossStuff.bosses;
    tickCharacters(bosses, game, pathingCache);
}

function tickBossEnemyCharacter(enemy: BossEnemyCharacter, game: Game, pathingCache: PathingCache | null) {
    if (enemy.isDead) return;
    let playerCharacters = getPlayerCharacters(game.state.players);
    let closest = determineClosestCharacter(enemy, playerCharacters);
    if (closest.minDistance > 1200) {
        teleportBossToNearestPlayer(enemy, game);
        closest = determineClosestCharacter(enemy, playerCharacters);
    }
    calculateAndSetMoveDirectionToPositionWithPathing(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time);
    moveCharacterTick(enemy, game.state.map, game.state.idCounter);

    for (let ability of enemy.abilities) {
        let abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if(abilityFunctions){
            if (abilityFunctions.tickAbility) abilityFunctions.tickAbility(enemy, ability, game);
            if (abilityFunctions.tickBossAI) abilityFunctions.tickBossAI(enemy, ability, game);
        }
    }
    tickCharacterDebuffs(enemy, game);
}

export function paintBossCharacters(ctx: CanvasRenderingContext2D, cameraPosition: Position, game: Game) {
    paintCharacters(ctx, game.state.bossStuff.bosses, cameraPosition, game);
}

export function checkForBossSpawn(game: Game) {
    if (game.state.bossStuff.endBossStarted) return;
    let bossStuff = game.state.bossStuff;
    let nextBossSpawnTime = bossStuff.bossSpawnEachXMilliSecond * bossStuff.bossLevelCounter;
    if (getTimeSinceFirstKill(game.state) >= nextBossSpawnTime) {
        bossStuff.bosses.push(createBossWithLevel(game.state.idCounter, bossStuff.bossLevelCounter, game));
        bossStuff.bossLevelCounter++;
    }
}

function teleportBossToNearestPlayer(enemy: BossEnemyCharacter, game: Game) {
    let newPosition = getBossSpawnPosition(game);
    enemy.x = newPosition.x;
    enemy.y = newPosition.y;
}

function createBossPets(level: number, boss: Character, game: Game): TamerPetCharacter[] | undefined {
    const nextEndBoss = game.state.bossStuff.nextEndboss;
    if(nextEndBoss?.pets){
        const random = Math.floor(nextRandom(game.state.randomSeed) * nextEndBoss.pets.length);
        const pet: TamerPetCharacter = deepCopy(nextEndBoss.pets[random]);
        const leash: AbilityLeash | undefined = pet.abilities.find((a) => a.name === ABILITY_NAME_LEASH) as AbilityLeash;
        if(leash){
            leash.leashedToOwnerId = boss.id;
        }
        return [pet];
    }
    return undefined;
}

function createBossAbilities(level: number, game: Game): Ability[] {
    const abilities: Ability[] = [];
    const endBoss = game.state.bossStuff.nextEndboss;
    const possibleAbilities: Ability[] = [];
    for (let ability of endBoss!.abilities) {
        if (ABILITIES_FUNCTIONS[ability.name].canBeUsedByBosses) {
            possibleAbilities.push(ability);
        }
    }

    if (possibleAbilities.length > 0) {
        let randomAbilityChoice = 0;
        if (possibleAbilities.length > 1) {
            randomAbilityChoice = Math.floor(nextRandom(game.state.randomSeed) * possibleAbilities.length);
        }
        let randomAbility: Ability = possibleAbilities[randomAbilityChoice];
        let abilityFunctions = ABILITIES_FUNCTIONS[randomAbility.name];
        let ability = abilityFunctions.createAbility(game.state.idCounter);
        setAbilityToBossLevel(ability, level);
        if (!abilityFunctions.isPassive) ability.passive = true;
        abilities.push(ability);
    }

    let abilityMelee = createAbilityMelee(game.state.idCounter);
    setAbilityToBossLevel(abilityMelee, level);
    abilities.push(abilityMelee);

    return abilities;
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    let abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
    if (abilityFunctions.setAbilityToBossLevel) {
        abilityFunctions.setAbilityToBossLevel(ability, level);
    } else {
        throw new Error("function setAbilityToBossLevel missing for" + ability.name);
    }
}

function getBossSpawnPosition(game: Game): Position {
    const furthest = getPlayerFurthestAwayFromSpawn(game.state.players);
    const mapMiddle = getMapMidlePosition(game.state.map);
    if (furthest) {
        let bossSpawn: Position = { x: furthest.character.x, y: furthest.character.y };
        const direction = calculateDirection(mapMiddle, furthest.character);
        const distanceFromPlayer: number = 800;
        moveByDirectionAndDistance(bossSpawn, direction, distanceFromPlayer, false);
        bossSpawn = findNearNonBlockingPosition(bossSpawn, game.state.map, game.state.idCounter);

        return bossSpawn;
    } else {
        return mapMiddle;
    }
}

function paintBossEnemyCharacter(ctx: CanvasRenderingContext2D, character: BossEnemyCharacter, cameraPosition: Position, game: Game) {
    if (character.isDead) return;

    paintCharacterDefault(ctx, character, cameraPosition, game);

    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let paintX = character.x - cameraPosition.x + centerX;
    let paintY = character.y - cameraPosition.y + centerY;
    let characterX = Math.floor(paintX - character.width / 2);
    let characterY = Math.floor(paintY - character.height / 2);
    paintCharacterHpBar(ctx, character, { x: characterX, y: characterY });
}
