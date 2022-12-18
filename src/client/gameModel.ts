import { Character } from "./character/characterModel.js";
import { createDefaultUpgradeOptions } from "./character/levelingCharacter.js";
import { UpgradeOption } from "./character/levelingCharacterModel.js";
import { createMap, GameMap } from "./map/map.js";
import { Player } from "./player.js";
import { PlayerInput } from "./playerInput.js";
import { Projectile } from "./projectile.js";
import { nextRandom, RandomSeed } from "./randomNumberGenerator.js";

export type Position = {
    x: number,
    y: number
}

export type GameState = {
    idCounter: number,
    characters: Character[],
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

export type Game = {
    canvasElement: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    state: GameState,
    realStartTime: number,
    clientKeyBindings: {
        clientIdRef: number,
        keyCodeToActionPressed: Map<string, string>,
    }[],
    multiplayer: {
        myClientId: number,
        websocket: WebSocket | null,
        maxServerGameTime: number,
        smoothedGameTime: number,
        delay: number,
        maxDelay: number,
        minDelay: number,
        lastSendTime: number[],
        updateInterval: number,
        lastRestartReceiveTime?: number,
        cachePlayerInputs?: PlayerInput[],
    },
    avaialbleUpgrades: Map<string, UpgradeOption>,
    camera: {
        type: string,
        characterId?: number,
    }
}

export function createDefaultGameData(c: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Game {
    let game: Game = {
        canvasElement: c,
        ctx: ctx,
        state: {
            idCounter: 0,
            projectiles: [],
            characters: [],
            killCounter: 0,
            ended: false,
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
            clientIds: [],
            map: createMap(),
        },
        clientKeyBindings: [],
        realStartTime: 0,
        multiplayer: {
            myClientId: -1,
            websocket: null,
            maxServerGameTime: 0,
            smoothedGameTime: 0,
            delay: 0,
            maxDelay: 0,
            minDelay: 0,
            lastSendTime: [],
            updateInterval: -1,
        },
        avaialbleUpgrades: createDefaultUpgradeOptions(),
        camera: {
            type: "follow character"
        }
    }

    game.state.map.seed = nextRandom(game.state.randomSeed);
    return game;
}