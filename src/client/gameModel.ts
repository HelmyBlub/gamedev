import { AbilityObject } from "./ability/ability.js";
import { Character } from "./character/characterModel.js";
import { createDefaultNextKing } from "./character/enemy/kingEnemy.js";
import { PathingCache } from "./character/pathing.js";
import { CommandRestart } from "./commands.js";
import { createHighscoreBoards, Highscores } from "./highscores.js";
import { createMap, GameMap } from "./map/map.js";
import { KingAreaEntranceData } from "./map/mapKingArea.js";
import { generateMissingChunks } from "./map/mapGeneration.js";
import { Building } from "./map/mapObjectClassBuilding.js";
import { PermanentDataParts } from "./permanentData.js";
import { Player } from "./player.js";
import { PlayerInput } from "./playerInput.js";
import { nextRandom, RandomSeed } from "./randomNumberGenerator.js";

export type Position = {
    x: number,
    y: number
}

export type IdCounter = {
    nextId: number
}

export type RecordData = {
    replayPlayerInputs: Omit<PlayerInput, "executeTime">[],
    permanentData: PermanentDataParts,
    gameEndAsserts?: {
        type: string,
        data: any,
    }[],
}

export type Legendary = {
    buildingIdRef: number,
    skillPointCap: number,
    levelCap: number,
    blessings: string[],
}

export type TestingStuff = {
    record?: {
        data: RecordData,
        mapSeed?: number,
        randomStartSeed?: number,
        enemyTypeDirectionSeed?: number,
        restartPlayerInput?: Omit<CommandRestart, "executeTime">,
    }
    replay?: {
        zeroTimeout?: boolean,
        doNotPaint?: boolean,
        frameSkipAmount?: number,
        startTime: number,
        mapSeed?: number,
        randomStartSeed?: number,
        enemyTypeDirectionSeed?: number,
        data?: {
            replayPlayerInputs: PlayerInput[],
            permanentData: PermanentDataParts,
            gameEndAsserts?: {
                type: string,
                data: any,
            }[]
        }
        replayInputCounter?: number,
        testInputFileQueue?: string[],
    }
    autoPlay: {
        hotkeyEnabled: boolean,
        autoPlaying: boolean,
        nextAutoButtonPressTime: number
    },
    saveStates: {
        autoSaves: {
            saveInterval: number,
            nextSaveStateTime?: number,
            states: string[],
            statesRecordData: string[],
            maxNumberStates: number,
        },
        manualSaves: {
            states: string[],
            statesRecordData: string[],
        }
    }
}

export type Debugging = {
    paintMarkActiveChunks?: boolean,
    paintTileXYNumbers?: boolean,
    takeTimeMeasures?: boolean,
    activateSaveStates?: boolean,
    lowBossHp?: boolean,
    disableDamageNumbers?: boolean,
    timeMeasuresData?: { name: string, timeMeasures: number[], tempTime: number }[],
}

export type MapChunkPaintCache = {
    [key: string]: CanvasRenderingContext2D
}

export type CelestialDirection = "north" | "west" | "south" | "east";
export type NextKings = {
    north?: Character,
    west?: Character,
    south?: Character,
    east?: Character,
};

export type BossStuff = {
    bossLevelCounter: number,
    bossSpawnEachXMilliSecond: number,
    kingFightStarted: boolean,
    nextKings: NextKings,
    closedOfKingAreaEntrance?: KingAreaEntranceData,
    bosses: Character[],
}

export type ClientInfo = {
    id: number,
    name: string,
    lastMousePosition: Position,
}

export type GameState = {
    idCounter: IdCounter,
    abilityObjects: AbilityObject[],
    players: Player[],
    bossStuff: BossStuff,
    killCounter: number,
    time: number;
    timeFirstKill?: number;
    ended: boolean,
    triggerRestart: boolean,
    restartAfterTick: boolean,
    randomSeed: RandomSeed,
    playerInputs: PlayerInput[],
    highscores: Highscores,
    clientInfos: ClientInfo[],
    map: GameMap,
    deathCircleCreated: boolean,
    paused: boolean,
    tickOnceInPaused?: boolean,
    pastPlayerCharacters: PastPlayerCharacters,
    buildings: Building[],
    enemyTypeDirectionSeed: number,
}

export type PastPlayerCharacters = {
    characters: (Character | undefined)[]
    maxNumber: number,
}

export type Camera = {
    type: string,
    characterId?: number,
}

export type PaintTextData = {
    text: string,
    paintPosition: Position,
    color: string,
    fontSize: string,
    removeTime: number,
}

export type KeyCodeToAction = Map<string, {
    action: string,
    uiDisplayInputValue: string,
    isInputAlreadyDown: boolean,
    activated?: boolean,
}>;

export type BossSkillPoints = {
    available: number,
    used: number,
}

export type Multiplayer = {
    myClientId: number,
    websocket: WebSocket | null,
    maxServerGameTime: number,
    maxServerGameTimeReceivedTime: number,
    worstCaseGameStartTime: number,
    worstCaseAge: number,
    worstRecentCaseGameStartTime: number,
    delay: number,
    maxDelay: number,
    minDelay: number,
    lastSendTime: number[],
    updateInterval: number,
    lastRestartReceiveTime?: number,
    cachePlayerInputs?: PlayerInput[],
    connectMenuOpen: boolean,
    connectMenuListenerSet: boolean,
    awaitingGameState: {
        waiting: boolean,
        receivedCommands: any[],
    },
    multiplayerIdentifier?: string,
    intentionalDisconnect: boolean,
    timePassedWithoutSeverUpdate: number,
    disableLocalStorage?: boolean,
    autosendMousePosition: {
        sendForOwners: string[],
        interval: number,
        nextTime: number,
    }
}

export type Game = {
    canvasElement?: HTMLCanvasElement,
    ctx?: CanvasRenderingContext2D,
    state: GameState,
    shouldTickTime?: number,
    tickInterval: number,
    clientKeyBindings?: {
        clientIdRef: number,
        keyCodeToActionPressed: KeyCodeToAction,
        keyCodeToUiAction: KeyCodeToAction,
    },
    multiplayer: Multiplayer,
    mouseRelativeCanvasPosition: Position,
    camera: Camera,
    performance: {
        mapChunkPaintCache?: MapChunkPaintCache,
        pathingCache?: PathingCache,
    }
    testing: TestingStuff,
    debug: Debugging,
    closeGame?: boolean,
    UI: {
        displayMovementKeyHint: boolean,
        movementKeyPressed: boolean,
        displayTextData: PaintTextData[],
        displayLongInfos: boolean,
        playerGlobalAlphaMultiplier: number,
        paintClosesInteractableStatsUi: boolean,
    }
}

export const FACTION_ENEMY = "enemy";
export const FACTION_PLAYER = "player";
export const ANIMATION_END_BOSS_CROWN_OVERTAKE = "End Boss Crown Overtake";

export function createDefaultGameData(c: HTMLCanvasElement | undefined, ctx: CanvasRenderingContext2D | undefined): Game {
    const game: Game = {
        canvasElement: c,
        ctx: ctx,
        state: {
            idCounter: { nextId: 0 },
            abilityObjects: [],
            killCounter: 0,
            ended: true,
            triggerRestart: false,
            restartAfterTick: false,
            time: 0,
            playerInputs: [],
            highscores: createHighscoreBoards(),
            randomSeed: {
                seed: Math.random(),
            },
            players: [],
            clientInfos: [{ id: -1, name: "Unknown", lastMousePosition: { x: 0, y: 0 } }],
            map: createMap(),
            deathCircleCreated: false,
            bossStuff: {
                bossSpawnEachXMilliSecond: 60000,
                bossLevelCounter: 1,
                kingFightStarted: false,
                bosses: [],
                nextKings: {},
            },
            paused: false,
            pastPlayerCharacters: {
                characters: [],
                maxNumber: 12,
            },
            buildings: [],
            enemyTypeDirectionSeed: 0,
        },
        tickInterval: 16,
        multiplayer: {
            myClientId: -1,
            websocket: null,
            maxServerGameTime: 0,
            maxServerGameTimeReceivedTime: 0,
            worstCaseGameStartTime: Number.NEGATIVE_INFINITY,
            worstCaseAge: 0,
            worstRecentCaseGameStartTime: Number.NEGATIVE_INFINITY,
            delay: 0,
            maxDelay: 0,
            minDelay: 0,
            lastSendTime: [],
            updateInterval: -1,
            connectMenuOpen: false,
            connectMenuListenerSet: false,
            awaitingGameState: {
                waiting: false,
                receivedCommands: [],
            },
            intentionalDisconnect: false,
            timePassedWithoutSeverUpdate: 0,
            autosendMousePosition: {
                sendForOwners: [],
                interval: 100,
                nextTime: 0,
            }
        },
        camera: {
            type: "follow character"
        },
        mouseRelativeCanvasPosition: { x: 0, y: 0 },
        performance: {},
        testing: {
            autoPlay: {
                autoPlaying: false,
                hotkeyEnabled: false,
                nextAutoButtonPressTime: 0,
            },
            saveStates: {
                autoSaves: {
                    maxNumberStates: 2,
                    saveInterval: 10000,
                    states: [],
                    statesRecordData: [],
                },
                manualSaves: {
                    states: [],
                    statesRecordData: [],
                }
            }
        },
        debug: {
        },
        UI: {
            displayMovementKeyHint: false,
            movementKeyPressed: false,
            displayTextData: [],
            displayLongInfos: false,
            playerGlobalAlphaMultiplier: 1,
            paintClosesInteractableStatsUi: false,
        },
    }

    if (game.state.map.kingArea) {
        setDefaultNextKings(game);
    }
    game.state.map.seed = nextRandom(game.state.randomSeed);
    generateMissingChunks(game.state.map, [{ x: 0, y: 0 }], game.state.idCounter, game);

    return game;
}

export function setDefaultNextKings(game: Game) {
    game.state.bossStuff.nextKings.north = createDefaultNextKing(game.state.idCounter, game);
    game.state.bossStuff.nextKings.west = createDefaultNextKing(game.state.idCounter, game);
    game.state.bossStuff.nextKings.south = createDefaultNextKing(game.state.idCounter, game);
    game.state.bossStuff.nextKings.east = createDefaultNextKing(game.state.idCounter, game);
}