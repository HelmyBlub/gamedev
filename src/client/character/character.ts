import { levelingCharacterXpGain } from "./playerCharacters/levelingCharacter.js";
import { calculateMovePosition, chunkXYToMapKey, determineMapKeysInDistance, GameMap, getChunksTouchingLine, MapChunk, mapKeyToChunkXY, positionToMapKey } from "../map/map.js";
import { Character, CHARACTER_TYPE_FUNCTIONS, PLAYER_CHARACTER_TYPE } from "./characterModel.js";
import { getNextWaypoint, getPathingCache, PathingCache } from "./pathing.js";
import { calculateDirection, calculateDistance, calculateDistancePointToLine, changeCharacterAndAbilityIds, createPaintTextData, getNextId, takeTimeMeasure } from "../game.js";
import { Position, Game, IdCounter, Camera, FACTION_ENEMY, FACTION_PLAYER } from "../gameModel.js";
import { findPlayerById, Player } from "../player.js";
import { RandomSeed, nextRandom } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, findAbilityById, findAbilityOwnerByAbilityId, levelingAbilityXpGain, resetAllCharacterAbilities } from "../ability/ability.js";
import { BossEnemyCharacter, CHARACTER_TYPE_BOSS_ENEMY } from "./enemy/bossEnemy.js";
import { removeCharacterDebuffs, tickCharacterDebuffs } from "../debuff/debuff.js";
import { ABILITY_NAME_LEASH, AbilityLeash, createAbilityLeash } from "../ability/abilityLeash.js";
import { fillRandomUpgradeOptionChoices, UpgradeOption } from "./upgrade.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters/playerCharacters.js";
import { CHARACTER_TYPE_END_BOSS_ENEMY } from "./enemy/endBossEnemy.js";
import { createEndBossCrownCharacter } from "./enemy/endBossCrown.js";
import { TamerPetCharacter, tradePets } from "./playerCharacters/tamer/tamerPetCharacter.js";
import { ENEMY_FIX_RESPAWN_POSITION } from "./enemy/fixPositionRespawnEnemyModel.js";
import { addCombatlogDamageTakenEntry } from "../combatlog.js";
import { executeAbilityLevelingCharacterUpgradeOption } from "./playerCharacters/abilityLevelingCharacter.js";

export function findCharacterById(characters: Character[], id: number): Character | null {
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].id === id) {
            return characters[i];
        }
    }
    return null;
}

export function findCharacterByIdAroundPosition(position: Position, range: number, game: Game, id: number): Character | null {
    const characters = determineCharactersInDistance(position, game.state.map, game.state.players, game.state.bossStuff.bosses, range);
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].id === id) {
            return characters[i];
        }
    }
    return null;
}

export function findCharacterByIdInCompleteMap(id: number, game: Game) {
    const map = game.state.map;
    const keys = Object.keys(map.chunks);
    for (let chunkKey of keys) {
        const chunk = map.chunks[chunkKey];
        for (let char of chunk.characters) {
            if (char.id === id) {
                console.log(chunkKey, char);
                return char;
            }
        }
    }
}

export function characterTakeDamage(character: Character, damage: number, game: Game, abilityRefId: number | undefined = undefined, abilityName: string) {
    if (character.isDead || character.isPet || character.isDamageImmune) return;
    let modifiedDamage = damage * character.damageTakenModifierFactor;
    if (character.shield > 0) {
        character.shield -= modifiedDamage;
        if (character.shield < 0) {
            character.hp += character.shield;
            character.shield = 0;
        }
    } else {
        character.hp -= modifiedDamage;
        addCombatlogDamageTakenEntry(character, modifiedDamage, abilityName, game);
    }
    if (character.hp <= 0) {
        killCharacter(character, game, abilityRefId);
    }
    if (game.UI.displayDamageNumbers) {
        const textPos = { x: character.x, y: character.y - character.height / 2 - 15 };
        const fontSize = character.faction === FACTION_PLAYER ? "20" : "12";
        const textColor = character.faction === FACTION_PLAYER ? "blue" : "black";
        game.UI.displayTextData.push(createPaintTextData(textPos, modifiedDamage.toFixed(0), textColor, fontSize, game.state.time));
    }
    if (character.faction === FACTION_ENEMY) character.wasHitRecently = true;
}

export function characterGetShield(character: Character, shieldValue: number) {
    if (character.isDead) return;
    character.shield += shieldValue;
    if (character.shield > character.maxShieldFactor * character.maxHp) {
        character.shield = character.maxShieldFactor * character.maxHp
    }
}

export function playerCharactersAddBossSkillPoints(bossLevel: number | undefined, game: Game) {
    if(bossLevel === undefined) return;
    const playerCharacters: Character[] = getPlayerCharacters(game.state.players);
    for (let character of playerCharacters) {
        if (!character.isDead && !character.isPet) {
            let gotSkillPoint = false;
            if (character.bossSkillPoints !== undefined) {
                if (character.bossSkillPoints.used < bossLevel) {
                    character.bossSkillPoints.available++;
                    gotSkillPoint = true;
                }
            }
            for (let ability of character.abilities) {
                if (ability.gifted) continue;
                if (ability.bossSkillPoints !== undefined) {
                    if (ability.bossSkillPoints.used < bossLevel) {
                        ability.bossSkillPoints.available++;
                        gotSkillPoint = true;
                    }
                }
            }
            if (character.pets) {
                for (let pet of character.pets) {
                    if (pet.gifted) continue;
                    if (pet.bossSkillPoints !== undefined) {
                        if (pet.bossSkillPoints.used < bossLevel) {
                            pet.bossSkillPoints.available++;
                            gotSkillPoint = true;
                        }
                    }
                    for (let ability of pet.abilities) {
                        if (ability.bossSkillPoints !== undefined) {
                            if (ability.bossSkillPoints.used < bossLevel) {
                                ability.bossSkillPoints.available++;
                                gotSkillPoint = true;
                            }
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

export function canCharacterTradeAbilityOrPets(character: Character): boolean {
    for (let ability of character.abilities) {
        if (ability.tradable) return true;
    }
    if (character.pets) {
        for (let pet of character.pets) {
            if (pet.tradable) return true;
        }
    }
    return false;
}

export function characterTradeAbilityAndPets(fromCharacter: Character, toCharacter: Character, game: Game) {
    for (let i = fromCharacter.abilities.length - 1; i >= 0; i--) {
        const ability = fromCharacter.abilities[i];
        if (ability.tradable) {
            if (ability.unique) {
                if (toCharacter.abilities.find((a) => a.name === ability.name)) {
                    fromCharacter.abilities.splice(i, 1);
                    continue;
                }
            }
            fromCharacter.abilities.splice(i, 1);
            ability.tradable = false;
            ability.gifted = true;
            if (ability.bossSkillPoints != undefined) ability.bossSkillPoints = undefined;
            if (ability.leveling) ability.leveling = undefined;
            toCharacter.abilities.push(ability);
        }
    }
    tradePets(fromCharacter, toCharacter, game);
    if (!toCharacter.overtakenCharacterClasses) toCharacter.overtakenCharacterClasses = [];
    if (fromCharacter.characterClass) {
        const newClass = fromCharacter.characterClass;
        toCharacter.overtakenCharacterClasses.push(newClass);
        const classFunctions = PLAYER_CHARACTER_CLASSES_FUNCTIONS[newClass];
        if (classFunctions && classFunctions.preventMultiple) {
            if (toCharacter.upgradeChoices && toCharacter.upgradeChoices[0].type === "Character") {
                const index = toCharacter.upgradeChoices.findIndex(c => c.displayText === newClass);
                if (index > -1) {
                    toCharacter.upgradeChoices.splice(index, 1);
                }
            }
        }
    }
    resetAllCharacterAbilities(toCharacter);
}

export function changeCharacterId(character: Character, idCounter: IdCounter) {
    character.id = getNextId(idCounter);
    if (character.pets) {
        for (let pet of character.pets) {
            changeCharacterAndAbilityIds(pet, idCounter);
            const leash: AbilityLeash = pet.abilities.find((a) => a.name === ABILITY_NAME_LEASH) as AbilityLeash;
            if (leash) leash.leashedToOwnerId = character.id;
        }
    }
    const leash: AbilityLeash = character.abilities.find((a) => a.name === ABILITY_NAME_LEASH) as AbilityLeash;
    if (leash) {
        leash.leashedToOwnerId = undefined;
    }
}

export function executeDefaultCharacterUpgradeOption(character: Character, upgradeOptionChoice: UpgradeOption, game: Game) {
    if (character.characterClass === undefined) {
        const keys = Object.keys(PLAYER_CHARACTER_CLASSES_FUNCTIONS);
        for (let key of keys) {
            if (key === upgradeOptionChoice.identifier) {
                PLAYER_CHARACTER_CLASSES_FUNCTIONS[key].changeCharacterToThisClass(character, game.state.idCounter, game);
                break;
            }
        }
    }else if(upgradeOptionChoice.type === "Ability"){
        executeAbilityLevelingCharacterUpgradeOption(character, upgradeOptionChoice, game);
    }
}

export function setCharacterAbilityLevel(ability: Ability, character: Character) {
    const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
    if (character.level?.leveling && abilityFunctions && abilityFunctions.setAbilityToLevel) {
        const abilityLevel = Math.max(1, Math.ceil(character.level.level / 2));
        abilityFunctions.setAbilityToLevel(ability, abilityLevel);
    }
}

export function tickMapCharacters(map: GameMap, game: Game) {
    takeTimeMeasure(game.debug, "", "tickMapCharacters");
    const pathingCache = getPathingCache(game);
    const allCharacters: Character[] = [];
    for (let i = 0; i < map.activeChunkKeys.length; i++) {
        const chunk = map.chunks[map.activeChunkKeys[i]];
        allCharacters.push(...chunk.characters);
    }
    tickCharacters(allCharacters, game, pathingCache);
    takeTimeMeasure(game.debug, "tickMapCharacters", "");
}

export function tickCharacters(characters: (Character | undefined)[], game: Game, pathingCache: PathingCache | null, petOwner: Character | undefined = undefined) {
    for (let j = characters.length - 1; j >= 0; j--) {
        const char = characters[j];
        if (!char) continue;
        const functions = CHARACTER_TYPE_FUNCTIONS[char.type];
        if (functions?.tickFunction) {
            functions.tickFunction(char, game, pathingCache);
        } else if (functions?.tickPetFunction && petOwner) {
            functions.tickPetFunction(char, petOwner, game, pathingCache);
        } else {
            tickDefaultCharacter(char, game, pathingCache);
        }
        if (!char.isDead) {
            if (game.state.bossStuff.endBossStarted && char.type === ENEMY_FIX_RESPAWN_POSITION) continue;
            for (let ability of char.abilities) {
                const tickAbility = ABILITIES_FUNCTIONS[ability.name].tickAbility;
                if (tickAbility) tickAbility(char, ability, game);
            }
            tickCharacterDebuffs(char, game);
            tickCharacterPets(char, game, pathingCache);
        }
    }
}

export function getPlayerCharacters(players: Player[]) {
    const playerCharacters = [];
    for (let i = 0; i < players.length; i++) {
        playerCharacters.push(players[i].character);
    }
    return playerCharacters;
}

export function getRandomAlivePlayerCharacter(players: Player[], randomSeed: RandomSeed): Character | undefined {
    const random = Math.floor(nextRandom(randomSeed) * players.length);
    for (let i = 0; i < players.length; i++) {
        const player = players[(random + i) % players.length];
        if (!player.character.isPet && !player.character.isDead) {
            return player.character;
        }
    }
    return undefined;
}

export function findMyCharacter(game: Game): Character | undefined {
    const myClientId = game.multiplayer.myClientId;
    const myPlayer = findPlayerById(game.state.players, myClientId);
    return myPlayer?.character;
}

export function tickDefaultCharacter(character: Character, game: Game, pathingCache: PathingCache | null) {
    if (character.isDead) {
        if (!character.willTurnToPetOnDeath) return;
        turnCharacterToPet(character, game);
    }
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
        const distance = calculateDistance(position, characters[i]);
        if (minDistanceCharacter === null || minDistance > distance) {
            minDistance = distance;
            minDistanceCharacter = characters[i];
        }
    }
    return { minDistanceCharacter, minDistance };
}

export function resetCharacter(character: Character) {
    const typeFunctions = CHARACTER_TYPE_FUNCTIONS[character.type];
    if (typeFunctions && typeFunctions.reset) {
        typeFunctions.reset(character);
    }
    if (character.isDead) character.isDead = false;
    if (character.isPet) character.isPet = false;
    character.isMoving = false;
    if (character.pets) {
        for (let pet of character.pets) {
            const petTypeFunctions = CHARACTER_TYPE_FUNCTIONS[pet.type];
            if (petTypeFunctions && petTypeFunctions.reset) {
                petTypeFunctions.reset(pet);
            }
        }
    }
    resetAllCharacterAbilities(character);
}

export function determineCharactersInDistance(position: Position, map: GameMap | undefined, players: Player[], bosses: BossEnemyCharacter[] | undefined, maxDistance: number, notFaction: string | undefined = undefined): Character[] {
    const result: Character[] = [];
    if (notFaction === undefined || FACTION_ENEMY !== notFaction) {
        if (map) {
            const mapKeysInDistance = determineMapKeysInDistance(position, map, maxDistance, true, false);
            for (let i = 0; i < mapKeysInDistance.length; i++) {
                const chunk = map.chunks[mapKeysInDistance[i]];
                if (chunk === undefined) continue;
                const characters: Character[] = chunk.characters;
                for (let j = 0; j < characters.length; j++) {
                    const distance = calculateDistance(position, characters[j]);
                    if (maxDistance >= distance) {
                        result.push(characters[j]);
                    }
                }
            }
        }
        if (bosses) {
            for (let boss of bosses) {
                const distance = calculateDistance(position, boss);
                if (maxDistance >= distance) {
                    result.push(boss);
                }
            }
        }
    }

    if (notFaction === undefined || FACTION_PLAYER !== notFaction) {
        for (let player of players) {
            if (player.character.faction === notFaction) continue;
            const distance = calculateDistance(position, player.character);
            if (maxDistance >= distance) {
                result.push(player.character);
            }
        }
    }
    return result;
}

export function getCharactersTouchingLine(game: Game, lineStart: Position, lineEnd: Position, excludeFaction: string, lineWidth: number = 3): Character[] {
    const enemyMaxWidth = 20;
    const charactersTouchingLine: Character[] = [];
    if (excludeFaction !== FACTION_ENEMY) {
        const chunks: MapChunk[] = getChunksTouchingLine(game.state.map, lineStart, lineEnd, lineWidth + enemyMaxWidth);
        for (let chunk of chunks) {
            for (let char of chunk.characters) {
                const distance = calculateDistancePointToLine(char, lineStart, lineEnd);
                if (distance < char.width / 2 + lineWidth / 2) {
                    charactersTouchingLine.push(char);
                }
            }
        }
        for (let boss of game.state.bossStuff.bosses) {
            const distance = calculateDistancePointToLine(boss, lineStart, lineEnd);
            if (distance < boss.width / 2 + lineWidth / 2) {
                charactersTouchingLine.push(boss);
            }
        }
    }
    if (excludeFaction !== FACTION_PLAYER) {
        const playerCharacters = getPlayerCharacters(game.state.players);
        for (let player of playerCharacters) {
            const distance = calculateDistancePointToLine(player, lineStart, lineEnd);
            if (distance < player.width / 2 + lineWidth / 2) {
                charactersTouchingLine.push(player);
            }
        }
    }

    return charactersTouchingLine;
}

export function countCharacters(map: GameMap): number {
    let counter = 0;
    const chunkKeys = Object.keys(map.chunks);

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

export function calculateAndSetMoveDirectionToPositionWithPathing(character: Character, targetPosition: Position | null, map: GameMap, pathingCache: PathingCache | null, idCounter: IdCounter, time: number, game: Game): boolean {
    if (targetPosition === null) {
        character.isMoving = false;
        return false;
    }
    character.isMoving = true;
    const nextWayPoint: Position | null = getNextWaypoint(character, targetPosition, map, pathingCache, idCounter, time, game);
    if (nextWayPoint === null) {
        character.isMoving = false;
        return false;
    }
    character.moveDirection = calculateDirection(character, nextWayPoint);
    return true;
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
        const possibleOwnerCharacters: Character[] = [];
        for (let player of game.state.players) {
            if (!player.character.isPet && !player.character.isDead) {
                possibleOwnerCharacters.push(player.character);
            }
        }
        if (possibleOwnerCharacters.length > 0) {
            const randomOwnerIndex = Math.floor(nextRandom(game.state.randomSeed) * possibleOwnerCharacters.length);
            newPlayerOwnerId = possibleOwnerCharacters[randomOwnerIndex].id;
            character.x = possibleOwnerCharacters[randomOwnerIndex].x;
            character.y = possibleOwnerCharacters[randomOwnerIndex].y;
        }

        character.abilities.push(createAbilityLeash(game.state.idCounter, undefined, 100, newPlayerOwnerId));
    }
}

export function moveCharacterTick(character: Character, map: GameMap, idCounter: IdCounter) {
    if (character.isRooted) return;
    if (character.isMoveTickDisabled) return;
    const newPosition = calculateCharacterMovePosition(character, map, idCounter);
    if (newPosition) {
        setCharacterPosition(character, newPosition, map);
    }
}

export function setCharacterPosition(character: Character, position: Position, map: GameMap) {
    if (character.mapChunkKey) mapCharacterCheckAndDoChunkChange(character, map, position.x, position.y);
    character.x = position.x;
    character.y = position.y;
}

export function calculateCharacterMovePosition(character: Character, map: GameMap, idCounter: IdCounter) {
    if (character.isMoving) {
        return calculateMovePosition(character, character.moveDirection, character.moveSpeed, true, map, idCounter);
    }
    return undefined;
}

export function mapCharacterCheckAndDoChunkChange(character: Character, map: GameMap, newX: number, newY: number) {
    const currentChunkKey = character.mapChunkKey;
    if (!currentChunkKey) {
        console.log("missing chunk key on map character");
        return;
    }
    const currentChunk = mapKeyToChunkXY(currentChunkKey);
    const newChunkY = Math.floor(newY / (map.tileSize * map.chunkLength));
    const newChunkX = Math.floor(newX / (map.tileSize * map.chunkLength));
    if (currentChunk.chunkY !== newChunkY || currentChunk.chunkX !== newChunkX) {
        const newChunkKey = chunkXYToMapKey(newChunkX, newChunkY);
        const charIndex = map.chunks[currentChunkKey].characters.findIndex(el => el === character);
        const deleted = map.chunks[currentChunkKey].characters.splice(charIndex, 1);
        if (deleted.length === 0) {
            console.log("missing character in chunk", character.id, currentChunkKey);
        }
        map.chunks[newChunkKey].characters.push(character);
        character.mapChunkKey = newChunkKey;
    }
}

function experienceForEveryPlayersLeveling(experience: number, game: Game) {
    const playerCharacters = getPlayerCharacters(game.state.players);
    for (let character of playerCharacters) {
        experienceForCharacter(character, experience, game);
        for (let ability of character.abilities) {
            levelingAbilityXpGain(ability, character, experience, game);
        }
        if (character.pets) {
            for (let pet of character.pets) {
                experienceForCharacter(pet, experience, game);
                for (let ability of pet.abilities) {
                    levelingAbilityXpGain(ability, character, experience, game);
                }
            }
        }
    }
}

function experienceForCharacter(character: Character, experienceWorth: number, game: Game) {
    const owner = character;
    if (owner && owner.level?.leveling
        && !owner.isDead && !owner.isPet
        && !(owner as TamerPetCharacter).gifted
    ) {
        owner.level.leveling.experience += experienceWorth;
        while (owner.level.leveling.experience >= owner.level.leveling.experienceForLevelUp) {
            owner.level.level++;
            owner.level.leveling.experience -= owner.level.leveling.experienceForLevelUp;
            owner.level.leveling.experienceForLevelUp += Math.floor(owner.level.level / 2);
            for (let abilityIt of owner.abilities) {
                setCharacterAbilityLevel(abilityIt, owner);
            }
        }
    }

}

function killCharacter(character: Character, game: Game, abilityRefId: number | undefined = undefined) {
    character.isDead = true;
    if (game.state.timeFirstKill === undefined) game.state.timeFirstKill = game.state.time;
    levelingCharacterXpGain(game.state, character, game);
    if (character.type === CHARACTER_TYPE_BOSS_ENEMY) {
        playerCharactersAddBossSkillPoints(character.level?.level, game);
        experienceForEveryPlayersLeveling(character.experienceWorth, game);
    }
    if (character.type === CHARACTER_TYPE_END_BOSS_ENEMY) {
        game.state.bossStuff.bosses.push(createEndBossCrownCharacter(game.state.idCounter, character));
    }
    if (abilityRefId !== undefined && character.type !== CHARACTER_TYPE_BOSS_ENEMY) {
        const ability = findAbilityById(abilityRefId, game);
        if (ability) {
            const owner = findAbilityOwnerByAbilityId(ability.id, game);
            if (owner) {
                levelingAbilityXpGain(ability, owner, character.experienceWorth, game);
                experienceForCharacter(owner, character.experienceWorth, game);
            }
        }
    }
    removeCharacterDebuffs(character, game);
    game.state.killCounter++;
}

function tickCharacterPets(character: Character, game: Game, pathingCache: PathingCache | null) {
    if (character.pets !== undefined) {
        tickCharacters(character.pets, game, pathingCache, character);
    }
}
