import { calculateDistance, Game, GameState, getCameraPosition, getNextId, Position } from "./game.js";
import { createLevelingCharacter, LevelingCharacter, levelingCharacterXpGain, UpgradeOption } from "./levelingCharacter.js";
import { findNearNonBlockingPosition, GameMap, isPositionBlocking } from "./map.js";
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
            tickEnemyCharacter(characters[i], getPlayerCharacters(characters), game.state.map);
        }
        moveCharacterTick(characters[i], game.state.map);
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

function tickEnemyCharacter(character: Character, playerCharacters: Character[], map: GameMap) {
    let closestPlayer = determineClosestCharacter(character, playerCharacters).minDistanceCharacter;
    determineEnemyMoveDirection(character, closestPlayer, map);
    determineEnemyHitsPlayer(character, closestPlayer);
}

function determineEnemyHitsPlayer(character: Character, closestPlayer: Character | null) {
    if (closestPlayer === null) return;

    let distance = calculateDistance(character, closestPlayer);
    if (distance <= character.size + closestPlayer.size) {
        closestPlayer.hp -= character.damage;
    }
}

export function determineClosestCharacter(character: Character, characters: Character[]) {
    let minDistance: number = 0;
    let minDistanceCharacter: Character | null = null;

    for (let i = 0; i < characters.length; i++) {
        let distance = calculateDistance(character, characters[i]);
        if (minDistanceCharacter === null || minDistance > distance) {
            minDistance = distance;
            minDistanceCharacter = characters[i];
        }
    }
    return { minDistanceCharacter, minDistance };
}

function determineEnemyMoveDirection(character: Character, closestPlayer: Character | null, map: GameMap) {
    if (closestPlayer === null) {
        character.isMoving = false;
        return;
    }
    character.isMoving = true;
    let nextWayPoint: Position | null = getNextWaypoint(character, closestPlayer, map);
    if (nextWayPoint === null) {
        character.isMoving = false;
        return;
    }
    character.moveDirection = calculateDirection(character, nextWayPoint);
}

function getNextWaypoint(characterPos: Position, targetPos: Position, map: GameMap): Position | null {
    let openNodes: Position[] = [];
    let targetIJ: Position = calculatePosToTileIJ(targetPos, map);
    let startIJ: Position = calculatePosToTileIJ(characterPos, map);
    let cameFrom: Map<string, Position> = new Map<string, Position>();
    let gScore: Map<string, number> = new Map<string, number>();
    gScore.set(`${startIJ.x}_${startIJ.y}`, 0);
    let fScore: Map<string, number> = new Map<string, number>();
    fScore.set(`${startIJ.x}_${startIJ.y}`, calculateDistance(startIJ, targetIJ));

    openNodes.push(startIJ);

    while (openNodes.length > 0) {
        let currentLowestValue = -1;
        let currentIndex = -1;       
        for(let i = 0; i < openNodes.length; i++){
            let currKey = `${openNodes[i].x}_${openNodes[i].y}`;
            if(currentIndex === -1 || fScore.get(currKey)! < currentLowestValue){
                currentLowestValue = fScore.get(currKey)!;
                currentIndex = i;
            }
        }
        let currentNode = openNodes.splice(currentIndex, 1)[0]!;

        if (currentNode.x === targetIJ.x && currentNode.y === targetIJ.y) {
            let lastPosition = reconstruct_path(cameFrom, currentNode);
            if (lastPosition.x === targetIJ.x && lastPosition.y === targetIJ.y) {
                return targetPos;
            } else {
                return { x: lastPosition.x * map.tileSize + map.tileSize/2, y: lastPosition.y * map.tileSize + map.tileSize/2 };
            }
        }

        let neighborsIJ = getPathNeighborsIJ(currentNode, map);
        for (let i = 0; i < neighborsIJ.length; i++) {
            let currentNodKey: string = `${currentNode.x}_${currentNode.y}`;
            let neighborKey = `${neighborsIJ[i].x}_${neighborsIJ[i].y}`;
            let tentativeScore = gScore.get(currentNodKey)! + calculateDistance(neighborsIJ[i], currentNode);

            if (!gScore.has(neighborKey) || tentativeScore < gScore.get(neighborKey)!){
                cameFrom.set(neighborKey, currentNode);
                gScore.set(neighborKey, tentativeScore);
                fScore.set(neighborKey, tentativeScore + calculateDistance(neighborsIJ[i], targetIJ));
                if(!openNodes.find((curr: Position) => curr.x === neighborsIJ[i].x && curr.y === neighborsIJ[i].y)){
                   openNodes.push(neighborsIJ[i]); 
                }
            }
        }
    }

    return null;
}

function getPathNeighborsIJ(posIJ: Position, map: GameMap): Position[] {
    let result: Position[] = [];

    let tempIJ = { x: posIJ.x, y: posIJ.y - 1 };
    if (!isPositionBlocking({ x: tempIJ.x * map.tileSize, y: tempIJ.y * map.tileSize }, map)) {
        result.push(tempIJ);
    }
    tempIJ = { x: posIJ.x, y: posIJ.y + 1 };
    if (!isPositionBlocking({ x: tempIJ.x * map.tileSize, y: tempIJ.y * map.tileSize }, map)) {
        result.push(tempIJ);
    }
    tempIJ = { x: posIJ.x - 1, y: posIJ.y };
    if (!isPositionBlocking({ x: tempIJ.x * map.tileSize, y: tempIJ.y * map.tileSize }, map)) {
        result.push(tempIJ);
    }
    tempIJ = { x: posIJ.x + 1, y: posIJ.y };
    if (!isPositionBlocking({ x: tempIJ.x * map.tileSize, y: tempIJ.y * map.tileSize }, map)) {
        result.push(tempIJ);
    }

    return result;
}

function reconstruct_path(cameFrom: Map<string, Position>, current: Position) {
    let second: Position = current;
    let last: Position = current;
    while (cameFrom.has(`${last.x}_${last.y}`)) {
        second = last;
        last = cameFrom.get(`${last.x}_${last.y}`)!;
    }
    return second
}

function calculatePosToTileIJ(pos: Position, map: GameMap): Position {
    let chunkSize = map.tileSize * map.chunkLength;
    let startChunkI = Math.floor(pos.y / chunkSize);
    let startChunkJ = Math.floor(pos.x / chunkSize);
    let tileI = Math.floor((pos.y / map.tileSize) % map.chunkLength);
    if (tileI < 0) tileI += map.chunkLength;
    let tileJ = Math.floor((pos.x / map.tileSize) % map.chunkLength);
    if (tileJ < 0) tileJ += map.chunkLength;

    return {
        x: startChunkJ * map.chunkLength + tileJ,
        y: startChunkI * map.chunkLength + tileI,
    };
}

export function calculateDirection(startPos: Position, targetPos: Position): number {
    let direction = 0;

    let yDiff = (startPos.y - targetPos.y);
    let xDiff = (startPos.x - targetPos.x);

    if (xDiff >= 0) {
        direction = - Math.PI + Math.atan(yDiff / xDiff);
    } else if (yDiff <= 0) {
        direction = - Math.atan(xDiff / yDiff) + Math.PI / 2;
    } else {
        direction = - Math.atan(xDiff / yDiff) - Math.PI / 2;
    }

    return direction;
}

function moveCharacterTick(character: Character, map: GameMap) {
    if (character.isMoving) {
        let x = character.x + Math.cos(character.moveDirection) * character.moveSpeed;
        let y = character.y + Math.sin(character.moveDirection) * character.moveSpeed;
        let blocking = isPositionBlocking({ x, y }, map);
        if (!blocking) {
            character.x = x;
            character.y = y;
        }
    }
}

export function createRandomEnemy(game: Game) {
    if (game.state.characters.length > 100) return;

    let pos: Position = { x: 0, y: 0 };
    let hp = Math.ceil(game.state.time / 1000);
    let spawnDistance = 150;
    let playerCharacter = getPlayerCharacters(game.state.characters);

    for (let i = 0; i < playerCharacter.length; i++) {
        let center: Position = playerCharacter[i];

        if (nextRandom(game.state) < 0.5) {
            pos.x = center.x + (Math.round(nextRandom(game.state)) * 2 - 1) * spawnDistance;
            pos.y = center.y + (nextRandom(game.state) - 0.5) * spawnDistance * 2;
        } else {
            pos.x = center.x + (nextRandom(game.state) - 0.5) * spawnDistance * 2;
            pos.y = center.y + (Math.round(nextRandom(game.state)) * 2 - 1) * spawnDistance;
        }
        if (!isPositionBlocking(pos, game.state.map)) {
            game.state.characters.push(createEnemy(game, pos.x, pos.y, hp));
        }
    }
}

function createEnemy(game: Game, x: number, y: number, hp: number): Character {
    return createCharacter(game, x, y, 5, "black", 0.5, hp, 1, ENEMY_FACTION, true);
}

export function createPlayerCharacter(game: Game, pos: Position): Character {
    return createLevelingCharacter(game, pos.x, pos.y, 10, "blue", 2, 200, 10, PLAYER_FACTION);
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
