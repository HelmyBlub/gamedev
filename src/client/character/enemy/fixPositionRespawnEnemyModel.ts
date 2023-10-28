import { ABILITIES_FUNCTIONS, Ability, addAbilityToCharacter, createAbility } from "../../ability/ability.js"
import { createAbilityMelee } from "../../ability/abilityMelee.js"
import { ABILITY_NAME_FEED_PET } from "../../ability/petTamer/abilityFeedPet.js"
import { ABILITY_NAME_LOVE_PET } from "../../ability/petTamer/abilityLovePet.js"
import { calculateDistance, getNextId } from "../../game.js"
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../gameModel.js"
import { MapChunk, GameMap, isPositionBlocking, mapKeyToChunkXY } from "../../map/map.js"
import { fixedRandom } from "../../randomNumberGenerator.js"
import { resetCharacter } from "../character.js"
import { Character, IMAGE_SLIME, createCharacter } from "../characterModel.js"
import { createPetsBasedOnLevelAndCharacter } from "../playerCharacters/tamer/tamerCharacter.js"
import { TamerPetCharacter } from "../playerCharacters/tamer/tamerPetCharacter.js"
import { getCelestialDirection, setAbilityToEnemyLevel } from "./bossEnemy.js"

export type FixPositionRespawnEnemyCharacter = Character & {
    alertEnemyRange?: number,
    autoAggroRange: number,
    maxAggroRange: number,
    isAggroed: boolean,
    spawnPosition: Position,
    nextTickTime?: number,
    respawnOnTime?: number,
    respawnTime: number,
    level: number,
}
type EnemyTypes = {
    [key: string]: EnemyType
}

type EnemyType = {
    hpFactor: number,
    sizeFactor: number,
    spawnAmountFactor: number,
    xpFactor: number,
    damageFactor: number,
    hasAbility?: boolean,
    abilityProbabiltiy?: number,
}

export const ENEMY_FIX_RESPAWN_PSOITON = "fixPositionRespawnEnemy";
const ENEMY_TYPES: EnemyTypes = {
    "big": { hpFactor: 16, sizeFactor: 1.5, spawnAmountFactor: 0.008, xpFactor: 38, damageFactor: 2, hasAbility: true, abilityProbabiltiy: 1 },
    "default": { hpFactor: 1, sizeFactor: 1, spawnAmountFactor: 0.5, xpFactor: 1, damageFactor: 1 },
    "small": { hpFactor: 0.5, sizeFactor: 0.75, spawnAmountFactor: 1, xpFactor: 0.5, damageFactor: 0.5 },
}

export function createEnemyWithLevel(idCounter: IdCounter, enemyPos: Position, level: number, enemyType: EnemyType, game: Game) {
    if (enemyType === undefined) {
        throw Error("enemy type unknwon" + enemyType);
    }
    const colors = ["black", "green", "blue", "red"];
    const hp = 5 * Math.pow(level, 3) * enemyType.hpFactor;
    const moveSpeed = Math.min(20, 1 + level / 5);
    const size = Math.min(40, (10 + 5 * Math.floor(level / colors.length + 1)) * enemyType.sizeFactor);
    const color = colors[level % colors.length];
    const autoAggroRange = Math.min(750, 50 + level * 50);
    const alertEnemyRange = Math.min(500, 50 + level * 25);
    const respawnTime = Math.max(1000, 30000 - level * 1000);
    let experienceWorth = 1 * enemyType.xpFactor * Math.pow(level, 2);
    const meleeDamage = (2 + level * 2) * enemyType.damageFactor;

    const enemy = createEnemy(idCounter, enemyPos.x, enemyPos.y, size, moveSpeed, hp, color, autoAggroRange, alertEnemyRange, respawnTime, experienceWorth, level);
    enemy.abilities.push(createAbilityMelee(idCounter, undefined, meleeDamage));
    if (enemyType.hasAbility && enemyType.abilityProbabiltiy && level > 1) {
        const random = fixedRandom(enemyPos.x, enemyPos.y, 0);
        if (random <= enemyType.abilityProbabiltiy) {
            const celestialDirection = getCelestialDirection(enemyPos);
            const endBoss = game.state.bossStuff.nextEndbosses[celestialDirection]!;
            const whatToAdd = randomWhatToAdd(endBoss, enemy, game);
            if(whatToAdd === "addAbility"){
                const ability = createEnemyAbilityBasedOnEndBoss(level, endBoss, enemyPos, enemyType.damageFactor, game);
                if (ability) {
                    experienceWorth *= 2;
                    enemy.abilities.push(ability);
                }
            }
            if(whatToAdd === "addPet"){
                const levelReduced = Math.max(Math.floor(level/4), 1);
                const pet: TamerPetCharacter = createPetsBasedOnLevelAndCharacter(endBoss, levelReduced, enemy, game)[0];
                if (pet) {
                    experienceWorth *= 2;
                    enemy.pets = [];
                    enemy.pets!.push(pet);
                    addAbilityToCharacter(enemy, createAbility(ABILITY_NAME_FEED_PET, idCounter));
                    addAbilityToCharacter(enemy, createAbility(ABILITY_NAME_LOVE_PET, idCounter));                
                }
            }
        }
    }
    return enemy;
}

export function createFixPositionRespawnEnemiesOnInit(game: Game) {
    const map = game.state.map;
    const existingMapKeys = Object.keys(map.chunks);
    for (let i = 0; i < existingMapKeys.length; i++) {
        const chunk = map.chunks[existingMapKeys[i]];
        if (chunk.characters.length === 0) {
            const chunkXY = mapKeyToChunkXY(existingMapKeys[i]);
            createFixPositionRespawnEnemies(chunk, chunkXY.chunkX, chunkXY.chunkY, map, game.state.idCounter, game);
        }
    }
}

export function createFixPositionRespawnEnemies(chunk: MapChunk, chunkX: number, chunkY: number, map: GameMap, idCounter: IdCounter, game: Game) {
    if (chunk.characters.length > 0) {
        console.log("unexpected existence of characers in mapChunk", chunk, chunkX, chunkY);
    }
    if (chunk.isEndBossAreaChunk) return;
    const chunkSize = map.tileSize * map.chunkLength;
    const mapCenter = { x: chunkSize / 2, y: chunkSize / 2 };
    const minSpawnDistanceFromMapCenter = 500;

    const topLeftMapKeyPos: Position = {
        x: chunkX * chunkSize,
        y: chunkY * chunkSize
    }
    const centerMapKeyPos: Position = {
        x: topLeftMapKeyPos.x + chunkSize / 2,
        y: topLeftMapKeyPos.y + chunkSize / 2
    }
    const chunkDistance = calculateDistance(mapCenter, centerMapKeyPos);
    let enemyType: string;
    if (chunkY > 0 && Math.abs(chunkY) >= Math.abs(chunkX)) {
        enemyType = "big";
    } else if (chunkY < 0 && Math.abs(chunkY) >= Math.abs(chunkX)) {
        enemyType = "small";
    } else {
        enemyType = "default";
    }
    if (minSpawnDistanceFromMapCenter < chunkDistance + chunkSize) {
        for (let x = 0; x < chunk.tiles.length; x++) {
            for (let y = 0; y < chunk.tiles[x].length; y++) {
                const spawnEnemy = fixedRandom(x + chunkX * chunk.tiles.length, y + chunkY * chunk.tiles[x].length, map.seed!);
                if (spawnEnemy <= ENEMY_TYPES[enemyType].spawnAmountFactor) {
                    const enemyPos: Position = {
                        x: topLeftMapKeyPos.x + x * map.tileSize + map.tileSize / 2,
                        y: topLeftMapKeyPos.y + y * map.tileSize + map.tileSize / 2
                    }
                    const distance = calculateDistance(mapCenter, enemyPos);
                    if (minSpawnDistanceFromMapCenter < distance) {
                        if (!isPositionBlocking(enemyPos, map, idCounter, game)) {
                            const level = Math.max(Math.floor((distance - minSpawnDistanceFromMapCenter) / 1000), 0) + 1;
                            chunk.characters.push(createEnemyWithLevel(idCounter, enemyPos, level, ENEMY_TYPES[enemyType], game));
                        }
                    }
                }
            }
        }
    }
}

function createEnemy(
    idCounter: IdCounter,
    x: number,
    y: number,
    size: number,
    moveSpeed: number,
    hp: number,
    color: string,
    autoAggroRange: number,
    alertEnemyRange: number,
    respawnTime: number,
    experienceWorth: number,
    level: number,
): FixPositionRespawnEnemyCharacter {
    const enemy = createCharacter(getNextId(idCounter), x, y, size, size, color, moveSpeed, hp, FACTION_ENEMY, ENEMY_FIX_RESPAWN_PSOITON, experienceWorth);
    enemy.paint.image = IMAGE_SLIME;
    return {
        ...enemy,
        autoAggroRange: autoAggroRange,
        spawnPosition: { x, y },
        respawnTime: respawnTime,
        isAggroed: false,
        maxAggroRange: Math.max(200, autoAggroRange * 1.5),
        alertEnemyRange: alertEnemyRange,
        level: level,
    };
}

function randomWhatToAdd(nextEndBoss: Character, charPosition: Position, game: Game): "addPet" | "addAbility"{
    const possibleAbilities: Ability[] = [];
    const possiblePets: TamerPetCharacter[] = [];
    for (let ability of nextEndBoss!.abilities) {
        if (ABILITIES_FUNCTIONS[ability.name].canBeUsedByBosses) {
            possibleAbilities.push(ability);
        }
    }
    if (nextEndBoss.pets) {
        for (let pet of nextEndBoss.pets) {
            possiblePets.push(pet);
        }
    }
    let maxRandom = possibleAbilities.length + possiblePets.length;
    let randomChoice = 0;
    if (maxRandom > 1) {
        randomChoice = Math.floor(fixedRandom(charPosition.x, charPosition.y, game.state.map.seed! + 5) * maxRandom);
    }
    if (randomChoice < possibleAbilities.length) {
        return "addAbility";
    }else{
        return "addPet";
    }
}

function createEnemyAbilityBasedOnEndBoss(level: number, nextEndBoss: Character, enemyPos: Position, damageFactor: number, game: Game): Ability | undefined {
    const possibleAbilities: Ability[] = [];
    for (let ability of nextEndBoss!.abilities) {
        if (ABILITIES_FUNCTIONS[ability.name].canBeUsedByBosses) {
            possibleAbilities.push(ability);
        }
    }

    if (possibleAbilities.length > 0) {
        let randomChoice = 0;
        if (possibleAbilities.length > 1) {
            randomChoice = Math.floor(fixedRandom(enemyPos.x, enemyPos.y, game.state.map.seed! + 5) * possibleAbilities.length);
        }
        if (randomChoice < possibleAbilities.length) {
            const randomAbility: Ability = possibleAbilities[randomChoice];
            const abilityFunctions = ABILITIES_FUNCTIONS[randomAbility.name];
            const ability = abilityFunctions.createAbility(game.state.idCounter);
            setAbilityToEnemyLevel(ability, level, damageFactor);
            ability.passive = true;
            return ability;
        }
    }

    return undefined;
}
