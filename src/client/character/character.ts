import { levelingCharacterXpGain } from "./levelingCharacter.js";
import { GameMap, isPositionBlocking } from "../map/map.js";
import { Character, CHARACTER_TYPES_STUFF, COLOR_CONVERSION, EnemyImage, ENEMY_FACTION, ENEMY_IMAGES } from "./characterModel.js";
import { createPathingCache, getNextWaypoint, PathingCache } from "./pathing.js";
import { UpgradeOption } from "./levelingCharacterModel.js";
import { calculateDirection, calculateDistance } from "../game.js";
import { Position, Game, GameState, IdCounter } from "../gameModel.js";
import { Player } from "../player.js";

export function paintCharacters(ctx: CanvasRenderingContext2D, characters: Character[], cameraPosition: Position) {
    for (let i = 0; i < characters.length; i++) {
        paintCharacter(ctx, characters[i], cameraPosition);
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

export function tickMapCharacters(map: GameMap, game: Game) {
    let pathingCache = createPathingCache();
    let allCharacters: Character[] = [];
    for (let i = 0; i < map.activeChunkKeys.length; i++) {
        let chunk = map.chunks[map.activeChunkKeys[i]];
        allCharacters.push(...chunk.characters);
    }
    tickCharacters(allCharacters, game, pathingCache);
}

export function tickCharacters(characters: Character[], game: Game, pathingCache: PathingCache | null = null) {
    for (let j = characters.length - 1; j >= 0; j--) {
        CHARACTER_TYPES_STUFF[characters[j].type].tickFunction(characters[j], game, pathingCache);
    }
}

export function getPlayerCharacters(players: Player[]) {
    let playerCharacters = [];
    for (let i = 0; i < players.length; i++) {
        playerCharacters.push(players[i].character);
    }
    return playerCharacters;
}

export function determineClosestCharacter(character: Character, characters: Character[]) {
    let minDistance: number = 0;
    let minDistanceCharacter: Character | null = null;

    for (let i = 0; i < characters.length; i++) {
        if (characters[i].isDead) continue;
        let distance = calculateDistance(character, characters[i]);
        if (minDistanceCharacter === null || minDistance > distance) {
            minDistance = distance;
            minDistanceCharacter = characters[i];
        }
    }
    return { minDistanceCharacter, minDistance };
}

export function determineCharactersInDistance(position: Position, map: GameMap, maxDistance: number): Character[] {
    let result: Character[] = [];
    let mapKeysInDistance = determineMapKeysInDistance(position, map, maxDistance);

    for (let i = 0; i < mapKeysInDistance.length; i++) {
        let chunk = map.chunks[mapKeysInDistance[i]];
        if (chunk === undefined) continue;
        let characters: Character[] = chunk.characters;
        for (let j = 0; j < characters.length; j++) {
            let distance = calculateDistance(position, characters[j]);
            if (maxDistance >= distance) {
                result.push(characters[j]);
            }
        }
    }
    return result;
}

export function determineMapKeysInDistance(position: Position, map: GameMap, maxDistance: number, addNotCreatedChunkKeys: boolean = true): string[] {
    let chunkSize = map.tileSize * map.chunkLength;
    let maxChunks = Math.ceil(maxDistance / chunkSize);
    let result: string[] = [];
    for (let i = - maxChunks; i <= maxChunks; i++) {
        for (let j = - maxChunks; j <= maxChunks; j++) {
            let chunkI = Math.floor(position.y / chunkSize) + i;
            let chunkJ = Math.floor(position.x / chunkSize) + j;
            if (!addNotCreatedChunkKeys && map.chunks[`${chunkI}_${chunkJ}`] === undefined) continue;
            let distance = calculateDistanceToMapChunk(chunkI, chunkJ, position, map);
            if (distance <= maxDistance) {
                result.push(`${chunkI}_${chunkJ}`);
            }
        }
    }
    return result;
}

export function countCharacters(map: GameMap): number{
    let counter = 0;
    let chunkKeys = Object.keys(map.chunks);

    for(const key of chunkKeys){
        counter += map.chunks[key].characters.length;
    }
    
    return counter;
}

function calculateDistanceToMapChunk(chunkI: number, chunkJ: number, position: Position, map: GameMap): number {
    let chunkSize = map.tileSize * map.chunkLength;
    let topChunk = chunkI * chunkSize;
    let leftChunk = chunkJ * chunkSize;
    if (leftChunk <= position.x && leftChunk + chunkSize > position.x) {
        if (topChunk + chunkSize > position.y) {
            if (topChunk <= position.y) {
                return 0;
            } else {
                return topChunk - position.y;
            }
        } else {
            return position.y - topChunk + chunkSize;
        }
    } else if (topChunk <= position.y && topChunk + chunkSize > position.y) {
        if (leftChunk + chunkSize > position.x) {
            if (leftChunk <= position.x) {
                return 0;
            } else {
                return leftChunk - position.x;
            }
        } else {
            return position.x - leftChunk + chunkSize;
        }
    } else {
        if (topChunk > position.y && leftChunk > position.x) {
            return calculateDistance(position, { x: leftChunk, y: topChunk });
        } else if (topChunk + chunkSize <= position.y && leftChunk > position.x) {
            return calculateDistance(position, { x: leftChunk, y: topChunk + chunkSize });
        } else if (topChunk > position.y && leftChunk + chunkSize <= position.x) {
            return calculateDistance(position, { x: leftChunk + chunkSize, y: topChunk });
        } else {
            return calculateDistance(position, { x: leftChunk + chunkSize, y: topChunk + chunkSize });
        }
    }
}

export function detectCharacterDeath(map: GameMap, state: GameState, upgradeOptions: Map<string, UpgradeOption>) {
    for (let i = 0; i < map.activeChunkKeys.length; i++) {
        let chunk = map.chunks[map.activeChunkKeys[i]];
        for (let charIt = chunk.characters.length - 1; charIt >= 0; charIt--) {
            if (chunk.characters[charIt].hp <= 0 && !chunk.characters[charIt].isDead) {
                if (chunk.characters[charIt].faction === ENEMY_FACTION) {
                    levelingCharacterXpGain(state, chunk.characters[charIt], upgradeOptions);
                    state.killCounter++;
                }
                chunk.characters[charIt].isDead = true;
            }
        }
    }
    for (let i = 0; i < state.players.length; i++) {
        let char = state.players[i].character;
        if (char.hp <= 0 && !char.isDead) {
            char.isDead = true;
        }
    }
}

export function countAlivePlayerCharacters(players: Player[]) {
    let counter = 0;
    for (let i = players.length - 1; i >= 0; i--) {
        if (!players[i].character.isDead) counter++;
    }
    return counter;
}

export function determineEnemyHitsPlayer(enemy: Character, closestPlayer: Character | null) {
    if (closestPlayer === null) return;

    let distance = calculateDistance(enemy, closestPlayer);
    if (distance <= enemy.size / 2 + closestPlayer.size / 2) {
        closestPlayer.hp -= enemy.damage;
    }
}

export function determineEnemyMoveDirection(enemy: Character, closestPlayerPosition: Position | null, map: GameMap, pathingCache: PathingCache, idCounter: IdCounter) {
    if (closestPlayerPosition === null) {
        enemy.isMoving = false;
        return;
    }
    enemy.isMoving = true;
    let nextWayPoint: Position | null = getNextWaypoint(enemy, closestPlayerPosition, map, pathingCache, idCounter);
    if (nextWayPoint === null) {
        enemy.isMoving = false;
        return;
    }
    enemy.moveDirection = calculateDirection(enemy, nextWayPoint);
}

export function moveCharacterTick(character: Character, map: GameMap, idCounter: IdCounter, isPlayer: boolean) {
    if (character.isMoving) {
        let x = character.x + Math.cos(character.moveDirection) * character.moveSpeed;
        let y = character.y + Math.sin(character.moveDirection) * character.moveSpeed;
        let blocking = isPositionBlocking({ x, y }, map, idCounter);
        if (!blocking) {
            if (!isPlayer) {
                let currentChunkI = Math.floor(character.y / (map.tileSize * map.chunkLength));
                let newChunkI = Math.floor(y / (map.tileSize * map.chunkLength));
                let currentChunkJ = Math.floor(character.x / (map.tileSize * map.chunkLength));
                let newChunkJ = Math.floor(x / (map.tileSize * map.chunkLength));
                if (currentChunkI !== newChunkI || currentChunkJ !== newChunkJ) {
                    let currentChunkKey = `${currentChunkI}_${currentChunkJ}`;
                    let newChunkKey = `${newChunkI}_${newChunkJ}`;
                    map.chunks[currentChunkKey].characters = map.chunks[currentChunkKey].characters.filter(el => el !== character);
                    map.chunks[newChunkKey].characters.push(character);
                }
            }

            character.x = x;
            character.y = y;
        }
    }
}

function paintCharacter(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position) {
    if (character.isDead) return;
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let paintX = character.x - cameraPosition.x + centerX - character.size / 2;
    let paintY = character.y - cameraPosition.y + centerY - character.size / 2;
    if (paintX < -character.size || paintX > ctx.canvas.width
        || paintY < -character.size || paintY > ctx.canvas.height) return;

    let  characterImageId = "slime";
    if(character.type === "levelingCharacter") characterImageId = "player";
    if (ENEMY_IMAGES[characterImageId]) {
        if (ENEMY_IMAGES[characterImageId].imagePath !== undefined) {
            loadImage(ENEMY_IMAGES[characterImageId], character.color);
            if (ENEMY_IMAGES[characterImageId].canvas) {
                let spriteAnimation = Math.floor(performance.now()/250)%2;
                let spriteColor = ENEMY_IMAGES[characterImageId].colorToSprite!.indexOf(character.color);
                let spriteSize = ENEMY_IMAGES[characterImageId].spriteSize;
                ctx.drawImage(ENEMY_IMAGES[characterImageId].canvas!, 0 + spriteAnimation * spriteSize, 0 + spriteColor * spriteSize + 1, spriteSize, spriteSize, paintX, paintY, character.size, character.size);
            }
        } else {
            console.log("missing image path for enemy", characterImageId);
        }
    } else{
        ctx.fillStyle = character.color;
        ctx.beginPath();
        ctx.arc(
            paintX,
            paintY,
            character.size, 0, 2 * Math.PI);
        ctx.fill();
    }       
}

function loadImage(enemyImage: EnemyImage, color: string){
    if (enemyImage.canvas === undefined) {
        if (enemyImage.imageRef === undefined) {
            let image = new Image();
            image.src = enemyImage.imagePath!;
            enemyImage.imageRef = image;
        }
        if (enemyImage.imageRef!.complete) {
            let canvas = document.createElement('canvas');
            canvas.width = enemyImage.imageRef!.width;
            canvas.height = enemyImage.imageRef!.height * Object.keys(COLOR_CONVERSION).length;
            let imageCtx: CanvasRenderingContext2D = canvas.getContext("2d")!;
            imageCtx.drawImage(enemyImage.imageRef!, 0, 0);
            enemyImage.canvas = canvas;
            enemyImage.colorToSprite = [enemyImage.baseColor];
        }
    }
    if (enemyImage.canvas && enemyImage.colorToSprite?.indexOf(color) === -1) {
        if(color !== enemyImage.baseColor){
            let paintY = enemyImage.imageRef!.height * enemyImage.colorToSprite.length;
            enemyImage.colorToSprite.push(color);
            let imageCtx: CanvasRenderingContext2D = enemyImage.canvas.getContext("2d")!;
            imageCtx.drawImage(enemyImage.imageRef!, 0, paintY);
            let imageData = imageCtx.getImageData(0, paintY, enemyImage.canvas.width, enemyImage.imageRef!.height);
            let data = imageData.data;
            let newColorRGB = COLOR_CONVERSION[color];
            let toChangeColor = COLOR_CONVERSION[enemyImage.baseColor];
            for(let pixelStart = 0; pixelStart < data.length; pixelStart += 4){
                if(data[pixelStart] === toChangeColor.r
                    && data[pixelStart+1] === toChangeColor.g
                    && data[pixelStart+2] === toChangeColor.b
                ){
                    data[pixelStart] = newColorRGB.r;
                    data[pixelStart+1] = newColorRGB.g;
                    data[pixelStart+2] = newColorRGB.b;
                }else if(data[pixelStart] === newColorRGB.r
                    && data[pixelStart+1] === newColorRGB.g
                    && data[pixelStart+2] === newColorRGB.b
                ){
                    data[pixelStart] = 255;
                    data[pixelStart+1] = 255;
                    data[pixelStart+2] = 255;
                }
            }
            imageCtx.putImageData(imageData, 0, paintY);
        }
    }
}