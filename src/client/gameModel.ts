import { AbilityObject } from "./ability/ability.js";
import { Character } from "./character/characterModel.js";
import { LevelingCharacterClasses } from "./character/levelingCharacters/levelingCharacterModel.js";
import { PathingCache } from "./character/pathing.js";
import { CommandRestart } from "./commands.js";
import { createMap, GameMap } from "./map/map.js";
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

export type TestingStuff = {
    zeroTimeout?: boolean,
    doNotPaint?: boolean,
    frameSkipAmount?: number,
    startTime: number,
    collectedTestInputs?: Omit<PlayerInput, "executeTime">[],
    replayPlayerInputs?: PlayerInput[],
    replayInputCounter?: number,
    mapSeed?: number,
    randomStartSeed?: number,
    restartPlayerInput?: Omit<CommandRestart, "executeTime">,
}

export type Debugging = {
    paintMarkActiveChunks?: boolean,
    paintTileIJNumbers?: boolean,
    takeTimeMeasures?: boolean,
    timeMeasuresData?: { name: string, timeMeasures: number[], tempTime: number }[],
}

export type MapChunkPaintCache = {
    [key: string]: CanvasRenderingContext2D
}

export type BossStuff = {
    bossLevelCounter: number,
    bossEachXLevels: number,
    bosses: Character[],
}

export type CliendInfo = {
    id: number,
    name: string,
}

export type GameState = {
    idCounter: IdCounter,
    abilityObjects: AbilityObject[],
    players: Player[],
    bossStuff: BossStuff,
    killCounter: number,
    time: number;
    ended: boolean,
    triggerRestart: boolean,
    restartAfterTick: boolean,
    randomSeed: RandomSeed,
    playerInputs: PlayerInput[],
    highscores: Highscores,
    cliendInfos: CliendInfo[],
    map: GameMap,
    deathCircleCreated: boolean,
}

export type Highscores = {
    scores: number[],
    maxLength: 10,
    lastHighscorePosition: number,
}

export type Camera = {
    type: string,
    characterId?: number,
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
    testing?: TestingStuff,
    debug: Debugging,
    closeGame?: boolean,
}

export const LEVELING_CHARACTER_CLASSES: LevelingCharacterClasses = {};

export function createDefaultGameData(c: HTMLCanvasElement | undefined, ctx: CanvasRenderingContext2D | undefined): Game {
    let game: Game = {
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
            highscores: {
                scores: [],
                lastHighscorePosition: 0,
                maxLength: 10,
            },
            randomSeed: {
                seed: Math.random(),
            },
            players: [],
            cliendInfos: [{id: -1, name: "Unknown"}],
            map: createMap(),
            deathCircleCreated: false,
            bossStuff: {
                bossEachXLevels: 25,
                bossLevelCounter: 1, 
                bosses: [],
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
        },
        camera: {
            type: "follow character"
        },
        mouseRelativeCanvasPosition: { x: 0, y: 0 },
        performance: {},
        debug: {
        },
    }

    game.state.map.seed = nextRandom(game.state.randomSeed);
    generateMissingChunks(game.state.map, [{ x: 0, y: 0 }], game.state.idCounter, game);

    return game;
}