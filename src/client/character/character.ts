import { levelingCharacterXpGain } from "./playerCharacters/levelingCharacter.js";
import { determineMapKeysInDistance, GameMap, getChunksTouchingLine, isPositionBlocking, MapChunk } from "../map/map.js";
import { Character, CHARACTER_TYPE_FUNCTIONS, ENEMY_FACTION, UpgradeOptionCharacter } from "./characterModel.js";
import { getNextWaypoint, getPathingCache, PathingCache } from "./pathing.js";
import { calculateDirection, calculateDistance, calculateDistancePointToLine, createPaintTextData, takeTimeMeasure } from "../game.js";
import { Position, Game, GameState, IdCounter, Camera, PaintTextData } from "../gameModel.js";
import { findPlayerById, Player } from "../player.js";
import { RandomSeed, nextRandom } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, abilityCharacterAddBossSkillPoint, UpgradeOptionAbility } from "../ability/ability.js";
import { LevelingCharacter } from "./playerCharacters/levelingCharacterModel.js";
import { BossEnemyCharacter, CHARACTER_TYPE_BOSS_ENEMY } from "./enemy/bossEnemy.js";
import { tickCharacterDebuffs } from "../debuff/debuff.js";
import { createAbilityLeash } from "../ability/abilityLeash.js";

export function findCharacterById(characters: Character[], id: number): Character | null {
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].id === id) {
            return characters[i];
        }
    }
    return null;
}

export function findCharacterByIdAroundPosition(position: Position, range: number, game: Game, id: number): Character | null {
    let characters = determineCharactersInDistance(position, game.state.map, game.state.players, game.state.bossStuff.bosses, range);
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].id === id) {
            return characters[i];
        }
    }
    return null;
}

export function characterTakeDamage(character: Character, damage: number, game: Game) {
    if (character.isDead) return;
    if (character.isPet) return;

    character.hp -= damage;
    if(character.hp <= 0) {
        character.isDead = true;
        levelingCharacterXpGain(game.state, character);
        if (character.type === CHARACTER_TYPE_BOSS_ENEMY) {
            abilityCharacterAddBossSkillPoint(game.state);
        }
        game.state.killCounter++;
    }
    if (game.UI.displayDamageNumbers) {
        let textPos = { x: character.x, y: character.y - character.height / 2 };
        let fontSize = character.faction === "player" ? "20" : "12";
        let textColor = character.faction === "player" ? "blue" : "black";
        game.UI.displayTextData.push(createPaintTextData(textPos, damage.toFixed(0), textColor, fontSize, game.state.time));
    }
    if (character.faction === "enemy") character.wasHitRecently = true;
}

export function fillRandomUpgradeOptions(character: Character, randomSeed: RandomSeed, boss: boolean = false) {
    if (character.upgradeOptions.length === 0) {
        let characterOptions: UpgradeOptionCharacter[] = [];
        let characterOptionProbability = 0;
        if(!boss){
            characterOptions = createCharacterUpgradeOptions();
            for (let characterOption of characterOptions) {
                characterOptionProbability += characterOption.probabilityFactor;
            }
        }
        let abilitiesOptions: { [key: string]: { options: UpgradeOptionAbility[], probability: number } } = {};
        for (let ability of character.abilities) {
            let options: UpgradeOptionAbility[] = [];
            if(boss){
                const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
                if(abilityFunctions.createAbiltiyBossUpgradeOptions && ability.bossSkillPoints !== undefined && ability.bossSkillPoints > 0){
                    options = abilityFunctions.createAbiltiyBossUpgradeOptions(ability);
                }
            }else{
                options = ABILITIES_FUNCTIONS[ability.name].createAbiltiyUpgradeOptions(ability);
            }
            if(options.length > 0){
                let abilityOptionProbability = 0;
                for (let abilityOption of options) {
                    abilityOptionProbability += abilityOption.probabilityFactor;
                }
                abilitiesOptions[ability.name] = { options, probability: abilityOptionProbability };
                if(boss) break;
            }
        }
        for (let i = 0; i < 3; i++) {
            const abilitiesOptionsKeys = Object.keys(abilitiesOptions);
            let totablPropability = characterOptionProbability;
            for (let key of abilitiesOptionsKeys) {
                totablPropability += abilitiesOptions[key].probability;
            }
            if(totablPropability === 0) return;
            let randomProbability = nextRandom(randomSeed) * (totablPropability);
            if (randomProbability < characterOptionProbability) {
                let characterOptionIndex = 0;
                for (characterOptionIndex = 0; characterOptionIndex < characterOptions.length; characterOptionIndex++) {
                    randomProbability -= characterOptions[characterOptionIndex].probabilityFactor;
                    if (randomProbability < 0) {
                        break;
                    };
                }
                if (randomProbability >= 0) throw new Error("getting random upgrade option with probabilities failed. Probability not fitting to character options");
                character.upgradeOptions.push({ name: characterOptions[characterOptionIndex].name, boss: boss });
                characterOptionProbability -= characterOptions[characterOptionIndex].probabilityFactor;
                characterOptions.splice(characterOptionIndex, 1);
            } else {
                randomProbability -= characterOptionProbability;
                let abilityName = "";
                for (let abilityKeyIndex = 0; abilityKeyIndex < abilitiesOptionsKeys.length; abilityKeyIndex++) {
                    if (randomProbability < abilitiesOptions[abilitiesOptionsKeys[abilityKeyIndex]].probability) {
                        abilityName = abilitiesOptionsKeys[abilityKeyIndex];
                        break;
                    };
                    randomProbability -= abilitiesOptions[abilitiesOptionsKeys[abilityKeyIndex]].probability;
                }
                let abilityOptions = abilitiesOptions[abilityName];

                for (let abilityOptionIndex = 0; abilityOptionIndex < abilityOptions.options.length; abilityOptionIndex++) {
                    randomProbability -= abilityOptions.options[abilityOptionIndex].probabilityFactor;
                    if (randomProbability < 0) {
                        character.upgradeOptions.push({ name: abilityOptions.options[abilityOptionIndex].name, abilityName: abilityName, boss: boss });
                        abilityOptions.probability -= abilityOptions.options[abilityOptionIndex].probabilityFactor;
                        abilityOptions.options.splice(abilityOptionIndex, 1);
                        if (abilityOptions.options.length === 0) {
                            delete abilitiesOptions[abilityName];
                        }
                        break;
                    }
                }
            }
            if (randomProbability >= 0) throw new Error("getting random upgrade option with probabilities failed. Random value to high?");
        }
    }
}

export function createCharacterUpgradeOptions(): UpgradeOptionCharacter[] {
    let upgradeOptions: UpgradeOptionCharacter[] = [];
    upgradeOptions.push({
        name: "Max Health+50", probabilityFactor: 1, upgrade: (c: Character) => {
            c.hp += 50;
            c.maxHp += 50;
        }
    });
    upgradeOptions.push({
        name: "Move Speed+0.2", probabilityFactor: 1, upgrade: (c: Character) => {
            c.moveSpeed += 0.2;
        }
    });

    return upgradeOptions;
}

export function tickMapCharacters(map: GameMap, game: Game) {
    takeTimeMeasure(game.debug, "", "tickMapCharacters");
    let pathingCache = getPathingCache(game);
    let allCharacters: Character[] = [];
    for (let i = 0; i < map.activeChunkKeys.length; i++) {
        let chunk = map.chunks[map.activeChunkKeys[i]];
        allCharacters.push(...chunk.characters);
    }
    tickCharacters(allCharacters, game, pathingCache);
    takeTimeMeasure(game.debug, "tickMapCharacters", "");
}

export function tickCharacters(characters: Character[], game: Game, pathingCache: PathingCache | null = null) {
    for (let j = characters.length - 1; j >= 0; j--) {
        CHARACTER_TYPE_FUNCTIONS[characters[j].type].tickFunction(characters[j], game, pathingCache);
        if (!characters[j].isDead) {
            for (let ability of characters[j].abilities) {
                let tickAbility = ABILITIES_FUNCTIONS[ability.name].tickAbility;
                if(tickAbility) tickAbility(characters[j], ability, game);
            }
            tickCharacterDebuffs(characters[j], game);
        }
    }
}

export function getPlayerCharacters(players: Player[]) {
    let playerCharacters = [];
    for (let i = 0; i < players.length; i++) {
        playerCharacters.push(players[i].character);
    }
    return playerCharacters;
}

export function findMyCharacter(game: Game): Character | undefined{
    let myClientId = game.multiplayer.myClientId;
    let myPlayer = findPlayerById(game.state.players, myClientId);
    return myPlayer?.character;
}

export function determineClosestCharacter(position: Position, characters: Character[]) {
    let minDistance: number = 0;
    let minDistanceCharacter: Character | null = null;

    for (let i = 0; i < characters.length; i++) {
        if (characters[i].isDead) continue;
        if (characters[i].type === "levelingCharacter" && (characters[i] as LevelingCharacter).isPet) continue;
        let distance = calculateDistance(position, characters[i]);
        if (minDistanceCharacter === null || minDistance > distance) {
            minDistance = distance;
            minDistanceCharacter = characters[i];
        }
    }
    return { minDistanceCharacter, minDistance };
}

export function determineCharactersInDistance(position: Position, map: GameMap, players: Player[], bosses: BossEnemyCharacter[], maxDistance: number, notFaction: string | undefined = undefined): Character[] {
    let result: Character[] = [];
    let mapKeysInDistance = determineMapKeysInDistance(position, map, maxDistance, true, false);

    for (let i = 0; i < mapKeysInDistance.length; i++) {
        let chunk = map.chunks[mapKeysInDistance[i]];
        if (chunk === undefined) continue;
        let characters: Character[] = chunk.characters;
        for (let j = 0; j < characters.length; j++) {
            if (characters[j].faction === notFaction) continue;
            let distance = calculateDistance(position, characters[j]);
            if (maxDistance >= distance) {
                result.push(characters[j]);
            }
        }
    }

    for (let boss of bosses) {
        if (boss.faction === notFaction) continue;
        let distance = calculateDistance(position, boss);
        if (maxDistance >= distance) {
            result.push(boss);
        }
    }

    for (let player of players) {
        if (player.character.faction === notFaction) continue;
        let distance = calculateDistance(position, player.character);
        if (maxDistance >= distance) {
            result.push(player.character);
        }
    }
    return result;
}

export function getCharactersTouchingLine(game: Game, lineStart: Position, lineEnd: Position, lineWidth: number = 3): Character[] {
    let chunks: MapChunk[] = getChunksTouchingLine(game.state.map, lineStart, lineEnd);
    let charactersTouchingLine: Character[] = [];
    for (let chunk of chunks) {
        for (let char of chunk.characters) {
            let distance = calculateDistancePointToLine(char, lineStart, lineEnd);
            if (distance < char.width / 2 + lineWidth / 2) {
                charactersTouchingLine.push(char);
            }
        }
    }
    for (let boss of game.state.bossStuff.bosses) {
        let distance = calculateDistancePointToLine(boss, lineStart, lineEnd);
        if (distance < boss.width / 2 + lineWidth / 2) {
            charactersTouchingLine.push(boss);
        }
    }

    return charactersTouchingLine;
}

export function countCharacters(map: GameMap): number {
    let counter = 0;
    let chunkKeys = Object.keys(map.chunks);

    for (const key of chunkKeys) {
        counter += map.chunks[key].characters.length;
    }

    return counter;
}

export function findAndSetNewCameraCharacterId(camera: Camera, players: Player[], myClientId?: number) {
    let newCameraCharacterId = undefined;
    for (let i = 0; i < players.length; i++) {
        if (!players[i].character.isDead) {
            if (players[i].character.id === camera.characterId
                || newCameraCharacterId === undefined
                || myClientId === players[i].clientId) {
                newCameraCharacterId = players[i].character.id;
            }
        }
    }
    if (newCameraCharacterId) {
        camera.characterId = newCameraCharacterId;
    }
}

export function getSpawnPositionAroundPlayer(playerCharacter: Character, randomSeed: RandomSeed, map: GameMap, idCounter: IdCounter): Position | null {
    let spawnDistance = 150;
    let pos: Position = { x: 0, y: 0 };
    if (nextRandom(randomSeed) < 0.5) {
        pos.x = playerCharacter.x + (Math.round(nextRandom(randomSeed)) * 2 - 1) * spawnDistance;
        pos.y = playerCharacter.y + (nextRandom(randomSeed) - 0.5) * spawnDistance * 2;
    } else {
        pos.x = playerCharacter.x + (nextRandom(randomSeed) - 0.5) * spawnDistance * 2;
        pos.y = playerCharacter.y + (Math.round(nextRandom(randomSeed)) * 2 - 1) * spawnDistance;
    }
    if (!isPositionBlocking(pos, map, idCounter)) {
        return pos;
    }
    return null;
}

export function countAlivePlayerCharacters(players: Player[]) {
    let counter = 0;
    for (let i = players.length - 1; i >= 0; i--) {
        if (!players[i].character.isDead) {
            if (players[i].character.isPet) continue;
            counter++;
        }
    }
    return counter;
}

export function determineEnemyMoveDirection(enemy: Character, closestPlayerPosition: Position | null, map: GameMap, pathingCache: PathingCache, idCounter: IdCounter, time: number) {
    if (closestPlayerPosition === null) {
        enemy.isMoving = false;
        return;
    }
    enemy.isMoving = true;
    let nextWayPoint: Position | null = getNextWaypoint(enemy, closestPlayerPosition, map, pathingCache, idCounter, time);
    if (nextWayPoint === null) {
        enemy.isMoving = false;
        return;
    }
    enemy.moveDirection = calculateDirection(enemy, nextWayPoint);
}

export function turnCharacterToPet(character: Character, game: Game){
    character.isDead = false;
    character.hp = character.maxHp;
    if (character.isPet) {
        console.log("character already a pet, should not happen");
        debugger;
    } else {
        character.isPet = true;
        let newPlayerOwnerId: number | undefined = undefined;
        let possibleOwnerCharacters: LevelingCharacter[] = [];
        for (let player of game.state.players) {
            let characterIter: LevelingCharacter = player.character as LevelingCharacter;
            if (!characterIter.isPet && !characterIter.isDead) {
                possibleOwnerCharacters.push(characterIter);
            }
        }
        if (possibleOwnerCharacters.length > 0) {
            let randomOwnerIndex = Math.floor(nextRandom(game.state.randomSeed) * possibleOwnerCharacters.length);
            newPlayerOwnerId = possibleOwnerCharacters[randomOwnerIndex].id;
            character.x = possibleOwnerCharacters[randomOwnerIndex].x;
            character.y = possibleOwnerCharacters[randomOwnerIndex].y;
        }

        character.abilities.push(createAbilityLeash(game.state.idCounter, undefined ,100, newPlayerOwnerId));
    }    
}

export function moveCharacterTick(character: Character, map: GameMap, idCounter: IdCounter, isPlayer: boolean) {
    if (character.isMoving) {
        let x = character.x + Math.cos(character.moveDirection) * character.moveSpeed;
        let y = character.y + Math.sin(character.moveDirection) * character.moveSpeed;
        let blocking = isPositionBlocking({ x, y }, map, idCounter);
        if (!blocking) {
            let blockingBothSides = isPositionBlocking({ x: character.x, y }, map, idCounter) && isPositionBlocking({ x, y: character.y }, map, idCounter);
            if (!blockingBothSides) {
                mapCharacterCheckForChunkChange(character, map, x, y, isPlayer);
                character.x = x;
                character.y = y;
            }
        } else {
            let xTile = Math.floor(character.x / map.tileSize);
            let newXTile = Math.floor(x / map.tileSize);
            if (xTile !== newXTile) {
                if (!isPositionBlocking({ x: character.x, y }, map, idCounter)) {
                    mapCharacterCheckForChunkChange(character, map, character.x, y, isPlayer);
                    character.y = y;
                    return;
                }
            }
            let yTile = Math.floor(character.y / map.tileSize);
            let newYTile = Math.floor(y / map.tileSize);
            if (yTile !== newYTile) {
                if (!isPositionBlocking({ x, y: character.y }, map, idCounter)) {
                    mapCharacterCheckForChunkChange(character, map, x, character.y, isPlayer);
                    character.x = x;
                }
            }
        }
    }
}

function mapCharacterCheckForChunkChange(character: Character, map: GameMap, newX: number, newY: number, isPlayer: boolean) {
    if (!isPlayer && character.type !== CHARACTER_TYPE_BOSS_ENEMY) {
        let currentChunkI = Math.floor(character.y / (map.tileSize * map.chunkLength));
        let newChunkI = Math.floor(newY / (map.tileSize * map.chunkLength));
        let currentChunkJ = Math.floor(character.x / (map.tileSize * map.chunkLength));
        let newChunkJ = Math.floor(newX / (map.tileSize * map.chunkLength));
        if (currentChunkI !== newChunkI || currentChunkJ !== newChunkJ) {
            let currentChunkKey = `${currentChunkI}_${currentChunkJ}`;
            let newChunkKey = `${newChunkI}_${newChunkJ}`;
            map.chunks[currentChunkKey].characters = map.chunks[currentChunkKey].characters.filter(el => el !== character);
            map.chunks[newChunkKey].characters.push(character);
        }
    }
}