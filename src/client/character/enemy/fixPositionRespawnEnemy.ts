import { calculateDistance, getCameraPosition, getNextId } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { isPositionBlocking } from "../../map/map.js";
import { determineClosestCharacter, determineEnemyHitsPlayer, determineEnemyMoveDirection, findCharacterById, getPlayerCharacters } from "../character.js";
import { Character } from "../characterModel.js";
import { PathingCache } from "../pathing.js";

export type FixPositionRespawnEnemyCharacter = Character & {
    aggroRange: number,
    spawnPosition: Position,
    nextTickTime?: number,
}


export function createFixPositionRespawnEnemy(game: Game) {
    if (game.state.characters.length > 1000) return;
    let map = game.state.map;
    let chunkSize = map.tileSize * map.chunkLength;
    let minSpawnDistanceFromPlayer = 200;
    let maxSpawnDistanceFromPlayer = 10000;

    
    let character: Position = findCharacterById(game.state.characters, game.state.players[0].characterIdRef)!;
    let mapKeys = Object.keys(map.chunks);
    for (let mapIndex = 0; mapIndex < mapKeys.length; mapIndex++) {
        let key = mapKeys[mapIndex];
        let topLeftMapKeyPos: Position = {
            x: Number.parseInt(key.split('_')[0]) * chunkSize,
            y: Number.parseInt(key.split('_')[1]) * chunkSize
        }
        let centerMapKeyPos: Position = {
            x: topLeftMapKeyPos.x + chunkSize / 2,
            y: topLeftMapKeyPos.y + chunkSize / 2
        }
        let distance = calculateDistance(character, centerMapKeyPos);
        if (minSpawnDistanceFromPlayer < distance && distance < maxSpawnDistanceFromPlayer) {
            let chunk = map.chunks[key];
            for (let i = 0; i < chunk.length; i++) {
                for (let j = 0; j < chunk[i].length; j++) {
                    let pos: Position = {
                        x: topLeftMapKeyPos.x + j * map.tileSize + map.tileSize / 2,
                        y: topLeftMapKeyPos.y + i * map.tileSize + map.tileSize / 2
                    }
                    distance = calculateDistance(character, pos);
                    if (minSpawnDistanceFromPlayer < distance && distance < maxSpawnDistanceFromPlayer) {
                        if (!isPositionBlocking(pos, map)) {
                            let hp = 1;
                            let moveSpeed = 1;
                            let size = 5;
                            let damage = 1;
                            game.state.characters.push(createEnemy(game, pos.x, pos.y, size, moveSpeed, hp,damage, game.state.time));
                        }
                    }
                }
            }
        }
    }
}

export function tickFixPositionRespawnEnemyCharacter(enemy: FixPositionRespawnEnemyCharacter, game: Game, pathingCache: PathingCache) {
    if(!enemy.nextTickTime || game.state.time >= enemy.nextTickTime){
        let playerCharacters = getPlayerCharacters(game.state.characters);
        let closest = determineClosestCharacter(enemy, playerCharacters);
        if(closest.minDistance <= enemy.aggroRange){
            determineEnemyMoveDirection(enemy, closest.minDistanceCharacter, game.state.map, pathingCache);
        } else {
            enemy.isMoving = false;
            enemy.nextTickTime = game.state.time + closest.minDistance;
        }
        determineEnemyHitsPlayer(enemy, closest.minDistanceCharacter);
    }
}

function createEnemy(
    game: Game,
    x: number,
    y: number,
    size: number,
    moveSpeed: number,
    hp: number,
    damage: number,
    spawnTime: number
): FixPositionRespawnEnemyCharacter {
    return {
        id: getNextId(game.state),
        x: x,
        y: y,
        size: size,
        color: "black",
        moveSpeed: moveSpeed,
        moveDirection: 0,
        isMoving: false,
        hp: hp,
        maxHp: hp,
        damage: damage,
        faction: "enemy",
        experienceWorth: 1,
        type: "fixPositionRespawnEnemy",
        spawnTime: spawnTime,
        aggroRange: 100,
        spawnPosition: { x, y },
    };
}