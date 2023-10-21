import { AbilityObject } from "./ability/ability.js";
import { Character } from "./character/characterModel.js";
import { createDefaultNextEndBoss } from "./character/enemy/endBossEnemy.js";
import { PathingCache } from "./character/pathing.js";
import { CommandRestart } from "./commands.js";
import { createHighscoreBoards, Highscores } from "./highscores.js";
import { createMap, GameMap } from "./map/map.js";
import { EndBossEntranceData } from "./map/mapEndBossArea.js";
import { generateMissingChunks } from "./map/mapGeneration.js";
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
    pastCharacters?: PastPlayerCharacters,
    nextEndBosses?: NextEndbosses,
    gameEndAsserts?: {
        type: string,
        data: any,
    }[],
}

export type TestingStuff = {
    record?: {
        data: RecordData,
        mapSeed?: number,
        randomStartSeed?: number,
        restartPlayerInput?: Omit<CommandRestart, "executeTime">,
    }
    replay?: {
        zeroTimeout?: boolean,
        doNotPaint?: boolean,
        frameSkipAmount?: number,
        startTime: number,
        mapSeed?: number,
        randomStartSeed?: number,
        data?: {
            replayPlayerInputs: PlayerInput[],
            pastCharacters?: PastPlayerCharacters,
            nextEndBosses?: NextEndbosses,
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
        maxNumberStates: number,
        saveInterval: number,
        nextSaveStateTime?: number,
        states: string[],
        statesRecordData: string[],
    }
}

export type Debugging = {
    paintMarkActiveChunks?: boolean,
    paintTileXYNumbers?: boolean,
    takeTimeMeasures?: boolean,
    activateSaveStates?: boolean,
    timeMeasuresData?: { name: string, timeMeasures: number[], tempTime: number }[],
}

export type MapChunkPaintCache = {
    [key: string]: CanvasRenderingContext2D
}

export type CelestialDirection = "north" | "west" | "south" | "east";
export type NextEndbosses = {
    north?: Character,
    west?: Character,
    south?: Character,
    east?: Character,
};

export type BossStuff = {
    bossLevelCounter: number,
    bossSpawnEachXMilliSecond: number,
    endBossStarted: boolean,
    nextEndbosses: NextEndbosses,
    closedOfEndBossEntrance?: EndBossEntranceData,
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

export type KeyCodeToAction = Map<string, { action: string, uiDisplayInputValue: string, isInputAlreadyDown: boolean }>;

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
        active: boolean,
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
    clientKeyBindings: {
        clientIdRef: number,
        keyCodeToActionPressed: KeyCodeToAction,
    }[],
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
    settings: {
        autoSkillEnabled: boolean,
    }
    UI: {
        displayMovementKeyHint: boolean,
        movementKeyPressed: boolean,
        displayDamageNumbers: boolean,
        displayTextData: PaintTextData[],
        displayLongInfos: boolean,
    }
}

export const FACTION_ENEMY = "enemy";
export const FACTION_PLAYER = "player";
export const LOCALSTORAGE_PASTCHARACTERS = "pastCharacters";
export const LOCALSTORAGE_NEXTENDBOSSES = "nextEndBosses";
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
                endBossStarted: false,
                bosses: [],
                nextEndbosses: {},
            },
            paused: false,
            pastPlayerCharacters: {
                characters: [],
                maxNumber: 12,
            },
        },
        clientKeyBindings: [],
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
                active: false,
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
                maxNumberStates: 10,
                saveInterval: 10000,
                states: [],
                statesRecordData: [],
            }
        },
        debug: {
        },
        UI: {
            displayMovementKeyHint: false,
            movementKeyPressed: false,
            displayDamageNumbers: true,
            displayTextData: [],
            displayLongInfos: false,
        },
        settings: {
            autoSkillEnabled: false,
        }
    }

    if (game.state.map.endBossArea) {
        setDefaultNextEndbosses(game);
    }
    game.state.map.seed = nextRandom(game.state.randomSeed);
    generateMissingChunks(game.state.map, [{ x: 0, y: 0 }], game.state.idCounter, game);

    return game;
}

export function setDefaultNextEndbosses(game: Game) {
    game.state.bossStuff.nextEndbosses.north = createDefaultNextEndBoss(game.state.idCounter, game);
    game.state.bossStuff.nextEndbosses.west = createDefaultNextEndBoss(game.state.idCounter, game);
    game.state.bossStuff.nextEndbosses.south = createDefaultNextEndBoss(game.state.idCounter, game);
    game.state.bossStuff.nextEndbosses.east = createDefaultNextEndBoss(game.state.idCounter, game);
}