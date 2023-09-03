import { levelingCharacterXpGain } from "./playerCharacters/levelingCharacter.js";
import { calculateMovePosition, determineMapKeysInDistance, GameMap, getChunksTouchingLine, isPositionBlocking, MapChunk, positionToMapKey } from "../map/map.js";
import { Character, CHARACTER_TYPE_FUNCTIONS, DEFAULT_CHARACTER } from "./characterModel.js";
import { getNextWaypoint, getPathingCache, PathingCache } from "./pathing.js";
import { calculateDirection, calculateDistance, calculateDistancePointToLine, createPaintTextData, endGame, takeTimeMeasure } from "../game.js";
import { Position, Game, IdCounter, Camera, FACTION_ENEMY, FACTION_PLAYER } from "../gameModel.js";
import { findPlayerById, Player } from "../player.js";
import { RandomSeed, nextRandom } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, findAbilityById, findAbilityOwnerByAbilityId, levelingAbilityXpGain } from "../ability/ability.js";
import { LEVELING_CHARACTER, LevelingCharacter } from "./playerCharacters/levelingCharacterModel.js";
import { BossEnemyCharacter, CHARACTER_TYPE_BOSS_ENEMY } from "./enemy/bossEnemy.js";
import { removeCharacterDebuffs, tickCharacterDebuffs } from "../debuff/debuff.js";
import { createAbilityLeash } from "../ability/abilityLeash.js";
import { fillRandomUpgradeOptionChoices, UpgradeOption } from "./upgrade.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters/playerCharacters.js";
import { CHARACTER_TYPE_END_BOSS_ENEMY } from "./enemy/endBossEnemy.js";

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

export function characterTakeDamage(character: Character, damage: number, game: Game, abilityRefId: number | undefined = undefined) {
    if (character.isDead) return;
    if (character.isPet) return;

    character.hp -= damage;
    if (character.hp <= 0) {
        killCharacter(character, game, abilityRefId);
    }
    if (game.UI.displayDamageNumbers) {
        let textPos = { x: character.x, y: character.y - character.height / 2 };
        let fontSize = character.faction === FACTION_PLAYER ? "20" : "12";
        let textColor = character.faction === FACTION_PLAYER ? "blue" : "black";
        game.UI.displayTextData.push(createPaintTextData(textPos, damage.toFixed(0), textColor, fontSize, game.state.time));
    }
    if (character.faction === FACTION_ENEMY) character.wasHitRecently = true;
}

export function playerCharactersAddBossSkillPoints(game: Game) {
    let playerCharacters: Character[] = getPlayerCharacters(game.state.players);
    for (let character of playerCharacters) {
        if (!character.isDead && !character.isPet) {
            let gotSkillPoint = false;
            if (character.bossSkillPoints) {
                character.bossSkillPoints++;
                gotSkillPoint = true;
            }
            for (let ability of character.abilities) {
                if (ability.bossSkillPoints !== undefined) {
                    ability.bossSkillPoints++;
                    gotSkillPoint = true;
                }
            }
            if (character.pets) {
                for (let pet of character.pets) {
                    if (pet.bossSkillPoints !== undefined) {
                        pet.bossSkillPoints++;
                        gotSkillPoint = true;
                    }
                    for (let ability of pet.abilities) {
                        if (ability.bossSkillPoints !== undefined) {
                            ability.bossSkillPoints++;
                            gotSkillPoint = true;
                        }
                    }
                }
            }
            if (gotSkillPoint && character.upgradeChoices.length === 0) {
                fillRandomUpgradeOptionChoices(character, game);
            }
        }
    }
}

export function executeDefaultCharacterUpgradeOption(character: Character, upgradeOptionChoice: UpgradeOption, game: Game) {
    if (character.type === DEFAULT_CHARACTER) {
        let keys = Object.keys(PLAYER_CHARACTER_CLASSES_FUNCTIONS);

        for (let key of keys) {
            if (key === upgradeOptionChoice.identifier) {
                PLAYER_CHARACTER_CLASSES_FUNCTIONS[key].changeCharacterToThisClass(character, game.state.idCounter, game);
                break;
            }
        }
    }
}

function killCharacter(character: Character, game: Game, abilityRefId: number | undefined = undefined) {
    character.isDead = true;
    if (game.state.timeFirstKill === undefined) game.state.timeFirstKill = game.state.time;
    levelingCharacterXpGain(game.state, character, game);
    if (character.type === CHARACTER_TYPE_BOSS_ENEMY) {
        playerCharactersAddBossSkillPoints(game);
    }
    if (character.type === CHARACTER_TYPE_END_BOSS_ENEMY) {
        endGame(game, true);
    }
    if (abilityRefId !== undefined) {
        let ability = findAbilityById(abilityRefId, game);
        if (ability) {
            levelingAbilityXpGain(ability, character.experienceWorth, game);
            const owner = findAbilityOwnerByAbilityId(ability.id, game);
            if (owner && owner.leveling && owner.type !== LEVELING_CHARACTER) {
                if (!owner.isDead && !owner.isPet) {
                    owner.leveling.experience += character.experienceWorth;
                    while (owner.leveling.experience >= owner.leveling.experienceForLevelUp) {
                        owner.leveling.level++;
                        owner.leveling.experience -= owner.leveling.experienceForLevelUp;
                        owner.leveling.experienceForLevelUp += Math.floor(owner.leveling.level / 2);
                        for (let abilityIt of owner.abilities) {
                            setCharacterAbilityLevel(abilityIt, owner);
                        }
                    }
                }
            }
        }
    }
    removeCharacterDebuffs(character, game);
    game.state.killCounter++;
}

export function setCharacterAbilityLevel(ability: Ability, character: Character) {
    const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
    if (character.leveling && abilityFunctions && abilityFunctions.setAbilityToLevel) {
        const abilityLevel = Math.max(1, Math.ceil(character.leveling.level / 2));
        abilityFunctions.setAbilityToLevel(ability, abilityLevel);
    }
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

export function tickCharacters(characters: Character[], game: Game, pathingCache: PathingCache | null, petOwner: Character | undefined = undefined) {
    for (let j = characters.length - 1; j >= 0; j--) {
        const functions = CHARACTER_TYPE_FUNCTIONS[characters[j].type];
        if (functions?.tickFunction) {
            functions.tickFunction(characters[j], game, pathingCache);
        } else if (functions?.tickPetFunction && petOwner) {
            functions.tickPetFunction(characters[j], petOwner, game, pathingCache);
        }
        if (!characters[j].isDead) {
            for (let ability of characters[j].abilities) {
                let tickAbility = ABILITIES_FUNCTIONS[ability.name].tickAbility;
                if (tickAbility) tickAbility(characters[j], ability, game);
            }
            tickCharacterDebuffs(characters[j], game);
            tickCharacterPets(characters[j], game, pathingCache);
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

export function getRandomAlivePlayerCharacter(players: Player[], randomSeed: RandomSeed): Character | undefined{
    const random = Math.floor(nextRandom(randomSeed) * players.length);
    for (let i = 0; i < players.length; i++) {
        let player = players[(random + i) % players.length];
        if(!player.character.isPet && !player.character.isDead){
            return player.character;
        }
    }
    return undefined;
}

export function findMyCharacter(game: Game): Character | undefined {
    let myClientId = game.multiplayer.myClientId;
    let myPlayer = findPlayerById(game.state.players, myClientId);
    return myPlayer?.character;
}


export function tickDefaultCharacter(character: Character, game: Game, pathingCache: PathingCache | null) {
    const isPlayer = character.faction === FACTION_PLAYER;
    if (character.isDead) return;
    moveCharacterTick(character, game.state.map, game.state.idCounter);
}

export function determineClosestCharacter(position: Position, characters: Character[], excludeEndbossArea: boolean = false, map: GameMap | undefined = undefined) {
    let minDistance: number = 0;
    let minDistanceCharacter: Character | null = null;

    for (let i = 0; i < characters.length; i++) {
        if (characters[i].isDead) continue;
        if (characters[i].isPet) continue;
        if (excludeEndbossArea && map) {
            const mapKey = positionToMapKey(characters[i], map);
            const mapChunk = map.chunks[mapKey];
            if (mapChunk.isEndBossAreaChunk) continue;
        }
        let distance = calculateDistance(position, characters[i]);
        if (minDistanceCharacter === null || minDistance > distance) {
            minDistance = distance;
            minDistanceCharacter = characters[i];
        }
    }
    return { minDistanceCharacter, minDistance };
}

export function determineCharactersInDistance(position: Position, map: GameMap | undefined, players: Player[], bosses: BossEnemyCharacter[], maxDistance: number, notFaction: string | undefined = undefined): Character[] {
    let result: Character[] = [];

    if(map){
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

export function getCharactersTouchingLine(game: Game, lineStart: Position, lineEnd: Position, excludeFaction: string, lineWidth: number = 3): Character[] {
    const enemyMaxWidth = 20;
    let charactersTouchingLine: Character[] = [];
    if (excludeFaction !== FACTION_ENEMY) {
        let chunks: MapChunk[] = getChunksTouchingLine(game.state.map, lineStart, lineEnd, lineWidth + enemyMaxWidth);
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
    }
    if (excludeFaction !== FACTION_PLAYER) {
        const playerCharacters = getPlayerCharacters(game.state.players);
        for (let player of playerCharacters) {
            let distance = calculateDistancePointToLine(player, lineStart, lineEnd);
            if (distance < player.width / 2 + lineWidth / 2) {
                charactersTouchingLine.push(player);
            }
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

export function calculateAndSetMoveDirectionToPositionWithPathing(character: Character, targetPosition: Position | null, map: GameMap, pathingCache: PathingCache, idCounter: IdCounter, time: number) {
    if (targetPosition === null) {
        character.isMoving = false;
        return;
    }
    character.isMoving = true;
    let nextWayPoint: Position | null = getNextWaypoint(character, targetPosition, map, pathingCache, idCounter, time);
    if (nextWayPoint === null) {
        character.isMoving = false;
        return;
    }
    character.moveDirection = calculateDirection(character, nextWayPoint);
}

export function turnCharacterToPet(character: Character, game: Game) {
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

        character.abilities.push(createAbilityLeash(game.state.idCounter, undefined, 100, newPlayerOwnerId));
    }
}

export function moveMapCharacterTick(character: Character, map: GameMap, idCounter: IdCounter) {
    let newPosition = calculateCharacterMovePosition(character, map, idCounter);
    if (newPosition) {
        mapCharacterCheckForChunkChange(character, map, newPosition.x, newPosition.y);
        character.x = newPosition.x;
        character.y = newPosition.y;
    }
}

export function moveCharacterTick(character: Character, map: GameMap, idCounter: IdCounter) {
    if (character.isRooted) return;
    let newPosition = calculateCharacterMovePosition(character, map, idCounter);
    if (newPosition) {
        character.x = newPosition.x;
        character.y = newPosition.y;
    }
}

export function calculateCharacterMovePosition(character: Character, map: GameMap, idCounter: IdCounter) {
    if (character.isMoving) {
        return calculateMovePosition(character, character.moveDirection, character.moveSpeed, true, map, idCounter);
    }
    return undefined;
}

function tickCharacterPets(character: Character, game: Game, pathingCache: PathingCache | null) {
    if (character.pets !== undefined) {
        tickCharacters(character.pets, game, pathingCache, character);
    }
}

function mapCharacterCheckForChunkChange(character: Character, map: GameMap, newX: number, newY: number) {
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