import { createDefaultUpgradeOptions } from "./character/levelingCharacters/levelingCharacter.js";
import { LevelingCharacterClasses, UpgradeOption } from "./character/levelingCharacters/levelingCharacterModel.js";
import { addShooterClass } from "./character/levelingCharacters/shooterCharacterClass.js";
import { generateMissingChunks } from "./game.js";
import { createMap, GameMap } from "./map/map.js";
import { Player } from "./player.js";
import { PlayerInput } from "./playerInput.js";
import { Projectile } from "./projectile.js";
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
    collectedTestInputs?: PlayerInput[],
    replayPlayerInputs?: PlayerInput[],
    replayInputCounter?: number,
}

export type Debugging = {
    paintMarkActiveChunks?: boolean,
    paintTileIJNumbers?: boolean,
}

export type MapChunkPaintCache = {
    [key: string]: CanvasRenderingContext2D
}

export type GameState = {
    idCounter: IdCounter,
    projectiles: Projectile[],
    players: Player[],
    killCounter: number,
    time: number;
    ended: boolean,
    triggerRestart: boolean,
    restartAfterTick: boolean,
    randomSeed: RandomSeed,
    playerInputs: PlayerInput[],
    highscores: Highscores,
    clientIds: number[],
    map: GameMap,
}

export type Highscores = {
    scores: number[],
    maxLength: 10,
}

export type Camera ={
    type: string,
    characterId?: number,
}

export type UpgradeOptions = {[key:string]: Map<string, UpgradeOption>};

export type Game = {
    canvasElement?: HTMLCanvasElement,
    ctx?: CanvasRenderingContext2D,
    state: GameState,
    shouldTickTime?: number,
    tickInterval: number,
    clientKeyBindings: {
        clientIdRef: number,
        keyCodeToActionPressed: Map<string, string>,
    }[],
    multiplayer: {
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
    },
    avaialbleUpgrades: UpgradeOptions,
    camera: Camera,
    performance: {
        mapChunkPaintCache?: MapChunkPaintCache,
    }
    testing?: TestingStuff,
    debug?: Debugging,
    closeGame?: boolean,
}

export const LEVELING_CHARACTER_CLASSES: LevelingCharacterClasses = {};

export function createDefaultGameData(c: HTMLCanvasElement | undefined, ctx: CanvasRenderingContext2D | undefined): Game {
    let game: Game = {
        canvasElement: c,
        ctx: ctx,
        state: {
            idCounter: {nextId: 0},
            projectiles: [],
            killCounter: 0,
            ended: true,
            triggerRestart: false,
            restartAfterTick: false,
            time: 0,
            playerInputs: [],
            highscores: {
                scores: [],
                maxLength: 10,
            },
            randomSeed: {
                seed: Math.random(),
            },
            players: [],
            clientIds: [-1],
            map: createMap(),
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
        },
        avaialbleUpgrades: createDefaultUpgradeOptions(),
        camera: {
            type: "follow character"
        },
        performance:{},
        debug:{ 
            //paintTileIJNumbers: true,
            //paintMarkActiveChunks: true,
        },
    }

    game.state.map.seed = nextRandom(game.state.randomSeed);
    generateMissingChunks(game.state.map, [{x:0, y:0}], game.state.idCounter);

    return game;
}