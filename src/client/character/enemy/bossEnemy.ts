import { ABILITIES_FUNCTIONS, Ability } from "../../ability/ability.js";
import { createAbilityMelee } from "../../ability/abilityMelee.js";
import { tickCharacterDebuffs } from "../../debuff/debuff.js";
import { calculateDirection, getNextId } from "../../game.js";
import { IdCounter, Game, Position, BossStuff } from "../../gameModel.js";
import { GAME_IMAGES, loadImage } from "../../imageLoad.js";
import { findNearNonBlockingPosition, getMapMidlePosition, moveByDirectionAndDistance } from "../../map/map.js";
import { getHighestLevelOfPlayers, getPlayerFurthestAwayFromSpawn } from "../../player.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { determineClosestCharacter, determineEnemyHitsPlayer, determineEnemyMoveDirection, getPlayerCharacters, moveCharacterTick } from "../character.js";
import { Character, createCharacter } from "../characterModel.js";
import { paintCharacterHpBar } from "../characterPaint.js";
import { getPathingCache, PathingCache } from "../pathing.js";

export type BossEnemyCharacter = Character;
export const CHARACTER_TYPE_BOSS_ENEMY = "BossEnemyCharacter";

export function createBossWithLevel(idCounter: IdCounter, level: number, game: Game): BossEnemyCharacter {
    let bossSize = 60;
    let color = "black";
    let moveSpeed = Math.min(6, 1.5 + level * 0.5);
    let hp = 1000 * Math.pow(level, 4);
    let damage = 1 + level;
    let experienceWorth = Math.pow(level, 2) * 100;
    let spawn: Position = getBossSpawnPosition(game);

    let bossCharacter = createCharacter(getNextId(idCounter), spawn.x, spawn.y, bossSize, bossSize, color, moveSpeed, hp, damage, "enemy", CHARACTER_TYPE_BOSS_ENEMY, experienceWorth);
    let abilities: Ability[] = createBossAbilities(level, game);
    bossCharacter.abilities = abilities;
    return bossCharacter;
}

export function tickBossCharacters(bossStuff: BossStuff, game: Game) {
    let pathingCache = getPathingCache(game);
    let bosses = bossStuff.bosses;
    for (let i = bosses.length - 1; i >= 0; i--) {
        if (bosses[i].type === CHARACTER_TYPE_BOSS_ENEMY) {
            tickBossEnemyCharacter(bosses[i], game, pathingCache);
        }
    }
}

export function tickBossEnemyCharacter(enemy: BossEnemyCharacter, game: Game, pathingCache: PathingCache) {
    if (enemy.isDead) return;
    let playerCharacters = getPlayerCharacters(game.state.players);
    let closest = determineClosestCharacter(enemy, playerCharacters);
    if(closest.minDistance > 1200){
        teleportBossToNearestPlayer(enemy, game);
        closest = determineClosestCharacter(enemy, playerCharacters);
    }
    determineEnemyMoveDirection(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time);
    moveCharacterTick(enemy, game.state.map, game.state.idCounter, false);

    for (let ability of enemy.abilities) {
        ABILITIES_FUNCTIONS[ability.name].tickAbility(enemy, ability, game);
    }
    tickCharacterDebuffs(enemy, game);
}

export function paintBossCharacters(ctx: CanvasRenderingContext2D, cameraPosition: Position, game: Game) {
    for (let character of game.state.bossStuff.bosses) {
        paintBossEnemyCharacter(ctx, character, cameraPosition, game);
    }
}

export function checkForBossSpawn(game: Game) {
    let bossStuff = game.state.bossStuff;
    let highestLevel = getHighestLevelOfPlayers(game.state.players);
    let nextBossSpawnOnLevel = bossStuff.bossEachXLevels * bossStuff.bossLevelCounter;
    if (highestLevel >= nextBossSpawnOnLevel) {
        bossStuff.bosses.push(createBossWithLevel(game.state.idCounter, bossStuff.bossLevelCounter, game));
        bossStuff.bossLevelCounter++;
    }
}

function teleportBossToNearestPlayer(enemy: BossEnemyCharacter, game: Game){
    let newPosition = getBossSpawnPosition(game);
    enemy.x = newPosition.x;
    enemy.y = newPosition.y;
}

function createBossAbilities(level: number, game: Game): Ability[]{
    let abilities: Ability[] = [];
    const abilityKeys = Object.keys(ABILITIES_FUNCTIONS);
    let possibleAbilityKeys: String[] = [];
    for (let key of abilityKeys) {
        if (ABILITIES_FUNCTIONS[key].canBeUsedByBosses) {
            possibleAbilityKeys.push(key);
        }
    }

    if (possibleAbilityKeys.length > 0) {
        let randomAbilityChoice = 0;
        if (possibleAbilityKeys.length > 1) {
            randomAbilityChoice = Math.floor(nextRandom(game.state.randomSeed) * possibleAbilityKeys.length);
        }
        let key: any = possibleAbilityKeys[randomAbilityChoice];
        let abilityFunctions = ABILITIES_FUNCTIONS[key];
        let ability = abilityFunctions.createAbility(game.state.idCounter);
        setAbilityToBossLevel(ability, level);
        if(!abilityFunctions.isPassive) ability.passive = true;
        abilities.push(ability);
    }

    let abilityMelee = createAbilityMelee(game.state.idCounter);
    setAbilityToBossLevel(abilityMelee, level);
    abilities.push(abilityMelee);

    return abilities;
}

function setAbilityToBossLevel(ability: Ability, level: number){
    let abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
    if(abilityFunctions.setAbilityToBossLevel){
        abilityFunctions.setAbilityToBossLevel(ability, level);
    }else{
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
    let characterImageId = "slime";
    let characterImage = GAME_IMAGES[characterImageId];
    if (characterImage) {
        if (characterImage.imagePath !== undefined) {
            loadImage(characterImage, character.color, character.randomizedCharacterImage);
            if (characterImage.properties?.canvas) {
                let centerX = ctx.canvas.width / 2;
                let centerY = ctx.canvas.height / 2;
                let paintX = character.x - cameraPosition.x + centerX;
                let paintY = character.y - cameraPosition.y + centerY;

                let spriteAnimation = Math.floor(performance.now() / 250) % 2;
                let spriteColor = characterImage.properties.colorToSprite!.indexOf(character.color);
                let spriteWidth = characterImage.spriteRowWidths[0];
                let spriteHeight = characterImage.spriteRowHeights[0];
                let characterX = Math.floor(paintX - character.width / 2);
                let characterY = Math.floor(paintY - character.height / 2);
                ctx.drawImage(
                    characterImage.properties.canvas!,
                    0 + spriteAnimation * (spriteWidth + 1),
                    0 + spriteColor * (spriteHeight + 1),
                    spriteWidth, spriteHeight,
                    characterX,
                    characterY,
                    character.width, character.height
                );
                paintCharacterHpBar(ctx, character, { x: characterX, y: characterY });
            }
        }
    }
    for (let ability of character.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions.paintAbility !== undefined) {
            abilityFunctions.paintAbility(ctx, character, ability, cameraPosition, game);
        }
    }
}
