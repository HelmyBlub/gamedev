import { levelingCharacterAndClassXpGain } from "./playerCharacters/levelingCharacter.js";
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
import { CharacterClass, PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters/playerCharacters.js";
import { CHARACTER_TYPE_KING_ENEMY } from "./enemy/kingEnemy.js";
import { createKingCrownCharacter } from "./enemy/kingCrown.js";
import { TamerPetCharacter, tradePets } from "./playerCharacters/tamer/tamerPetCharacter.js";
import { ENEMY_FIX_RESPAWN_POSITION } from "./enemy/fixPositionRespawnEnemyModel.js";
import { addCombatlogDamageTakenEntry } from "../combatlog.js";
import { executeAbilityLevelingCharacterUpgradeOption } from "./playerCharacters/abilityLevelingCharacter.js";
import { addCharacterUpgrades, CHARACTER_UPGRADE_FUNCTIONS } from "./upgrades/characterUpgrades.js";

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

export function characterTakeDamage(character: Character, damage: number, game: Game, abilityIdRef: number | undefined = undefined, abilityName: string) {
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
        killCharacter(character, game, abilityIdRef);
    }
    if (!game.debug.disableDamageNumbers) {
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
    if (bossLevel === undefined) return;
    const playerCharacters: Character[] = getPlayerCharacters(game.state.players);
    for (let character of playerCharacters) {
        if (!character.isDead && !character.isPet) {
            let gotSkillPoint = false;
            if (character.bossSkillPoints !== undefined) {
                if (character.bossSkillPoints.used + character.bossSkillPoints.available < bossLevel) {
                    const legendaryAbilitySkillPointCapReached = character.legendary && character.legendary.skillPointCap <= character.bossSkillPoints.used + character.bossSkillPoints.available;
                    if (!legendaryAbilitySkillPointCapReached) {
                        character.bossSkillPoints.available++;
                        gotSkillPoint = true;
                    }
                }
            }
            for (let ability of character.abilities) {
                if (ability.gifted) continue;
                if (ability.bossSkillPoints !== undefined) {
                    if (ability.bossSkillPoints.used + ability.bossSkillPoints.available < bossLevel) {
                        const legendaryAbilitySkillPointCapReached = ability.legendary && ability.legendary.skillPointCap <= ability.bossSkillPoints.used + ability.bossSkillPoints.available;
                        if (legendaryAbilitySkillPointCapReached) {
                            continue;
                        }
                        ability.bossSkillPoints.available++;
                        gotSkillPoint = true;
                    }
                }
            }
            if (character.pets) {
                for (let pet of character.pets) {
                    if (pet.gifted) continue;
                    if (pet.bossSkillPoints !== undefined) {
                        if (pet.bossSkillPoints.used + pet.bossSkillPoints.available < bossLevel) {
                            const legendaryAbilitySkillPointCapReached = pet.legendary && pet.legendary.skillPointCap <= pet.bossSkillPoints.used + pet.bossSkillPoints.available;
                            if (!legendaryAbilitySkillPointCapReached) {
                                pet.bossSkillPoints.available++;
                                gotSkillPoint = true;
                            }
                        }
                    }
                    for (let ability of pet.abilities) {
                        if (ability.bossSkillPoints !== undefined) {
                            if (ability.bossSkillPoints.used + ability.bossSkillPoints.available < bossLevel) {
                                const legendaryAbilitySkillPointCapReached = ability.legendary && ability.legendary.skillPointCap <= ability.bossSkillPoints.used + ability.bossSkillPoints.available;
                                if (legendaryAbilitySkillPointCapReached) {
                                    continue;
                                }
                                ability.bossSkillPoints.available++;
                                gotSkillPoint = true;
                            }
                        }
                    }
                }
            }
            fillRandomUpgradeOptionChoices(character, game);
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
            if (ability.level) ability.level.leveling = undefined;
            toCharacter.abilities.push(ability);
        }
    }
    tradePets(fromCharacter, toCharacter, game);
    if (!toCharacter.characterClasses) toCharacter.characterClasses = [];
    if (fromCharacter.characterClasses) {
        for (let i = fromCharacter.characterClasses.length - 1; i >= 0; i--) {
            const charClass = fromCharacter.characterClasses[i];
            if (charClass.gifted) continue;
            charClass.gifted = true;
            const newClass = charClass.className;
            characterAddExistingCharacterClass(toCharacter, charClass, game);
            fromCharacter.characterClasses.splice(i, 1);
            const classFunctions = PLAYER_CHARACTER_CLASSES_FUNCTIONS[newClass];
            if (classFunctions && classFunctions.preventMultiple) {
                if (toCharacter.upgradeChoices.length && toCharacter.upgradeChoices[0].type === "ChooseClass") {
                    const index = toCharacter.upgradeChoices.findIndex(c => c.displayText === newClass);
                    if (index > -1) {
                        toCharacter.upgradeChoices.splice(index, 1);
                    }
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

export function characterAddExistingCharacterClass(character: Character, characterClass: CharacterClass, game: Game) {
    if (!character.characterClasses) character.characterClasses = [];
    character.characterClasses.push(characterClass);
    if (characterClass.characterClassUpgrades) {
        addCharacterUpgrades(characterClass.characterClassUpgrades, character, game, characterClass);
    }
}

export function executeDefaultCharacterUpgradeOption(character: Character, upgradeOptionChoice: UpgradeOption, game: Game) {
    if (upgradeOptionChoice.type === "ChooseClass") {
        PLAYER_CHARACTER_CLASSES_FUNCTIONS[upgradeOptionChoice.identifier].changeCharacterToThisClass(character, game.state.idCounter, game);
    } else if (upgradeOptionChoice.type === "Ability") {
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
            if (game.state.bossStuff.kingFightStarted && char.type === ENEMY_FIX_RESPAWN_POSITION) continue;
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
    moveCharacterTick(character, game.state.map, game.state.idCounter, game);
}

export function determineClosestCharacter(position: Position, characters: Character[], excludeKingArea: boolean = false, map: GameMap | undefined = undefined) {
    let minDistance: number = 0;
    let minDistanceCharacter: Character | null = null;

    for (let i = 0; i < characters.length; i++) {
        if (characters[i].isDead) continue;
        if (characters[i].isPet) continue;
        if (excludeKingArea && map) {
            const mapKey = positionToMapKey(characters[i], map);
            const mapChunk = map.chunks[mapKey];
            if (mapChunk.isKingAreaChunk) continue;
        }
        const distance = calculateDistance(position, characters[i]);
        if (minDistanceCharacter === null || minDistance > distance) {
            minDistance = distance;
            minDistanceCharacter = characters[i];
        }
    }
    return { minDistanceCharacter, minDistance };
}

export function resetCharacter(character: Character, game: Game) {
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
            pet.x = character.x;
            pet.y = character.y;
        }
    }
    removeCharacterDebuffs(character, game);
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

export function moveCharacterTick(character: Character, map: GameMap, idCounter: IdCounter, game: Game) {
    if (character.isRooted) return;
    if (character.isMoveTickDisabled) return;
    const newPosition = calculateCharacterMovePosition(character, map, idCounter, game);
    if (newPosition) {
        setCharacterPosition(character, newPosition, map);
    }
}

export function setCharacterPosition(character: Character, position: Position, map: GameMap) {
    if (character.mapChunkKey) mapCharacterCheckAndDoChunkChange(character, map, position.x, position.y);
    character.x = position.x;
    character.y = position.y;
}

export function calculateCharacterMovePosition(character: Character, map: GameMap, idCounter: IdCounter, game: Game) {
    if (character.isMoving) {
        return calculateMovePosition(character, character.moveDirection, getCharacterMoveSpeed(character), true, map, idCounter, game);
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

export function getCharacterMoveSpeed(character: Character): number {
    return character.baseMoveSpeed * character.moveSpeedFactor;
}

function experienceForEveryPlayersLeveling(experience: number, game: Game) {
    const playerCharacters = getPlayerCharacters(game.state.players);
    for (let character of playerCharacters) {
        experienceForCharacter(character, experience);
        for (let ability of character.abilities) {
            levelingAbilityXpGain(ability, character, experience, game);
        }
        if (character.pets) {
            for (let pet of character.pets) {
                experienceForCharacter(pet, experience);
                for (let ability of pet.abilities) {
                    levelingAbilityXpGain(ability, character, experience, game);
                }
            }
        }
    }
}

function experienceForCharacter(character: Character, experienceWorth: number) {
    if (character && character.level?.leveling
        && !character.isDead && !character.isPet
        && !(character as TamerPetCharacter).gifted
    ) {
        if (character.legendary && character.legendary.levelCap <= character.level.level) return;
        character.level.leveling.experience += experienceWorth * (character.experienceGainFactor ?? 1);
        while (character.level.leveling.experience >= character.level.leveling.experienceForLevelUp) {
            character.level.level++;
            character.level.leveling.experience -= character.level.leveling.experienceForLevelUp;
            character.level.leveling.experienceForLevelUp += Math.floor(character.level.level / 2);
            for (let abilityIt of character.abilities) {
                setCharacterAbilityLevel(abilityIt, character);
            }
        }
    }

}

function killCharacter(character: Character, game: Game, abilityIdRef: number | undefined = undefined) {
    character.isDead = true;
    if (game.state.timeFirstKill === undefined) game.state.timeFirstKill = game.state.time;
    levelingCharacterAndClassXpGain(game.state, character, game);
    if (character.type === CHARACTER_TYPE_BOSS_ENEMY) {
        playerCharactersAddBossSkillPoints(character.level?.level, game);
        experienceForEveryPlayersLeveling(character.experienceWorth, game);
    }
    if (character.type === CHARACTER_TYPE_KING_ENEMY) {
        game.state.bossStuff.bosses.push(createKingCrownCharacter(game.state.idCounter, character));
    }
    if (abilityIdRef !== undefined && character.type !== CHARACTER_TYPE_BOSS_ENEMY) {
        const ability = findAbilityById(abilityIdRef, game);
        if (ability) {
            const owner = findAbilityOwnerByAbilityId(ability.id, game);
            if (owner) {
                levelingAbilityXpGain(ability, owner, character.experienceWorth, game);
                experienceForCharacter(owner, character.experienceWorth);
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
