import { findCharacterClassById, levelingCharacterAndClassXpGain } from "./playerCharacters/levelingCharacter.js";
import { calculateMovePosition, chunkXYToMapKey, determineMapKeysInDistance, GameMap, getChunksTouchingLine, MapChunk, mapKeyToChunkXY, moveByDirectionAndDistance, positionToMapKey } from "../map/map.js";
import { Character, CHARACTER_TYPE_FUNCTIONS } from "./characterModel.js";
import { getNextWaypoint, getPathingCache, PathingCache } from "./pathing.js";
import { calculateDirection, calculateDistance, calculateDistancePointToLine, changeCharacterAndAbilityIds, getNextId, levelUpIncreaseExperienceRequirement, modulo, takeTimeMeasure } from "../game.js";
import { Position, Game, IdCounter, Camera, FACTION_ENEMY, FACTION_PLAYER } from "../gameModel.js";
import { findPlayerById, Player } from "../player.js";
import { RandomSeed, nextRandom } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, doAbilityDamageBreakDownForAbilityId, findAbilityById, findAbilityOwnerByAbilityIdInPlayers, findAbilityOwnerById, levelingAbilityXpGain, resetAllCharacterAbilities } from "../ability/ability.js";
import { addBossType, BossEnemyCharacter, CHARACTER_TYPE_BOSS_ENEMY } from "./enemy/bossEnemy.js";
import { removeCharacterDebuffs, tickCharacterDebuffs } from "../debuff/debuff.js";
import { ABILITY_NAME_LEASH, AbilityLeash, createAbilityLeash } from "../ability/abilityLeash.js";
import { executeRerollUpgradeOption, fillRandomUpgradeOptionChoices, UpgradeOption } from "./upgrade.js";
import { addPlayerCharacterType, CharacterClass, PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters/playerCharacters.js";
import { addKingType } from "./enemy/kingEnemy.js";
import { addKingCrownType } from "./enemy/kingCrown.js";
import { TAMER_PET_CHARACTER, TamerPetCharacter, tradePets } from "./playerCharacters/tamer/tamerPetCharacter.js";
import { ENEMY_FIX_RESPAWN_POSITION } from "./enemy/fixPositionRespawnEnemyModel.js";
import { addCombatlogDamageDoneEntry, addCombatlogDamageTakenEntry } from "../combatlog.js";
import { executeAbilityLevelingCharacterUpgradeOption } from "./playerCharacters/abilityLevelingCharacter.js";
import { addCharacterUpgrades } from "./upgrades/characterUpgrades.js";
import { addGodEnemyType } from "./enemy/god/godEnemy.js";
import { DEBUFF_NAME_DAMAGE_TAKEN } from "../debuff/debuffDamageTaken.js";
import { createPaintTextData } from "../floatingText.js";
import { addAreaBossType } from "./enemy/areaBoss/areaBossEnemy.js";
import { resetCurses, tickCurses } from "../curse/curse.js";
import { addPetTypeFollowAttackFunctions } from "./playerCharacters/characterPetTypeClone.js";

export function onDomLoadSetCharactersFunctions() {
    addAreaBossType();
    addBossType();
    addKingType();
    addGodEnemyType();
    addKingCrownType();
    addPlayerCharacterType();
    addPetTypeFollowAttackFunctions();
}

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

export function characterTakeDamage(character: Character, damage: number, game: Game, abilityIdRef: number | undefined, abilityName: string, abilityObject: AbilityObject | undefined = undefined) {
    if (character.state !== "alive" || character.isDamageImmune) return;
    if (game.state.bossStuff.fightWipe) return;
    const sourceDamageFactor = findSourceDamageFactor(abilityIdRef, game);
    const modifiedDamage = damage * character.damageTakenModifierFactor * sourceDamageFactor;
    if (abilityIdRef) {
        addCombatlogDamageDoneEntry(character, modifiedDamage, abilityName, abilityIdRef, game);

        doAbilityDamageBreakDownForAbilityId(damage, abilityIdRef, abilityObject, abilityName, game);
        const damageTakenDebuff = character.debuffs.find(d => d.name === DEBUFF_NAME_DAMAGE_TAKEN);
        if (damageTakenDebuff && damageTakenDebuff.abilityIdRef !== undefined) {
            doAbilityDamageBreakDownForAbilityId(damage, damageTakenDebuff.abilityIdRef, undefined, DEBUFF_NAME_DAMAGE_TAKEN, game);
        }
    }
    if (character.shield > 0) {
        character.shield -= modifiedDamage;
        if (character.shield < 0) {
            character.hp += character.shield;
            character.shield = 0;
        }
    } else {
        character.hp -= modifiedDamage;
    }
    addCombatlogDamageTakenEntry(character, modifiedDamage, abilityName, abilityIdRef, game);
    if (character.hp <= 0) {
        killCharacter(character, game, abilityIdRef);
    }
    if (!game.debug.disableDamageNumbers) {
        const textPos = { x: character.x, y: character.y - character.height / 2 - 15 };
        const fontSize = character.faction === FACTION_PLAYER ? "20" : "12";
        const textColor = character.faction === FACTION_PLAYER ? "blue" : "black";
        game.UI.displayTextData.push(createPaintTextData(textPos, modifiedDamage.toFixed(0), textColor, fontSize, game.state.time));
        if (game.UI.displayTextData.length > 100) game.UI.displayTextData.splice(0, 1);
    }
    if (character.faction === FACTION_ENEMY) character.wasHitRecently = true;
}

function findSourceDamageFactor(abilityIdRef: number | undefined, game: Game): number {
    let sourceDamageFactor = 1;
    if (abilityIdRef !== undefined) {
        const owner = findAbilityOwnerById(abilityIdRef, game);
        if (owner?.damageDoneFactor) sourceDamageFactor = owner.damageDoneFactor;
    }
    return sourceDamageFactor;
}

export function characterAddShield(character: Character, shieldValue: number) {
    if (character.state === "dead") return;
    character.shield += shieldValue;
    if (character.shield > character.maxShieldFactor * character.maxHp) {
        character.shield = character.maxShieldFactor * character.maxHp
    }
}

export function playerCharactersAddBossSkillPoints(bossLevel: number | undefined, game: Game, characters: Character[] | undefined = undefined) {
    if (bossLevel === undefined) return;
    const playerCharacters: Character[] = characters ?? getPlayerCharacters(game.state.players);
    for (let character of playerCharacters) {
        let gotSkillPoint = false;
        if (!character.characterClasses) continue;
        for (let charClass of character.characterClasses) {
            if (charClass.capped) continue;
            for (let ability of character.abilities) {
                if (charClass.id !== ability.classIdRef) continue;
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
                    if (pet.type !== TAMER_PET_CHARACTER) continue;
                    const tamerPet = pet as TamerPetCharacter;
                    if (charClass.id !== tamerPet.classIdRef) continue;
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
        }
        fillRandomUpgradeOptionChoices(character, game);
    }
}

export function canCharacterTradeAbilityOrPets(character: Character): boolean {
    for (let ability of character.abilities) {
        if (ability.tradable) return true;
    }
    if (character.pets) {
        for (let pet of character.pets) {
            if ((pet as any).tradable) return true;
        }
    }
    return false;
}

export function characterTradeAbilityAndPets(fromCharacter: Character, toCharacter: Character, game: Game) {
    const indexSplicePosition = toCharacter.abilities.length;
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
            ability.disabled = false;
            if (ability.bossSkillPoints != undefined) delete ability.bossSkillPoints;
            if (ability.level) delete ability.level.leveling;
            toCharacter.abilities.splice(indexSplicePosition, 0, ability);
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
                if (toCharacter.upgradeChoices.choices.length && toCharacter.upgradeChoices.choices[0].type === "ChooseClass") {
                    const index = toCharacter.upgradeChoices.choices.findIndex(c => c.displayText === newClass);
                    if (index > -1) {
                        toCharacter.upgradeChoices.choices.splice(index, 1);
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
        delete leash.leashedToOwnerId;
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
    } else if (upgradeOptionChoice.type === "Reroll") {
        executeRerollUpgradeOption(character, game);
    }
}

export function setCharacterAbilityLevel(ability: Ability, character: Character) {
    const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
    if (character.level?.leveling && abilityFunctions && abilityFunctions.setAbilityToLevel) {
        const abilityLevel = Math.max(1, character.level.level);
        abilityFunctions.setAbilityToLevel(ability, abilityLevel);
    }
}

export function tickMapCharacters(map: GameMap, game: Game) {
    takeTimeMeasure(game.debug, "", "tickMapCharacters");
    const pathingCache = getPathingCache(game);
    const allMapCharacters: Character[] = [];
    for (let i = 0; i < map.activeChunkKeys.length; i++) {
        const chunk = map.chunks[map.activeChunkKeys[i]];
        allMapCharacters.push(...chunk.characters);
    }
    tickCharacters(allMapCharacters, game, pathingCache);
    collisionDetectionTick(game);
    takeTimeMeasure(game.debug, "tickMapCharacters", "");
}

export function tickCharacters(characters: (Character | undefined)[], game: Game, pathingCache: PathingCache | null, petOwner: Character | undefined = undefined) {
    for (let j = characters.length - 1; j >= 0; j--) {
        const char = characters[j];
        if (!char) continue;
        if ((game.state.bossStuff.kingFightStartedTime !== undefined || game.state.bossStuff.godFightStartedTime !== undefined) && char.type === ENEMY_FIX_RESPAWN_POSITION) continue;
        const functions = CHARACTER_TYPE_FUNCTIONS[char.type];
        if (functions?.tickFunction) {
            functions.tickFunction(char, game, pathingCache);
        } else if (functions?.tickPetFunction && petOwner) {
            functions.tickPetFunction(char, petOwner, game, pathingCache);
        } else {
            tickDefaultCharacter(char, game, pathingCache);
        }
        if (char.state === "alive" || char.state === "petPlayer") {
            for (let ability of char.abilities) {
                if (ability.disabled) continue;
                const tickAbility = ABILITIES_FUNCTIONS[ability.name].tickAbility;
                if (tickAbility) tickAbility(char, ability, game);
            }
            tickCharacterDebuffs(char, game);
            tickCharacterPets(char, game, pathingCache);
            tickCurses(char, game);
        }
        if (char.state === "dying") {
            if (char.deathAnimationStartTimer !== undefined
                && char.deathAnimationStartTimer + char.deathAnimationDuration! < game.state.time
            ) {
                if (char.willTurnToPetOnDeath) {
                    turnCharacterToPet(char, game);
                } else {
                    char.state = "dead";
                }
                if (game.state.bossStuff.godFightStartedTime !== undefined || game.state.bossStuff.kingFightStartedTime !== undefined) {
                    const countAlive = countAlivePlayerCharacters(game.state.players, game.state.time);
                    if (countAlive === 0) {
                        game.state.bossStuff.fightWipe = true;
                    }
                }
            }
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
        if (player.character.state === "alive") {
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
    moveCharacterTick(character, game.state.map, game.state.idCounter, game);
}

export function determineClosestCharacter(position: Position, characters: Character[], excludeKingArea: boolean = false, map: GameMap | undefined = undefined) {
    let minDistance: number = 0;
    let minDistanceCharacter: Character | null = null;

    for (let i = 0; i < characters.length; i++) {
        if (characters[i].state !== "alive") continue;
        if (excludeKingArea && map) {
            const mapKey = positionToMapKey(characters[i], map);
            const mapChunk = map.chunks[mapKey];
            if (mapChunk.isKingAreaChunk || mapChunk.isGodAreaChunk) continue;
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
    character.state = "alive";
    character.shield = 0;
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
    resetCurses(character);
}

export function determineCharactersInDistance(position: Position, map: GameMap | undefined, players: Player[], bosses: BossEnemyCharacter[] | undefined, maxDistance: number, notFaction: string | undefined = undefined, onlyAlive: boolean = false): Character[] {
    const result: Character[] = [];
    if (notFaction === undefined || FACTION_ENEMY !== notFaction) {
        if (map) {
            const mapKeysInDistance = determineMapKeysInDistance(position, map, maxDistance, true, false);
            for (let i = 0; i < mapKeysInDistance.length; i++) {
                const chunk = map.chunks[mapKeysInDistance[i]];
                if (chunk === undefined) continue;
                const characters: Character[] = chunk.characters;
                for (let j = 0; j < characters.length; j++) {
                    if (onlyAlive && characters[j].state === "dead") continue;
                    const distance = calculateDistance(position, characters[j]);
                    if (maxDistance >= distance) {
                        result.push(characters[j]);
                    }
                }
            }
        }
        if (bosses) {
            for (let boss of bosses) {
                if (onlyAlive && boss.state === "dead") continue;
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
            if (onlyAlive && player.character.state === "dead") continue;
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
        if (players[i].character.state === "alive") {
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

export function countAlivePlayerCharacters(players: Player[], gameTime: number) {
    let counter = 0;
    for (let i = players.length - 1; i >= 0; i--) {
        const player = players[i];
        if (player.character.state === "alive" || player.character.state === "dying") {
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
    character.state = "petPlayer";
    character.hp = character.maxHp;
    let newPlayerOwnerId: number | undefined = undefined;
    const possibleOwnerCharacters: Character[] = [];
    for (let player of game.state.players) {
        if (player.character.state === "alive") {
            possibleOwnerCharacters.push(player.character);
        }
    }
    if (possibleOwnerCharacters.length > 0) {
        const randomOwnerIndex = Math.floor(nextRandom(game.state.randomSeed) * possibleOwnerCharacters.length);
        newPlayerOwnerId = possibleOwnerCharacters[randomOwnerIndex].id;
        character.x = possibleOwnerCharacters[randomOwnerIndex].x;
        character.y = possibleOwnerCharacters[randomOwnerIndex].y;
        character.abilities.push(createAbilityLeash(game.state.idCounter, undefined, 100, newPlayerOwnerId));
    }
}

export function moveCharacterTick(character: Character, map: GameMap, idCounter: IdCounter, game: Game) {
    if (character.isRooted && !character.isRootImmune) return;
    if (character.state === "dying") return;
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

export function cappCharacter(character: Character) {
    if (character.characterClasses) {
        for (let charClass of character.characterClasses) {
            if (charClass.legendary) continue;
            charClass.capped = true;
        }
    }
}

export function experienceForEveryPlayersLeveling(experience: number, game: Game, characters: Character[] | undefined = undefined) {
    const playerCharacters = characters ?? getPlayerCharacters(game.state.players);
    for (let character of playerCharacters) {
        if (!character.characterClasses) continue;
        for (let charClass of character.characterClasses) {
            if (charClass.capped) continue;
            for (let ability of character.abilities) {
                if (ability.classIdRef !== charClass.id) continue;
                levelingAbilityXpGain(ability, character, experience, game);
            }
            if (character.pets) {
                for (let pet of character.pets) {
                    if (pet.type !== TAMER_PET_CHARACTER) continue;
                    const tamerPet = pet as TamerPetCharacter;
                    if (tamerPet.classIdRef !== charClass.id) continue;
                    experienceForCharacter(pet, experience);
                    for (let ability of pet.abilities) {
                        levelingAbilityXpGain(ability, character, experience, game);
                    }
                }
            }
        }
    }
}

function experienceForCharacter(character: Character, experienceWorth: number) {
    if (character && character.level?.leveling) {
        if (character.legendary && character.legendary.levelCap <= character.level.level) return;
        character.level.leveling.experience += experienceWorth * (character.experienceGainFactor ?? 1);
        while (character.level.leveling.experience >= character.level.leveling.experienceForLevelUp) {
            character.level.level++;
            character.level.leveling.experience -= character.level.leveling.experienceForLevelUp;
            levelUpIncreaseExperienceRequirement(character.level);
            for (let abilityIt of character.abilities) {
                setCharacterAbilityLevel(abilityIt, character);
            }
        }
    }

}

function onCharacterTypeKill(character: Character, game: Game) {
    const characterTypeFuntions = CHARACTER_TYPE_FUNCTIONS[character.type];
    if (!characterTypeFuntions) return;
    if (characterTypeFuntions.onCharacterKill) characterTypeFuntions.onCharacterKill(character, game);
}

function killCharacter(character: Character, game: Game, abilityIdRef: number | undefined = undefined) {
    character.state = "dead";

    if (game.state.timeFirstKill === undefined) game.state.timeFirstKill = game.state.time;
    levelingCharacterAndClassXpGain(game.state, character.experienceWorth, game);
    onCharacterTypeKill(character, game);
    if (abilityIdRef !== undefined && character.type !== CHARACTER_TYPE_BOSS_ENEMY) {
        const ability = findAbilityById(abilityIdRef, game);
        if (ability) {
            const owner = findAbilityOwnerByAbilityIdInPlayers(ability.id, game);
            if (owner) {
                const playerChar = owner.petOwner ? owner.petOwner : owner.abilityOwner;
                const classRefId = owner.petOwner ? (owner.abilityOwner as TamerPetCharacter).classIdRef : ability.classIdRef;
                const charClass = findCharacterClassById(playerChar, classRefId);
                if (charClass && !charClass.capped) {
                    levelingAbilityXpGain(ability, owner.abilityOwner, character.experienceWorth, game);
                    experienceForCharacter(owner.abilityOwner, character.experienceWorth);
                }
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

function collisionDetectionTick(game: Game) {
    takeTimeMeasure(game.debug, "", "tickMapCharacters Collision");
    for (let i = 0; i < game.state.map.activeCollisionCheckChunkKeys.length; i++) {
        const chunkKey = game.state.map.activeCollisionCheckChunkKeys[i];
        const currentChunk = game.state.map.chunks[chunkKey];
        const chunkSize = game.state.map.tileSize * game.state.map.chunkLength;
        const tileEnemies: Character[][][] = [];
        const maxIterateCharacters = 500;
        const maxIterateCollisionChecksPetTile = 30;
        const iteratorCap = Math.min(currentChunk.characters.length, maxIterateCharacters);
        for (let i = 0; i < iteratorCap; i++) {
            const character = currentChunk.characters[i];
            const tileX = Math.floor(modulo(character.x, chunkSize) / game.state.map.tileSize);
            const tileY = Math.floor(modulo(character.y, chunkSize) / game.state.map.tileSize);
            if (!tileEnemies[tileX]) tileEnemies[tileX] = [];
            if (!tileEnemies[tileX][tileY]) tileEnemies[tileX][tileY] = [];
            tileEnemies[tileX][tileY].push(character);
        }
        for (let i = 0; i < tileEnemies.length; i++) {
            if (!tileEnemies[i]) continue;
            for (let j = 0; j < tileEnemies[i].length; j++) {
                if (!tileEnemies[i][j]) continue;
                if (tileEnemies[i][j].length <= 1) continue;
                const enemies = tileEnemies[i][j];
                const checkIteratorCap = Math.min(enemies.length, maxIterateCollisionChecksPetTile);
                for (let enemyIndex1 = 0; enemyIndex1 < checkIteratorCap; enemyIndex1++) {
                    const enemy1 = tileEnemies[i][j][enemyIndex1];
                    for (let enemyIndex2 = enemyIndex1 + 1; enemyIndex2 < checkIteratorCap; enemyIndex2++) {
                        const enemy2 = tileEnemies[i][j][enemyIndex2];
                        const distance = calculateDistance(enemy1, enemy2);
                        const collistionRadius = (enemy1.width / 2 + enemy2.width / 2) * 0.75;
                        if (distance < collistionRadius) {
                            const moveDirection = calculateDirection(enemy1, enemy2);
                            const collisionMoveDistance = (collistionRadius - distance) / 2;
                            const enemy1Pos = { x: enemy1.x, y: enemy1.y };
                            const enemy2Pos = { x: enemy2.x, y: enemy2.y };
                            moveByDirectionAndDistance(enemy1Pos, moveDirection + Math.PI, collisionMoveDistance, true, game.state.map, game.state.idCounter, game);
                            moveByDirectionAndDistance(enemy2Pos, moveDirection, collisionMoveDistance, true, game.state.map, game.state.idCounter, game);
                            setCharacterPosition(enemy1, enemy1Pos, game.state.map);
                            setCharacterPosition(enemy2, enemy2Pos, game.state.map);
                            break;
                        }
                    }
                }
            }
        }
    }
    takeTimeMeasure(game.debug, "tickMapCharacters Collision", "");
}
