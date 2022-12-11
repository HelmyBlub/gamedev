import { calculateDistance, Game, GameState, getCameraPosition, getNextId, Position } from "./game.js";
import { createLevelingCharacter, LevelingCharacter, levelingCharacterXpGain, UpgradeOption } from "./levelingCharacter.js";
import { createProjectile, Projectile } from "./projectile.js";
import { nextRandom } from "./randomNumberGenerator.js";

export const PLAYER_FACTION = "player";
export const ENEMY_FACTION = "enemy";
export type Character = Position & {
    id: number,
    size: number,
    color: string,
    moveSpeed: number,
    moveDirection: number,
    isMoving: boolean,
    hp: number,
    maxHp: number,
    damage: number,
    faction: string,
    experienceWorth: number,
}

function paintCharacter(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position) {
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    ctx.fillStyle = character.color;
    ctx.beginPath();
    ctx.arc(
        character.x - cameraPosition.x + centerX,
        character.y - cameraPosition.y + centerY,
        character.size, 0, 2 * Math.PI);
    ctx.fill();
}

export function paintCharacters(ctx: CanvasRenderingContext2D, characters: Character[], cameraPosition: Position) {
    for (let i = 0; i < characters.length; i++) {
        paintCharacter(ctx, characters[i], cameraPosition);
    }
}

function shoot(character: LevelingCharacter, projectiles: Projectile[], gameTime: number, game: Game) {
    for (let i = 0; i <= character.shooting.multiShot; i++) {
        let shotSpread: number = (nextRandom(game.state) - 0.5) / 10 * character.shooting.multiShot;
        projectiles.push(createProjectile(
            character.x,
            character.y,
            character.moveDirection + shotSpread,
            character.damage,
            character.faction,
            character.moveSpeed + 2,
            gameTime,
            character.shooting.pierceCount,
            character.shooting.timeToLive
        ));
    }
}

export function findCharacterById(characters: Character[], id: number): Character | null {
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].id === id) {
            return characters[i];
        }
    }
    return null;
}

export function tickCharacters(characters: Character[], projectiles: Projectile[], gameTime: number, game: Game) {
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].faction === PLAYER_FACTION) {
            tickPlayerCharacter(characters[i] as LevelingCharacter, projectiles, gameTime, game);
        } else if (characters[i].faction === ENEMY_FACTION) {
            tickEnemyCharacter(characters[i], getPlayerCharacters(characters));
        }
        moveCharacterTick(characters[i]);
    }
}

export function getPlayerCharacters(characters: Character[]) {
    let playerCharacters = [];
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].faction === PLAYER_FACTION) {
            playerCharacters.push(characters[i]);
        }
    }
    return playerCharacters;
}

function tickPlayerCharacter(character: LevelingCharacter, projectiles: Projectile[], gameTime: number, game: Game) {
    while (character.shooting.nextShotTime <= gameTime) {
        shoot(character, projectiles, gameTime, game);
        character.shooting.nextShotTime += character.shooting.frequency;
    }
}

function tickEnemyCharacter(character: Character, playerCharacters: Character[]) {
    let closestPlayer = determineClosestPlayer(character, playerCharacters)
    determineEnemyMoveDirection(character, closestPlayer);
    determineEnemyHitsPlayer(character, closestPlayer);
}

function determineEnemyHitsPlayer(character: Character, closestPlayer: Character | null) {
    if (closestPlayer === null) return;

    let distance = calculateDistance(character, closestPlayer);
    if (distance <= character.size + closestPlayer.size) {
        closestPlayer.hp -= character.damage;
    }
}

function determineClosestPlayer(character: Character, playerCharacters: Character[]) {
    let minDistance: number = 0;
    let minDistancePlayerCharacter: Character | null = null;

    for (let i = 0; i < playerCharacters.length; i++) {
        let distance = calculateDistance(character, playerCharacters[i]);
        if (minDistancePlayerCharacter === null || minDistance > distance) {
            minDistance = distance;
            minDistancePlayerCharacter = playerCharacters[i];
        }
    }
    return minDistancePlayerCharacter;
}

function determineEnemyMoveDirection(character: Character, closestPlayer: Character | null) {
    if (closestPlayer === null) {
        character.isMoving = false;
        return;
    }
    character.isMoving = true;

    let yDiff = (character.y - closestPlayer.y);
    let xDiff = (character.x - closestPlayer.x);

    if (xDiff >= 0) {
        character.moveDirection = - Math.PI + Math.atan(yDiff / xDiff);
    } else if (yDiff <= 0) {
        character.moveDirection = - Math.atan(xDiff / yDiff) + Math.PI / 2;
    } else {
        character.moveDirection = - Math.atan(xDiff / yDiff) - Math.PI / 2;
    }
}

function moveCharacterTick(character: Character) {
    if (character.isMoving) {
        character.x += Math.cos(character.moveDirection) * character.moveSpeed;
        character.y += Math.sin(character.moveDirection) * character.moveSpeed;
    }
}

export function createRandomEnemy(game: Game) {
    if (game.state.characters.length > 100) return;

    let x, y;
    let hp = Math.ceil(game.state.time / 1000);
    let spawnDistance = 150;
    let playerCharacter = getPlayerCharacters(game.state.characters);

    for (let i = 0; i < playerCharacter.length; i++) {
        let center: Position = playerCharacter[i];

        if (nextRandom(game.state) < 0.5) {
            x = center.x + (Math.round(nextRandom(game.state)) * 2 - 1) * spawnDistance;
            y = center.y + (nextRandom(game.state) - 0.5) * spawnDistance * 2;
        } else {
            x = center.x + (nextRandom(game.state) - 0.5) * spawnDistance * 2;
            y = center.y + (Math.round(nextRandom(game.state)) * 2 - 1) * spawnDistance;
        }
        game.state.characters.push(createEnemy(game, x, y, hp));
    }
}

function createEnemy(game: Game, x: number, y: number, hp: number): Character {
    return createCharacter(game, x, y, 5, "black", 0.1, hp, 1, ENEMY_FACTION, true);
}

export function createPlayerCharacter(game: Game, x: number, y: number): Character {
    return createLevelingCharacter(game, x, y, 10, "blue", 2, 200, 10, PLAYER_FACTION);
}

function createCharacter(
    game: Game,
    x: number,
    y: number,
    size: number,
    color: string,
    moveSpeed: number,
    hp: number,
    damage: number,
    faction: string,
    isMoving: boolean = false,
): Character {
    return {
        id: getNextId(game.state),
        x: x,
        y: y,
        size: size,
        color: color,
        moveSpeed: moveSpeed,
        moveDirection: 0,
        isMoving: isMoving,
        hp: hp,
        maxHp: hp,
        damage: damage,
        faction: faction,
        experienceWorth: 1,
    };
}

export function detectCharacterDeath(characters: Character[], state: GameState, upgradeOptions: Map<string, UpgradeOption>) {
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        if (characters[charIt].hp <= 0) {
            if (characters[charIt].faction === ENEMY_FACTION) {
                levelingCharacterXpGain(state, characters[charIt], upgradeOptions);
                state.killCounter++;
            }
            characters.splice(charIt, 1);
        }
    }
}

export function countAlivePlayers(characters: Character[]) {
    let counter = 0;
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        if (characters[charIt].faction === PLAYER_FACTION) counter++;
    }
    return counter;
}
