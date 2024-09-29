import { ABILITIES_FUNCTIONS, Ability, setAbilityToBossLevel } from "../../ability/ability.js";
import { ABILITY_NAME_LEASH, AbilityLeash } from "../../ability/abilityLeash.js";
import { createAbilityMelee } from "../../ability/abilityMelee.js";
import { achievementCheckOnBossKill } from "../../achievements/achievements.js";
import { doDamageMeterSplit } from "../../combatlog.js";
import { curseDarknessCloneKillCheck } from "../../curse/curseDarkness.js";
import { tickCharacterDebuffs } from "../../debuff/debuff.js";
import { calculateDirection, deepCopy, getNextId, getTimeSinceFirstKill } from "../../game.js";
import { IdCounter, Game, Position, BossStuff, FACTION_ENEMY, CelestialDirection } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { GameMap, findNearNonBlockingPosition, getMapMidlePosition, moveByDirectionAndDistance } from "../../map/map.js";
import { mapModifierGrowArea } from "../../map/modifiers/mapModifier.js";
import { addMoneyAmountToPlayer, addMoneyUiMoreInfo, getPlayerFurthestAwayFromSpawn } from "../../player.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, getPlayerCharacters, moveCharacterTick, tickCharacters, setCharacterPosition, playerCharactersAddBossSkillPoints, experienceForEveryPlayersLeveling } from "../character.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, IMAGE_SLIME, createCharacter } from "../characterModel.js";
import { paintCharacterWithAbilitiesDefault, paintCharacterHpBar, paintCharacters, paintCharatersPets } from "../characterPaint.js";
import { getPathingCache, PathingCache } from "../pathing.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "../playerCharacters/playerCharacters.js";
import { TamerPetCharacter } from "../playerCharacters/tamer/tamerPetCharacter.js";
import { CHARACTER_TYPE_GOD_ENEMY } from "./god/godEnemy.js";
import { CHARACTER_TYPE_END_BOSS_CROWN_ENEMY } from "./kingCrown.js";
import { CHARACTER_TYPE_KING_ENEMY } from "./kingEnemy.js";

export type BossEnemyCharacter = Character;
export const CHARACTER_TYPE_BOSS_ENEMY = "BossEnemyCharacter";
export const CHARACTER_TYPE_BOSS_CLONE_ENEMY = "BossCloneEnemyCharacter";

export function addBossType() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_BOSS_ENEMY] = {
        onCharacterKill: onBossKill,
        tickFunction: tickBossEnemyCharacter,
        paintCharacterType: paintBossEnemyCharacter,
    }
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_BOSS_CLONE_ENEMY] = {
        onCharacterKill: onCloneBossKill,
        tickFunction: tickBossEnemyCharacter,
        paintCharacterType: paintBossEnemyCharacter,
    }
}

export function createBossWithLevel(idCounter: IdCounter, level: number, game: Game): BossEnemyCharacter {
    const spawn: Position = getBossSpawnPosition(game);
    const celestialDirection = getCelestialDirection(spawn, game.state.map);
    const nextKing = game.state.bossStuff.nextKings[celestialDirection]!;
    const nextBossClass = findBossClassBasedOnKing(nextKing);
    if (nextBossClass) {
        const classFuntions = PLAYER_CHARACTER_CLASSES_FUNCTIONS[nextBossClass];
        if (classFuntions && classFuntions.createBossBasedOnClassAndCharacter) {
            return classFuntions.createBossBasedOnClassAndCharacter(nextKing, level, spawn, game);
        }
    }
    return createDefaultBossWithLevel(idCounter, level, spawn, nextKing, game);
}

export function tickBossCharacters(bossStuff: BossStuff, game: Game) {
    const pathingCache = getPathingCache(game);
    const bosses = bossStuff.bosses;
    tickCharacters(bosses, game, pathingCache);
    deleteDeadBosses(bossStuff);
}

export function getCelestialDirection(position: Position, map: GameMap): CelestialDirection {
    const middle = getMapMidlePosition(map);
    if (Math.abs(position.x - middle.x) > Math.abs(position.y - middle.y)) {
        if (position.x - middle.x > 0) {
            return "east";
        } else {
            return "west";
        }
    } else {
        if (position.y - middle.y > 0) {
            return "south";
        } else {
            return "north";
        }
    }
}

export function paintBossCharacters(ctx: CanvasRenderingContext2D, cameraPosition: Position, game: Game) {
    for (let boss of game.state.bossStuff.bosses) {
        if (boss.type !== CHARACTER_TYPE_END_BOSS_CROWN_ENEMY) {
            paintCharacters(ctx, [boss], cameraPosition, game);
        }
    }
}

export function paintBossCrown(ctx: CanvasRenderingContext2D, cameraPosition: Position, game: Game) {
    for (let boss of game.state.bossStuff.bosses) {
        if (boss.type === CHARACTER_TYPE_END_BOSS_CROWN_ENEMY) {
            paintCharacters(ctx, [boss], cameraPosition, game);
        }
    }
}

export function checkForBossSpawn(game: Game) {
    if (game.state.bossStuff.kingFightStartedTime !== undefined || game.state.bossStuff.godFightStartedTime !== undefined) return;
    const bossStuff = game.state.bossStuff;
    const nextBossSpawnTime = getNextBossSpawnTime(bossStuff);
    if (getTimeSinceFirstKill(game.state) >= nextBossSpawnTime) {
        bossStuff.bosses.push(createBossWithLevel(game.state.idCounter, bossStuff.bossLevelCounter, game));
        bossStuff.bossLevelCounter++;
        mapModifierGrowArea(game);
    }
}

/// relative to timeSinceFirstKill
export function getNextBossSpawnTime(bossStuff: BossStuff): number {
    return bossStuff.bossSpawnEachXMilliSecond * bossStuff.bossLevelCounter;
}

export function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
    if (abilityFunctions.setAbilityToEnemyLevel) {
        abilityFunctions.setAbilityToEnemyLevel(ability, level, damageFactor);
    } else {
        throw new Error("function setAbilityToBossLevel missing for" + ability.name);
    }
}

export function setCharacterToBossLevel(character: Character, level: number) {
    character.hp = 1000 * Math.pow(level, 4);
    character.maxHp = character.hp;
    character.experienceWorth = calculateBossEnemyExperienceWorth(level);
    character.level = { level: level };
    for (let ability of character.abilities) {
        setAbilityToBossLevel(ability, level);
    }

    if (character.pets) {
        for (let pet of character.pets) {
            pet.faction = FACTION_ENEMY;
            setCharacterToBossLevel(pet, level);
        }
    }
}

export function calculateBossEnemyExperienceWorth(level: number): number {
    return Math.pow(level, 3) * 500;
}

function deleteDeadBosses(bossStuff: BossStuff) {
    for (let i = bossStuff.bosses.length - 1; i >= 0; i--) {
        const boss = bossStuff.bosses[i];
        if (boss.state === "dead" && boss.type !== CHARACTER_TYPE_KING_ENEMY && boss.type !== CHARACTER_TYPE_GOD_ENEMY) {
            bossStuff.bosses.splice(i, 1);
        }
    }
}

function onCloneBossKill(character: Character, game: Game) {
    curseDarknessCloneKillCheck(character, game);
}

function onBossKill(character: Character, game: Game) {
    playerCharactersAddBossSkillPoints(character.level?.level, game);
    experienceForEveryPlayersLeveling(character.experienceWorth, game);
    doDamageMeterSplit(game.state.bossStuff.bossLevelCounter.toFixed(), game);
    if (character.level?.level) {
        const moneyAmount = character.level.level;
        addMoneyUiMoreInfo(moneyAmount, `for Boss kills`, game);
        addMoneyAmountToPlayer(moneyAmount, game.state.players, game);
    }
    achievementCheckOnBossKill(game.state.achievements, game);
}

function findBossClassBasedOnKing(boss: Character): string | undefined {
    if (boss.characterClasses) {
        for (let bossClass of boss.characterClasses) {
            if (!bossClass.gifted) return bossClass.className;
        }
    }
    return undefined;
}

function createDefaultBossWithLevel(idCounter: IdCounter, level: number, spawn: Position, nextKing: Character, game: Game): Character {
    const bossSize = 60;
    const color = "black";
    const moveSpeed = Math.min(6, 1.5 + level * 0.5);
    const hp = 1000 * Math.pow(level, 4);
    const experienceWorth = calculateBossEnemyExperienceWorth(level);

    const bossCharacter = createCharacter(getNextId(idCounter), spawn.x, spawn.y, bossSize, bossSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_BOSS_ENEMY, experienceWorth);
    bossCharacter.paint.image = IMAGE_SLIME;
    bossCharacter.level = { level: level };
    const abilities: Ability[] = createBossAbilities(level, nextKing, game);
    bossCharacter.abilities = abilities;
    const pets: TamerPetCharacter[] | undefined = createBossPets(level, bossCharacter, nextKing, game);
    bossCharacter.pets = pets;
    return bossCharacter;
}

function tickBossEnemyCharacter(enemy: BossEnemyCharacter, game: Game, pathingCache: PathingCache | null) {
    if (enemy.state === "dead") return;
    const playerCharacters = getPlayerCharacters(game.state.players);
    let closest = determineClosestCharacter(enemy, playerCharacters);
    if (closest.minDistance > 1200) {
        teleportBossToNearestPlayer(enemy, game);
        closest = determineClosestCharacter(enemy, playerCharacters);
    }
    calculateAndSetMoveDirectionToPositionWithPathing(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time, game);
    moveCharacterTick(enemy, game.state.map, game.state.idCounter, game);

    for (let ability of enemy.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions) {
            if (abilityFunctions.tickAI) abilityFunctions.tickAI(enemy, ability, game);
        }
    }
    tickCharacterDebuffs(enemy, game);
}

function teleportBossToNearestPlayer(enemy: BossEnemyCharacter, game: Game) {
    const newPosition = getBossSpawnPosition(game);
    setCharacterPosition(enemy, newPosition, game.state.map);
}

function createBossPets(level: number, boss: Character, nextKing: Character, game: Game): TamerPetCharacter[] | undefined {
    if (nextKing?.pets) {
        const random = Math.floor(nextRandom(game.state.randomSeed) * nextKing.pets.length);
        const pet: TamerPetCharacter = deepCopy(nextKing.pets[random]);
        const leash: AbilityLeash | undefined = pet.abilities.find((a) => a.name === ABILITY_NAME_LEASH) as AbilityLeash;
        if (leash) {
            leash.leashedToOwnerId = boss.id;
        }
        return [pet];
    }
    return undefined;
}

function createBossAbilities(level: number, nextKing: Character, game: Game): Ability[] {
    const abilities: Ability[] = [];
    const possibleAbilities: Ability[] = [];
    for (let ability of nextKing!.abilities) {
        if (ABILITIES_FUNCTIONS[ability.name].canBeUsedByBosses) {
            possibleAbilities.push(ability);
        }
    }

    if (possibleAbilities.length > 0) {
        let randomAbilityChoice = 0;
        if (possibleAbilities.length > 1) {
            randomAbilityChoice = Math.floor(nextRandom(game.state.randomSeed) * possibleAbilities.length);
        }
        const randomAbility: Ability = possibleAbilities[randomAbilityChoice];
        const abilityFunctions = ABILITIES_FUNCTIONS[randomAbility.name];
        const ability = abilityFunctions.createAbility(game.state.idCounter);
        setAbilityToBossLevel(ability, level);
        ability.passive = true;
        abilities.push(ability);
    }

    const abilityMelee = createAbilityMelee(game.state.idCounter);
    setAbilityToBossLevel(abilityMelee, level);
    abilities.push(abilityMelee);

    return abilities;
}

function getBossSpawnPosition(game: Game): Position {
    const furthest = getPlayerFurthestAwayFromSpawn(game.state.players);
    const mapMiddle = getMapMidlePosition(game.state.map);
    if (furthest) {
        let bossSpawn: Position = { x: furthest.character.x, y: furthest.character.y };
        const direction = calculateDirection(mapMiddle, furthest.character);
        const distanceFromPlayer: number = 800;
        moveByDirectionAndDistance(bossSpawn, direction, distanceFromPlayer, false);
        bossSpawn = findNearNonBlockingPosition(bossSpawn, game.state.map, game.state.idCounter, game);

        return bossSpawn;
    } else {
        return mapMiddle;
    }
}

function paintBossEnemyCharacter(ctx: CanvasRenderingContext2D, character: BossEnemyCharacter, cameraPosition: Position, game: Game) {
    if (character.state === "dead") return;
    paintCharatersPets(ctx, [character], cameraPosition, game);
    paintCharacterWithAbilitiesDefault(ctx, character, cameraPosition, game);
    const paintPos = getPointPaintPosition(ctx, character, cameraPosition, game.UI.zoom);
    const hpBarPos = {
        x: Math.floor(paintPos.x - character.width / 2),
        y: Math.floor(paintPos.y - character.height / 2)
    };

    paintCharacterHpBar(ctx, character, hpBarPos);
}
