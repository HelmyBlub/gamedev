import { cappCharacter, changeCharacterId, countAlivePlayerCharacters, findAndSetNewCameraCharacterId, findCharacterById, findMyCharacter, getPlayerCharacters, resetCharacter, tickCharacters } from "./character/character.js";
import { paintAll } from "./gamePaint.js";
import { addPlayerMoney, createDefaultKeyBindings1, createDefaultUiKeyBindings, createPlayerWithPlayerCharacter, findNearesPastPlayerCharacter, findPlayerByCharacterId, gameInitPlayers, isAutoUpgradeActive } from "./player.js";
import { MOUSE_ACTION, RESTART_HOLD_TIME, UPGRADE_ACTIONS, executeUiAction, tickPlayerInputs } from "./input/playerInput.js";
import { Position, GameState, Game, IdCounter, Debugging, ClientInfo, GameVersion } from "./gameModel.js";
import { changeTileIdOfMapChunk, createMap, determineMapKeysInDistance, GameMap, initKingArea, mapKeyToChunkXY, mousePositionToMapPosition, tickActiveMapChunks } from "./map/map.js";
import { Character } from "./character/characterModel.js";
import { generateMissingChunks, pastCharactersMapTilePositions } from "./map/mapGeneration.js";
import { createFixPositionRespawnEnemiesOnInit } from "./character/enemy/fixPositionRespawnEnemyModel.js";
import { COMMAND_COMPARE_STATE, COMMAND_COMPARE_STATE_HASH, CommandRestart, handleCommand } from "./commands.js";
import { ABILITIES_FUNCTIONS, tickAbilityObjects } from "./ability/ability.js";
import { chunkGraphRectangleSetup, garbageCollectPathingCache, getPathingCache } from "./character/pathing.js";
import { createObjectDeathCircle } from "./ability/abilityDeathCircle.js";
import { checkForBossSpawn, tickBossCharacters } from "./character/enemy/bossEnemy.js";
import { autoPlay } from "./test/autoPlay.js";
import { replayGameEndAssert, replayNextInReplayQueue } from "./test/gameTest.js";
import { checkForKingAreaTrigger } from "./map/mapKingArea.js";
import { calculateHighscoreOnGameEnd } from "./highscores.js";
import { setPlayerAsKing, startKingFight } from "./character/enemy/kingEnemy.js";
import { ABILITY_NAME_FEED_PET } from "./ability/petTamer/abilityFeedPet.js";
import { ABILITY_NAME_LOVE_PET } from "./ability/petTamer/abilityLovePet.js";
import { COMMAND_RESTART } from "./globalVars.js";
import { mapObjectPlaceClassBuilding } from "./map/mapObjectClassBuilding.js";
import { findMainCharacterClass, hasPlayerChoosenStartClassUpgrade, playerCharacterClassGetAverageLevel } from "./character/playerCharacters/playerCharacters.js";
import { copyAndSetPermanentDataForReplay, localStorageLoad, localStorageSaveAll, setPermanentDataFromReplayData } from "./permanentData.js";
import { MapTileObject, findNearesInteractableMapChunkObject } from "./map/mapObjects.js";
import { classBuildingCheckAllPlayerForLegendaryAbilitiesAndMoveBackToBuilding } from "./map/buildings/classBuilding.js";
import { mapObjectPlaceUpgradeBuilding } from "./map/mapObjectUpgradeBuilding.js";
import { Leveling } from "./character/playerCharacters/levelingCharacter.js";
import { ABILITY_NAME_LEASH } from "./ability/abilityLeash.js";
import { doDamageMeterSplit } from "./combatlog.js";
import { achievementCheckOnGameEnd, achievementCheckOnGameTick } from "./achievements/achievements.js";
import { controllerInput } from "./input/inputController.js";
import { mapModifierOnGameInit, tickMapModifier } from "./map/modifiers/mapModifier.js";
import { areaSpawnOnDistanceCheckFightStart, areaSpawnOnDistanceGetRetrySpawn, areaSpawnOnDistanceRetry, createAreaSpawnOnDistance } from "./map/mapAreaSpawnOnDistance.js";
import { MAP_AREA_SPAWN_ON_DISTANCE_GOD } from "./map/mapGodArea.js";
import { MAP_AREA_SPAWN_ON_DISTANCE_CURSE_CLEANSE } from "./map/mapCurseCleanseArea.js";
import { removeCurses } from "./curse/curse.js";
import { displayTextAtCameraPosition } from "./floatingText.js";
import { GAME_MODE_BASE_DEFENSE, gameModeBaseDefenseTick } from "./gameModeBaseDefense.js";

/** values between - Math.PI * 1.5 to Math.PI*0.5 */
export function calculateDirection(startPos: Position, targetPos: Position): number {
    let direction = 0;

    const yDiff = (startPos.y - targetPos.y);
    const xDiff = (startPos.x - targetPos.x);

    if (xDiff >= 0) {
        direction = - Math.PI + Math.atan(yDiff / xDiff);
    } else if (yDiff < 0) {
        direction = - Math.atan(xDiff / yDiff) + Math.PI / 2;
    } else {
        direction = - Math.atan(xDiff / yDiff) - Math.PI / 2;
    }
    if (isNaN(direction)) return 0;
    return direction;
}

export function modulo(number: number, mod: number): number {
    return ((number % mod) + mod) % mod;
}

export function getNextId(idCounter: IdCounter) {
    return idCounter.nextId++;
}

export function gameRestart(game: Game) {
    classBuildingCheckAllPlayerForLegendaryAbilitiesAndMoveBackToBuilding(game);
    if (game.testing.replay) {
        setReplaySeeds(game);
        setPermanentDataFromReplayData(game);
    }
    if (game.testing.record) {
        const record = game.testing.record;
        if (record.restartPlayerInput) record.data.replayPlayerInputs.push(record.restartPlayerInput);
        const restart = record.data.replayPlayerInputs[0] as CommandRestart;
        if (restart.command && restart.command === COMMAND_RESTART) {
            restart.testRandomStartSeed = game.state.randomSeed.seed;
            restart.testEnemyTypeDirectionSeed = game.state.enemyTypeDirectionSeed;
        }
        copyAndSetPermanentDataForReplay(record.data.permanentData, game);
    }
    gameInit(game);
}

export function closeGame(game: Game) {
    if (game.multiplayer.websocket) {
        game.multiplayer.websocket.close();
    }
    game.closeGame = true;
    console.log("closing game");
}

export function gameInit(game: Game) {
    game.state.restartCounter++;
    game.state.gameMode = undefined;
    game.state.gameModeData = undefined;
    game.state.map.areaSpawnOnDistance = [];
    if (game.state.activeCheats && game.state.activeCheats.indexOf("closeKingArea") !== -1) {
        initKingArea(game.state.map, 1_000);
    } else {
        initKingArea(game.state.map, 20_000);
    }
    if (game.state.activeCheats && game.state.activeCheats.indexOf("closeSpawnAreas") !== -1) {
        createAreaSpawnOnDistance(MAP_AREA_SPAWN_ON_DISTANCE_GOD, game.state.map, 4_000, game.state.idCounter);
        createAreaSpawnOnDistance(MAP_AREA_SPAWN_ON_DISTANCE_CURSE_CLEANSE, game.state.map, 7_000, game.state.idCounter);
    } else {
        createAreaSpawnOnDistance(MAP_AREA_SPAWN_ON_DISTANCE_GOD, game.state.map, 40_000, game.state.idCounter);
        createAreaSpawnOnDistance(MAP_AREA_SPAWN_ON_DISTANCE_CURSE_CLEANSE, game.state.map, 60_000, game.state.idCounter);
    }
    game.state.abilityObjects = [];
    game.state.killCounter = 0;
    game.state.ended = false;
    game.state.triggerRestart = false;
    game.state.restartAfterTick = false;
    game.state.time = 0;
    game.state.timeFirstKill = undefined;
    game.state.playerInputs = [];
    if (game.state.bossStuff.closedOfKingAreaEntrance) {
        const entrance = game.state.bossStuff.closedOfKingAreaEntrance;
        changeTileIdOfMapChunk(entrance.chunkX, entrance.chunkY, entrance.tileX, entrance.tileY, entrance.tileId, game);
        game.state.bossStuff.closedOfKingAreaEntrance = undefined;
    }
    game.state.bossStuff.bosses = [];
    game.state.bossStuff.bossLevelCounter = 1;
    game.state.bossStuff.kingFightStartedTime = undefined;
    game.state.bossStuff.areaSpawnFightStartedTime = undefined;
    game.state.bossStuff.fightWipe = undefined;
    game.state.bossStuff.normalModeMoneyAwarded = undefined;
    game.state.deathCircleCreated = false;
    game.state.paused = false;
    game.state.enemyTypeDirectionSeed += 1;
    game.performance = { chunkGraphRectangles: {} };
    game.UI.displayTextData = [];
    game.UI.moneyGainedThisRun = [];
    game.UI.stackTextsData.textStack = [];
    game.UI.displayMoreInfos = false;
    game.UI.rectangles = {};
    if (game.UI.restartKeyPressTime) {
        game.UI.restartKeyPressTime = performance.now();
    } else {
        game.UI.restartKeyPressTime = undefined;
    }
    if (game.UI.playerCharacterLevelUI) game.UI.playerCharacterLevelUI.levelUI = [];
    game.testing.saveStates.autoSaves.nextSaveStateTime = 10000;
    game.state.map.activeChunkKeys = [];
    game.state.map.chunks = {};
    game.additionalPaints = undefined;
    createFixPositionRespawnEnemiesOnInit(game);
    gameInitPlayers(game);
    game.multiplayer.autosendMousePosition.nextTime = 0;
    game.multiplayer.autosendMousePosition.sendForOwners = [];
    if (game.multiplayer.websocket !== null) {
        game.multiplayer.maxServerGameTime = 0;
        if (game.state.activeCheats && game.state.activeCheats.indexOf("sendDebugDataMultipalyer") !== -1) {
            game.multiplayer.gameStateCompare = {
                compareInterval: 3000,
                maxKeep: 10,
                timeAndHash: [],
                stateTainted: false,
            };
        } else {
            game.multiplayer.gameStateCompare = undefined;
        }
        if (game.multiplayer.gameStateCompare) {
            game.multiplayer.gameStateCompare.timeAndHash = [];
            game.multiplayer.gameStateCompare.nextCompareTime = undefined;
            game.multiplayer.gameStateCompare.stateCompareSend = undefined;
        }
        game.state.playerInputs = game.multiplayer.cachePlayerInputs!;
        if (game.multiplayer.lastClientWhoRestartedId) {
            const clientInfo = findClientInfo(game.multiplayer.lastClientWhoRestartedId, game);
            if (clientInfo) {
                displayTextAtCameraPosition(`Player ${clientInfo.name} restarted`, game);
            }
            game.multiplayer.lastClientWhoRestartedId = undefined;
        }
    }
    const playerAlphaInput: HTMLInputElement = document.getElementById("playerGlobalAlphaMultiplier") as HTMLInputElement;
    if (playerAlphaInput) {
        game.UI.playerGlobalAlphaMultiplier = parseInt(playerAlphaInput.value) / 100;
    }
    resetPastCharacters(game);
    mapModifierOnGameInit(game);
    doDamageMeterSplit("1", game);
}

export function resetGameNonStateData(game: Game) {
    game.performance = { chunkGraphRectangles: {} };
    game.UI.displayTextData = [];
    game.multiplayer.autosendMousePosition.nextTime = 0;
    for (let i = 0; i < game.state.clientInfos.length; i++) {
        if (game.multiplayer.myClientId === game.state.clientInfos[i].id) {
            setClientDefaultKeyBindings(game);
        }
    }
    findAndSetNewCameraCharacterId(game.camera, game.state.players, game.multiplayer.myClientId);
}

export function setClientDefaultKeyBindings(game: Game) {
    const defaultKeys = createDefaultKeyBindings1();
    game.clientKeyBindings = {
        moveKeys: defaultKeys.moveKeys,
        keyCodeToActionPressed: defaultKeys.keymap,
        keyCodeToUiAction: createDefaultUiKeyBindings(),
    };
}

export function getCameraPosition(game: Game): Position {
    let cameraPosition: Position = { x: 0, y: 0 };
    if (game.camera.characterId !== undefined) {
        const character = findCharacterById(getPlayerCharacters(game.state.players), game.camera.characterId);
        if (character !== null) cameraPosition = { x: character.x, y: character.y };
    }

    return cameraPosition;
}

export function calculateDistance(objectA: { x: number, y: number }, objectB: { x: number, y: number }) {
    const xDiff = objectA.x - objectB.x;
    const yDiff = objectA.y - objectB.y;
    return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
}

export function calcNewPositionMovedInDirection(position: Position, direction: number, range: number): Position {
    return {
        x: position.x + Math.cos(direction) * range,
        y: position.y + Math.sin(direction) * range,
    }
}

export function takeTimeMeasure(debug: Debugging | undefined, endName: string, startName: string, timeOffset: number = 0) {
    if (debug === undefined || debug.takeTimeMeasures !== true) return;
    if (debug.timeMeasuresData === undefined) debug.timeMeasuresData = [];
    const timeNow = performance.now() + timeOffset;
    if (endName !== "") {
        const data = debug.timeMeasuresData?.find((e) => e.name === endName);
        if (data === undefined) return;
        data.timeMeasures.push(timeNow - data.tempTime);
        if (data.timeMeasures.length > 30) data.timeMeasures.shift();
    }
    if (startName !== "") {
        let data = debug.timeMeasuresData?.find((e) => e.name === startName);
        if (data === undefined) {
            data = { name: startName, timeMeasures: [], tempTime: timeNow };
            debug.timeMeasuresData!.push(data);
        } else {
            data.tempTime = timeNow;
        }
    }
}

export async function runner(game: Game) {
    while (!game.closeGame) {
        const sleepTime = tickAndPaint(game);
        await sleep(sleepTime);
    }
}

async function sleep(milliseconds: number) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

export function getRelativeMousePoistion(event: MouseEvent): Position {
    const target = event.currentTarget as HTMLElement;
    return { x: event.x - target.offsetLeft, y: event.y - target.offsetTop };
}

export function setRelativeMousePosition(event: MouseEvent, game: Game) {
    game.mouseRelativeCanvasPosition = getRelativeMousePoistion(event);
}

export function findClientInfo(clientId: number, game: Game): ClientInfo | undefined {
    for (let clientInfo of game.state.clientInfos) {
        if (clientInfo.id === clientId) {
            return clientInfo;
        }
    }
    return undefined;
}

export function findClientInfoByCharacterId(characterId: number, game: Game): ClientInfo | undefined {
    const player = findPlayerByCharacterId(game.state.players, characterId);
    if (player) return findClientInfo(player.clientId, game);
    return undefined;
}

export function getTimeSinceFirstKill(gameState: GameState): number {
    if (gameState.timeFirstKill === undefined) return 0;
    return gameState.time - gameState.timeFirstKill;
}

export function createGamePlayerHash(state: GameState) {
    const gameStateString = JSON.stringify(state.players) + "," + JSON.stringify(state.idCounter);
    const result = createHash(gameStateString);
    return result;
}

export function createHash(str: string, seed: number = 0): number {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

export function calculateDistancePointToLine(point: Position, linestart: Position, lineEnd: Position) {
    const A = point.x - linestart.x;
    const B = point.y - linestart.y;
    const C = lineEnd.x - linestart.x;
    const D = lineEnd.y - linestart.y;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq != 0) //in case of 0 length line
        param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
        xx = linestart.x;
        yy = linestart.y;
    }
    else if (param > 1) {
        xx = lineEnd.x;
        yy = lineEnd.y;
    }
    else {
        xx = linestart.x + param * C;
        yy = linestart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

export function deepCopy<Type>(object: Type): Type {
    if (object === undefined) return object;
    const json = JSON.stringify(object);
    return JSON.parse(json);
}

export function endGame(game: Game, isKingKill: boolean = false, isGodKill: boolean = false) {
    game.state.ended = true;
    addPlayerMoney(game, isKingKill, isGodKill);
    achievementCheckOnGameEnd(game.state.achievements, game);
    const newScore = calculateHighscoreOnGameEnd(game);
    if (isKingKill) {
        setPlayerAsKing(game);
        mapObjectPlaceClassBuilding(game);
    } else {
        savePlayerCharatersAsPastCharacters(game);
    }
    mapObjectPlaceUpgradeBuilding(game);
    classBuildingCheckAllPlayerForLegendaryAbilitiesAndMoveBackToBuilding(game);

    endGameReplayStuff(game, newScore);
    if (game.testing.record) {
        if (game.testing.record.data.replayPlayerInputs) {
            game.testing.record.data.gameEndAsserts = [];
            game.testing.record.data.gameEndAsserts.push({ type: "score", data: newScore });
            game.testing.record.data.gameEndAsserts.push({ type: "killCounter", data: game.state.killCounter });
            if (!game.testing.replay) {
                game.testing.lastReplay = deepCopy(game.testing.record.data);
            }
        }
    }
    localStorageSaveAll(game);
}

export function changeCharacterAndAbilityIds(character: Character, idCounter: IdCounter) {
    changeCharacterId(character, idCounter);
    for (let ability of character.abilities) {
        ability.id = getNextId(idCounter);
    }
}

export function saveCharacterAsPastCharacter(character: Character, game: Game) {
    if (game.testing.replay) return;
    const newPastCharacter: Character = deepCopy(character);
    removeCurses(newPastCharacter, game);
    for (let i = newPastCharacter.abilities.length - 1; i >= 0; i--) {
        const ability = newPastCharacter.abilities[i];
        ability.disabled = true;
        if (ability.legendary) {
            newPastCharacter.abilities.splice(i, 1);
        }
    }
    newPastCharacter.curses = undefined;
    resetCharacter(newPastCharacter, game);
    changeCharacterId(newPastCharacter, game.state.idCounter);
    if (newPastCharacter.pets) {
        for (let i = newPastCharacter.pets.length - 1; i >= 0; i--) {
            const pet = newPastCharacter.pets[i];
            if (pet.legendary) {
                newPastCharacter.pets.splice(i, 1);
                continue;
            }
            for (let ability of pet.abilities) {
                ability.disabled = true;
            }
        }
    }
    if (newPastCharacter.characterClasses) {
        for (let i = newPastCharacter.characterClasses.length - 1; i >= 0; i--) {
            const charClass = newPastCharacter.characterClasses[i];
            if (charClass.legendary) newPastCharacter.characterClasses.splice(i, 1);
        }
    }
    newPastCharacter.isUnMoveAble = true;
    const pastCharacters = game.state.pastPlayerCharacters.characters;
    cappCharacter(newPastCharacter);
    pastCharacters.push(newPastCharacter);

    for (let i = 0; i < pastCharacters.length; i++) {
        while (!pastCharacters[i]) {
            pastCharacters.splice(i, 1);
        }
    }

    if (pastCharacters.length > game.state.pastPlayerCharacters.maxNumber) {
        let lowestAvgLevelPastCharacterIndex = 0;
        let lowestAvgLevel = Number.MAX_VALUE;
        for (let i = 0; i < pastCharacters.length; i++) {
            const pastChar = pastCharacters[i];
            if (!pastChar) continue;
            const charClass = findMainCharacterClass(pastChar);
            let currAvgLevel = 0;
            if (charClass) currAvgLevel = playerCharacterClassGetAverageLevel(pastChar, charClass);
            if (currAvgLevel < lowestAvgLevel) {
                lowestAvgLevel = currAvgLevel;
                lowestAvgLevelPastCharacterIndex = i;
            }
        }
        pastCharacters.splice(lowestAvgLevelPastCharacterIndex, 1);
    }

    for (let i = 0; i < pastCharacters.length; i++) {
        const pastCharacter = pastCharacters[i];
        if (!pastCharacter) continue;
        if (pastCharactersMapTilePositions.length > i) {
            const nextTileInfo = pastCharactersMapTilePositions[i];
            pastCharacter.x = nextTileInfo.x * 40 + 20;
            pastCharacter.y = nextTileInfo.y * 40 + 20;
            pastCharacter.moveDirection = nextTileInfo.lookDirection;
            if (pastCharacter.pets) {
                for (let pet of pastCharacter.pets) {
                    pet.x = nextTileInfo.x * 40 + 20;
                    pet.y = nextTileInfo.y * 40 + 20;
                }
            }
        } else {
            pastCharacter.x = i * 20;
            pastCharacter.y = 0;
            if (pastCharacter.pets) {
                for (let pet of pastCharacter.pets) {
                    pet.x = i * 20;
                    pet.y = 0;
                }
            }
        }
    }
}

export function autoSendMousePositionHandler(ownerId: number, identifier: string, activateAutoSend: boolean, castPosition: Position | undefined, game: Game) {
    const clientInfo = findClientInfoByCharacterId(ownerId, game);
    if (!clientInfo) return;
    if (clientInfo.id === game.multiplayer.myClientId) {
        const sendForOwners = game.multiplayer.autosendMousePosition.sendForOwners;
        const alreadyAddedIndex = sendForOwners.findIndex((e) => e === identifier);
        if (activateAutoSend) {
            if (alreadyAddedIndex === -1) {
                sendForOwners.push(identifier);
            }
        } else {
            if (alreadyAddedIndex !== -1) {
                sendForOwners.splice(alreadyAddedIndex, 1);
            }
        }
    }
    if (castPosition) clientInfo.lastMousePosition = castPosition;
}

export function findClosestInteractable(character: Character | undefined, game: Game): { pastCharacter?: Character, mapObject?: MapTileObject } | undefined {
    if (!character) return undefined;
    const pastCharacter = findNearesPastPlayerCharacter(character, game);
    const interactableMapObject = findNearesInteractableMapChunkObject(character, game);
    if (pastCharacter && interactableMapObject) {
        const distancePastChar = calculateDistance(pastCharacter, character);
        const tileSize = game.state.map.tileSize;
        const mapObjectPosition: Position = { x: interactableMapObject.x * tileSize, y: interactableMapObject.y * tileSize };
        const distanceMapObject = calculateDistance(mapObjectPosition, character);
        if (distanceMapObject > distancePastChar) {
            return { pastCharacter: pastCharacter };
        } else {
            return { mapObject: interactableMapObject };
        }
    } else if (pastCharacter) {
        return { pastCharacter: pastCharacter };
    } else if (interactableMapObject) {
        return { mapObject: interactableMapObject };
    }
}

export function levelUpIncreaseExperienceRequirement(leveling: Leveling) {
    if (!leveling.leveling) return;
    leveling.leveling.experienceForLevelUp += leveling.level * 5;
    if (leveling.level > 100) {
        leveling.leveling.experienceForLevelUp = Math.floor(leveling.leveling.experienceForLevelUp * 1.01);
    }
}

export function getTickInterval(game: Game): number {
    return 1000 / game.gameSpeedSettings.desiredUpdatesPerSecond;
}

export function concedePlayerFightRetries(game: Game) {
    for (let player of game.state.players) {
        if (player.character.fightRetries !== undefined && player.character.fightRetries > 0) {
            player.character.fightRetries = 0;
        }
    }
}

export function calculateFightRetryCounter(game: Game) {
    let retryCounter = 0;
    for (let player of game.state.players) {
        if (player.character.fightRetries !== undefined) retryCounter += player.character.fightRetries;
    }
    return retryCounter;
}

export function getGameVersionString(gameVersion?: GameVersion) {
    if (!gameVersion) return "Unknown";
    return `${gameVersion.major}.${gameVersion.minor}.${gameVersion.patch}`;
}

export function retryFight(game: Game) {
    if (game.state.bossStuff.kingFightStartedTime === undefined && game.state.bossStuff.areaSpawnFightStartedTime === undefined) return;
    if (!game.state.bossStuff.fightWipe) return;
    let hasRetry = false;
    for (let player of game.state.players) {
        if (player.character.fightRetries !== undefined && player.character.fightRetries > 0) {
            player.character.fightRetries -= 1;
            hasRetry = true;
            break;
        }
    }
    if (!hasRetry) return;
    game.state.bossStuff.bosses = [];
    game.state.bossStuff.fightWipe = false;
    let playerSpawn: Position = { x: 0, y: 0 };
    if (game.state.bossStuff.kingFightStartedTime !== undefined) {
        startKingFight(game.state.players[0].character, game);
        let bossEnemy = game.state.bossStuff.bosses[0];
        const playerOffsetX = (game.state.map.kingArea!.size * game.state.map.chunkLength * game.state.map.tileSize) / 2 - game.state.map.tileSize * 2;
        playerSpawn.x = bossEnemy.x - playerOffsetX;
        playerSpawn.y = bossEnemy.y;
    } else if (game.state.bossStuff.areaSpawnFightStartedTime !== undefined) {
        areaSpawnOnDistanceRetry(game);
        playerSpawn = areaSpawnOnDistanceGetRetrySpawn(game);
    }
    for (let player of game.state.players) {
        player.character.state = "alive";
        player.character.hp = player.character.maxHp;
        player.character.x = playerSpawn.x;
        player.character.y = playerSpawn.y;
        resetCharacter(player.character, game);
        for (let i = player.character.abilities.length - 1; i >= 0; i--) {
            const ability = player.character.abilities[i];
            if (ability.name === ABILITY_NAME_LEASH) {
                player.character.abilities.splice(i, 1);
                break;
            }
        }
    }
    game.state.abilityObjects = [];
}

export function rotateAroundPoint(point: Position, pivot: Position, angle: number): Position {
    const translatedX = point.x - pivot.x;
    const translatedY = point.y - pivot.y;
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    const rotatedX = c * translatedX - s * translatedY;
    const rotatedY = s * translatedX + c * translatedY;
    return { x: rotatedX + pivot.x, y: rotatedY + pivot.y };
}


function shouldTickCatchUpSinglePlayer(game: Game, shouldTickTime: number): boolean {
    if (game.gameSpeedSettings.ticksPerPaint[0] === 0) return true;
    const now = performance.now();
    if (shouldTickTime < now) {
        const maxTicksPerPaint = game.gameSpeedSettings.desiredUpdatesPerSecond / game.gameSpeedSettings.minimalFramesPerSecondBeforeReducingUpdatesPerSecond;
        let totalTicks = 0;
        for (let i = 0; i < game.gameSpeedSettings.ticksPerPaint.length; i++) {
            totalTicks += game.gameSpeedSettings.ticksPerPaint[i];
        }
        const avgTickPerPaint = totalTicks / game.gameSpeedSettings.ticksPerPaint.length;
        if (maxTicksPerPaint >= avgTickPerPaint && Math.ceil(maxTicksPerPaint) >= game.gameSpeedSettings.ticksPerPaint[0]) {
            return true;
        } else {
            game.gameSpeedSettings.shouldTickTime = now;
            return false;
        }
    }
    return false;
}

function tickAndPaint(game: Game) {
    const tickInterval = getTickInterval(game);
    if (game.gameSpeedSettings.shouldTickTime === undefined) game.gameSpeedSettings.shouldTickTime = performance.now();
    takeTimeMeasure(game.debug, "total", "");
    takeTimeMeasure(game.debug, "", "total");
    takeTimeMeasure(game.debug, "?timeout?", "");
    takeTimeMeasure(game.debug, "", "runner");
    if (game.multiplayer.websocket === null) {
        if (game.testing.replay && game.testing.replay.frameSkipAmount && game.testing.replay.frameSkipAmount > 0) {
            for (let i = 0; i < game.testing.replay.frameSkipAmount; i++) {
                takeTimeMeasure(game.debug, "", "tick");
                tick(tickInterval, game);
                takeTimeMeasure(game.debug, "tick", "");
            }
        } else {
            while (shouldTickCatchUpSinglePlayer(game, game.gameSpeedSettings.shouldTickTime)) {
                takeTimeMeasure(game.debug, "", "tick");
                tick(tickInterval, game);
                game.gameSpeedSettings.ticksPerPaint[0]++;
                game.gameSpeedSettings.shouldTickTime += tickInterval;
                takeTimeMeasure(game.debug, "tick", "");
            }
        }
    } else {
        const timeNow = performance.now();
        let counter = 0;
        const maxCounter = 50;
        const realTimePassed = timeNow - game.multiplayer.worstCaseGameStartTime;
        while (!game.state.ended
            && (
                (game.multiplayer.maxServerGameTime >= game.state.time + tickInterval
                    && realTimePassed > game.state.time + tickInterval)
                || game.state.triggerRestart
            )
            && counter < maxCounter
        ) {
            counter++;
            takeTimeMeasure(game.debug, "", "tick");
            tick(tickInterval, game);
            takeTimeMeasure(game.debug, "tick", "");
        }
        if (counter >= 50) {
            console.log("game can not keep up");
        }
    }
    restartHoldDown(game);
    takeTimeMeasure(game.debug, "", "paint");
    paintAll(game.ctx, game);
    game.gameSpeedSettings.ticksPerPaint.unshift(0);
    if (game.gameSpeedSettings.maxTicksPerPaint < game.gameSpeedSettings.ticksPerPaint.length) game.gameSpeedSettings.ticksPerPaint.pop();
    takeTimeMeasure(game.debug, "paint", "");
    if (game.state.ended && game.state.triggerRestart) {
        gameRestart(game);
    }

    const timeoutSleep = determineRunnerTimeout(game, tickInterval);
    takeTimeMeasure(game.debug, "runner", "");
    takeTimeMeasure(game.debug, "", "?timeout?", timeoutSleep);
    return timeoutSleep;
}

function resetPastCharacters(game: Game) {
    for (let character of game.state.pastPlayerCharacters.characters) {
        if (character) resetCharacter(character, game);
    }
}

function tickPastCharacters(game: Game) {
    const pastCharacters = game.state.pastPlayerCharacters.characters;
    tickCharacters(pastCharacters, game, getPathingCache(game));
    for (let character of pastCharacters) {
        if (character && character.pets) {
            for (let ability of character.abilities) {
                if (ability.name === ABILITY_NAME_FEED_PET || ability.name === ABILITY_NAME_LOVE_PET) {
                    const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
                    if (abilityFunctions.tickAI) abilityFunctions.tickAI(character, ability, game);
                }
            }
        }
    }
}

function determineRunnerTimeout(game: Game, tickInterval: number): number {
    if (game.testing.replay?.zeroTimeout) {
        return 0;
    } else {
        if (game.multiplayer.websocket === null) {
            const timeRemaining = game.gameSpeedSettings.shouldTickTime! - performance.now();
            return Math.max(Math.min(timeRemaining, tickInterval), 0);
        } else {
            return 5;
        }
    }
}

function gameEndedCheck(game: Game) {
    const alivePlayersCount = countAlivePlayerCharacters(game.state.players, game.state.time);
    if (alivePlayersCount === 0) {
        if (game.state.bossStuff.areaSpawnFightStartedTime !== undefined || game.state.bossStuff.kingFightStartedTime !== undefined) {
            for (let player of game.state.players) {
                if (player.character.fightRetries !== undefined && player.character.fightRetries > 0) {
                    return false;
                }
            }
        }
        return true;
    }
    return false;
}

function savePlayerCharatersAsPastCharacters(game: Game) {
    const players = game.state.players;
    for (let player of players) {
        if (!player.isBot) saveCharacterAsPastCharacter(player.character, game);
    }
}

function endGameReplayStuff(game: Game, newScore: number) {
    const replay = game.testing.replay;
    if (replay) {
        replayGameEndAssert(game, newScore);
        const myClientId = game.multiplayer.myClientId;
        if (replay.data?.multiplayerData) {
            game.state.clientInfos = [{ id: myClientId, lastMousePosition: { x: 0, y: 0 }, name: "" }];
            const player = createPlayerWithPlayerCharacter(game.state.idCounter, myClientId, { x: 0, y: 0 }, game.state.randomSeed, game);
            game.state.players = [player];
        }
        const moreReplays = replayNextInReplayQueue(game);
        if (!moreReplays) {
            localStorageLoad(game);
        }
    }
}

function tick(gameTimePassed: number, game: Game) {
    if (!game.state.ended && (!game.state.paused || game.state.tickOnceInPaused)) {
        if (game.state.tickOnceInPaused) game.state.tickOnceInPaused = false;
        game.state.time += gameTimePassed;
        doStuff(game);
        addReplayInputs(game);
        generateMissingChunks(game.state.map, getPlayerCharacters(game.state.players), game.state.idCounter, game);
        determineActiveChunks(getPlayerCharacters(game.state.players), game.state.map, game);
        determineActiveCollisionCheckChunks(getPlayerCharacters(game.state.players), game.state.map, game);
        tickPlayerInputs(game.state.playerInputs, game.state.time, game);
        tickActiveMapChunks(game);
        tickMapModifier(game);
        tickBossCharacters(game.state.bossStuff, game);

        takeTimeMeasure(game.debug, "", "playerTick");
        tickCharacters(getPlayerCharacters(game.state.players), game, getPathingCache(game));
        tickPastCharacters(game);
        takeTimeMeasure(game.debug, "playerTick", "");

        tickAbilityObjects(game.state.abilityObjects, game);

        if (gameEndedCheck(game)) endGame(game);
        if (game.state.restartAfterTick) gameRestart(game);

        garbageCollectPathingCache(game.performance.pathingCache, game.state.time, game);
        saveStates(game);
    }
}

function saveStates(game: Game) {
    if (game.debug.activateSaveStates && !game.multiplayer.websocket) {
        const autoSaveStates = game.testing.saveStates.autoSaves;
        if (autoSaveStates.nextSaveStateTime === undefined || autoSaveStates.nextSaveStateTime <= game.state.time) {
            autoSaveStates.nextSaveStateTime = game.state.time + autoSaveStates.saveInterval;
            autoSaveStates.states.push(JSON.stringify(game.state));
            autoSaveStates.statesRecordData.push(JSON.stringify(game.testing.record?.data));
            if (autoSaveStates.states.length > autoSaveStates.maxNumberStates) {
                autoSaveStates.states.shift();
                autoSaveStates.statesRecordData.shift();
            }
        }
    }
}

function doStuff(game: Game) {
    achievementCheckOnGameTick(game.state.achievements, game);
    checkForKingAreaTrigger(game);
    areaSpawnOnDistanceCheckFightStart(game);
    checkDeathCircleSpawn(game);
    checkForBossSpawn(game);
    checkMovementKeyPressedHint(game);
    checkForAutoUpgrade(game);
    autoPlay(game);
    autoSendMyMousePosition(game);
    autoSendGamePlayerHashInMultiplayer(game);
    controllerInput(game);
    gameModeBaseDefenseTick(game);
}

function restartHoldDown(game: Game) {
    if (game.UI.restartKeyPressTime && game.UI.restartKeyPressTime + RESTART_HOLD_TIME < performance.now()) {
        executeUiAction("Restart", true, game);
    }
}

function autoSendMyMousePosition(game: Game) {
    if (game.testing.replay) return;
    if (game.UI.inputType !== "keyboard") return;
    if (game.multiplayer.autosendMousePosition.sendForOwners.length === 0) return;
    if (game.multiplayer.autosendMousePosition.nextTime <= game.state.time) {
        const cameraPosition = getCameraPosition(game);
        const castPosition = mousePositionToMapPosition(game, cameraPosition);
        handleCommand(game, {
            command: "playerInput",
            clientId: game.multiplayer.myClientId,
            data: { action: MOUSE_ACTION, mousePosition: castPosition },
        });
        game.multiplayer.autosendMousePosition.nextTime = game.state.time + game.multiplayer.autosendMousePosition.interval;
    }
}

function autoSendGamePlayerHashInMultiplayer(game: Game) {
    if (!game.multiplayer.websocket) return;
    if (!game.multiplayer.gameStateCompare) return;
    const compare = game.multiplayer.gameStateCompare;
    if (compare.nextCompareTime === undefined) {
        compare.nextCompareTime = game.state.time + compare.compareInterval - (game.state.time % compare.compareInterval);
    }
    if (compare.nextCompareTime <= game.state.time) {
        if (compare.stateTainted && !compare.stateCompareSend) {
            const playersJson = JSON.stringify(game.state.players);
            handleCommand(game, {
                command: COMMAND_COMPARE_STATE,
                clientId: game.multiplayer.myClientId,
                data: { playersJson: playersJson, time: game.state.time },
            });
            compare.stateCompareSend = true;
        } else {
            const hash = createGamePlayerHash(game.state);
            const playersJson = JSON.stringify(game.state.players) + ", idCounter: " + JSON.stringify(game.state.idCounter);
            handleCommand(game, {
                command: COMMAND_COMPARE_STATE_HASH,
                clientId: game.multiplayer.myClientId,
                data: { hash: hash, time: game.state.time, playersJson: playersJson, restartCounter: game.state.restartCounter },
            });
        }
        compare.nextCompareTime += compare.compareInterval;
    }
}

function checkForAutoUpgrade(game: Game) {
    if (!isAutoUpgradeActive(game)) return;

    const character: Character | undefined = findMyCharacter(game);
    if (character && hasPlayerChoosenStartClassUpgrade(character)) {
        if (character.upgradeChoices.choices.length > 0) {
            let randomChoice = Math.floor(Math.random() * character.upgradeChoices.choices.length);
            handleCommand(game, {
                command: "playerInput",
                clientId: game.multiplayer.myClientId,
                data: { action: UPGRADE_ACTIONS[randomChoice], isKeydown: true },
            });
        }
    }
}

function checkMovementKeyPressedHint(game: Game) {
    if (game.state.time > 10000 && !game.UI.movementKeyPressed && !game.multiplayer.websocket) {
        game.UI.displayMovementKeyHint = true;
    }
}

function checkDeathCircleSpawn(game: Game) {
    if (!game.state.deathCircleCreated) {
        const waitTime = game.state.gameMode === GAME_MODE_BASE_DEFENSE ? 0 : 30000;
        const spawnAfterTime = getTimeSinceFirstKill(game.state) > waitTime;
        if (spawnAfterTime) {
            const reversed = game.state.gameMode === GAME_MODE_BASE_DEFENSE ? true : false;
            game.state.abilityObjects.push(createObjectDeathCircle(reversed, game.state.map));
            game.state.deathCircleCreated = true;
        }
    }
}

function addReplayInputs(game: Game) {
    if (game.testing.replay) {
        const replay = game.testing.replay;
        if (replay.replayInputCounter === undefined) replay.replayInputCounter = 0;
        const replayData = replay.data!;
        while (replayData.replayPlayerInputs[replay.replayInputCounter]
            && replayData.replayPlayerInputs[replay.replayInputCounter].executeTime < game.state.time + 1000
        ) {
            const original = replayData.replayPlayerInputs[replay.replayInputCounter]
            const data = { ...original };
            if (game.state.players.length === 1
                || (data.clientId === -1 && game.state.players[0].clientId === game.multiplayer.myClientId)) {
                data.clientId = game.multiplayer.myClientId;
            }
            if (replayData.extendendInputData) {
                const exteneded = replayData.extendendInputData[replay.replayInputCounter];
                if (exteneded) data.replayExtended = exteneded;
            }
            handleCommand(game, data);
            replay.replayInputCounter++;
        }
        if (replayData.replayPlayerInputs.length <= replay.replayInputCounter
            && replayData.replayPlayerInputs[replay.replayInputCounter - 1].executeTime + 60000 < game.state.time
        ) {
            console.log("replay seems to be stuck. End it by killing players.");
            for (let player of game.state.players) {
                player.character.hp = 0;
                player.character.state = "dead";
            }
            if (game.state.bossStuff.areaSpawnFightStartedTime !== undefined || game.state.bossStuff.kingFightStartedTime !== undefined) {
                concedePlayerFightRetries(game);
            }
        }
    }
}

function determineActiveChunks(characters: Character[], map: GameMap, game: Game) {
    if (game.state.gameMode != undefined) return;
    takeTimeMeasure(game.debug, "", "determineActiveChunks");
    const keySet: Set<string> = new Set();
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].state === "dead") continue;
        const nearMapKeys = determineMapKeysInDistance(characters[i], map, map.activeChunkRange, false);
        for (let mapKey of nearMapKeys) {
            keySet.add(mapKey);
            if (!game.performance.chunkGraphRectangles[mapKey]) {
                chunkGraphRectangleSetup(mapKeyToChunkXY(mapKey), game);
            }
        }
    }
    map.activeChunkKeys = [...keySet];
    takeTimeMeasure(game.debug, "determineActiveChunks", "");
}

function determineActiveCollisionCheckChunks(characters: Character[], map: GameMap, game: Game) {
    takeTimeMeasure(game.debug, "", "determineActiveCollisionCheckChunks");
    const keySet: Set<string> = new Set();
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].state === "dead") continue;
        const nearMapKeys = determineMapKeysInDistance(characters[i], map, 400, false);
        for (let mapKey of nearMapKeys) {
            keySet.add(mapKey);
        }
    }
    map.activeCollisionCheckChunkKeys = [...keySet];
    takeTimeMeasure(game.debug, "determineActiveCollisionCheckChunks", "");
}


function setReplaySeeds(game: Game) {
    game.state.randomSeed.seed = 0;
    game.state.map = createMap();
    game.state.map.seed = 0;
    if (game.state.bossStuff.closedOfKingAreaEntrance) {
        game.state.bossStuff.closedOfKingAreaEntrance = undefined;
    }
    if (game.testing.replay) {
        if (game.testing.replay.mapSeed !== undefined) game.state.map.seed = game.testing.replay.mapSeed;
        if (game.testing.replay.randomStartSeed !== undefined) game.state.randomSeed.seed = game.testing.replay.randomStartSeed;
        if (game.testing.replay.enemyTypeDirectionSeed !== undefined) game.state.enemyTypeDirectionSeed = game.testing.replay.enemyTypeDirectionSeed;
    };
}
