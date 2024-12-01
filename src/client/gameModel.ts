import { AbilityObject } from "./ability/ability.js";
import { Character } from "./character/characterModel.js";
import { createDefaultNextKing } from "./character/enemy/kingEnemy.js";
import { PathingCache } from "./character/pathing.js";
import { CommandRestart, StateCompareHash } from "./commands.js";
import { createHighscoreBoards, Highscores } from "./highscores.js";
import { createMap, GameMap } from "./map/map.js";
import { KingAreaEntranceData } from "./map/mapKingArea.js";
import { generateMissingChunks } from "./map/mapGeneration.js";
import { PermanentDataParts } from "./permanentData.js";
import { createPlayerWithPlayerCharacter, MoneyGainedThisRun, PermanentPlayerData, Player } from "./player.js";
import { PlayerInput } from "./input/playerInput.js";
import { nextRandom, RandomSeed } from "./randomNumberGenerator.js";
import { MoreInfos, createDefaultEmptyMoreInfos } from "./moreInfo.js";
import { Building } from "./map/buildings/building.js";
import { GAME_VERSION } from "./main.js";
import { createDamageMeter, DamageMeter } from "./combatlog.js";
import { createSound, Sound } from "./sound.js";
import { Achievements, createDefaultAchivements } from "./achievements/achievements.js";
import { PlayerCharacterAbilityUI, PlayerCharacterLevelUI } from "./character/playerCharacters/playerCharacters.js";
import { ActiveCheats } from "./cheat.js";
import { createDefaultStackTextsData, PaintStackTextsData, PaintTextData } from "./floatingText.js";
import { TouchUiInfo } from "./input/inputTouch.js";
import { ControllerButtonsPressed } from "./input/inputController.js";
import { AdditionalPaints } from "./additionalPaint.js";

export type Position = {
    x: number,
    y: number
}

export type IdCounter = {
    nextId: number
}

export type RecordDataMultiplayer = {
    clientInfo: ClientInfo,
    playerCharacterPermanentUpgrades: PermanentPlayerData,
}

export type RecordData = {
    replayPlayerInputs: Omit<PlayerInput, "executeTime">[],
    permanentData: PermanentDataParts,
    multiplayerData?: RecordDataMultiplayer[],
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

export type ReplayData = {
    replayPlayerInputs: PlayerInput[],
    permanentData: PermanentDataParts,
    multiplayerData?: RecordDataMultiplayer[],
    gameEndAsserts?: ReplayAssert[],
}

export type ReplayAssert = {
    type: string,
    data: any,
}

export type Replay = {
    zeroTimeout?: boolean,
    doNotPaint?: boolean,
    frameSkipAmount?: number,
    startTime: number,
    mapSeed?: number,
    randomStartSeed?: number,
    enemyTypeDirectionSeed?: number,
    data?: ReplayData,
    replayInputCounter?: number,
    testInputFileQueue?: string[],
    currentReplayName?: string,
}

export type TestingStuff = {
    lastReplay?: ReplayData,
    record?: {
        data: RecordData,
        mapSeed?: number,
        randomStartSeed?: number,
        enemyTypeDirectionSeed?: number,
        restartPlayerInput?: Omit<CommandRestart, "executeTime">,
    }
    replay?: Replay,
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

export type GameVersion = {
    major: number,
    minor: number,
    patch: number,
}

export type Debugging = {
    paintMarkActiveChunks?: boolean,
    paintTileXYNumbers?: boolean,
    takeTimeMeasures?: boolean,
    activateSaveStates?: boolean,
    disableDamageNumbers?: boolean,
    aimCursor?: boolean,
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
    kingFightStartedTime?: number,
    godFightStartedTime?: number,
    fightWipe?: boolean,
    nextKings: NextKings,
    closedOfKingAreaEntrance?: KingAreaEntranceData,
    bosses: Character[],
    normalModeMoneyAwarded?: boolean,
}

export type ClientInfo = {
    id: number,
    name: string,
    lastMousePosition: Position,
    allowCheats?: boolean,
}

export type GameState = {
    restartCounter: number,
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
    gameVersion: GameVersion,
    achievements: Achievements,
    activeCheats?: ActiveCheats,
}

export type PastPlayerCharacters = {
    characters: (Character | undefined)[]
    maxNumber: number,
}

export type Camera = {
    type: string,
    characterId?: number,
}

export type KeyCodeToAction = Map<string, {
    action: string,
    uiDisplayInputValue: string,
    isInputAlreadyDown: boolean,
    activated?: boolean,
}>;

export type SkillPoints = {
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
    gameStateCompare?: {
        compareInterval: number,
        nextCompareTime?: number,
        maxKeep: number,
        timeAndHash: StateCompareHash[],
        stateTainted: boolean,
        stateCompareSend?: boolean,
    }
}

export type InputType = "keyboard" | "touch" | "controller";

export type Rectangle = {
    topLeft: Position,
    height: number,
    width: number,
}

export type InteractRectangle = Rectangle & {
    interactAction: string,
}

export type Zoom = {
    factor: number,
    max: number,
    min: number,
}

export type UI = {
    zoom: Zoom,
    inputType: InputType,
    touchInfo: TouchUiInfo,
    rectangles: {
        upgradePaintRectangle?: Rectangle[],
        restartTextRectangle?: Rectangle,
        retryTextRectangles?: Rectangle[],
        interactRectangle?: InteractRectangle[],
    }
    damageMeter: DamageMeter,
    displayMovementKeyHint: boolean,
    movementKeyPressed: boolean,
    displayTextData: PaintTextData[],
    stackTextsData: PaintStackTextsData,
    moreInfos: MoreInfos,
    displayMoreInfos: boolean,
    displayMorePressTimer?: number,
    playerGlobalAlphaMultiplier: number,
    paintClosesInteractableMoreInfo: boolean,
    moneyGainedThisRun: MoneyGainedThisRun,
    lastHighscoreText?: string;
    lastMouseDownWasUIClick: boolean,
    playerCharacterLevelUI?: PlayerCharacterLevelUI,
    playerCharacterAbilityUI?: PlayerCharacterAbilityUI,
}

export type ClientKeyBindings = {
    moveKeys: string[],
    keyCodeToActionPressed: KeyCodeToAction,
    keyCodeToUiAction: KeyCodeToAction,
}

export type Game = {
    canvasElement?: HTMLCanvasElement,
    ctx?: CanvasRenderingContext2D,
    state: GameState,
    gameSpeedSettings: {
        desiredUpdatesPerSecond: number,
        minimalFramesPerSecondBeforeReducingUpdatesPerSecond: number,
        maxTicksPerPaint: number,
        ticksPerPaint: number[],
        shouldTickTime?: number,
    }
    clientKeyBindings?: ClientKeyBindings,
    controllersButtons: ControllerButtonsPressed[],
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
    sound?: Sound,
    additionalPaints?: AdditionalPaints,
    UI: UI,
}

export const FACTION_ENEMY = "enemy";
export const FACTION_PLAYER = "player";
export const ANIMATION_END_BOSS_CROWN_OVERTAKE = "End Boss Crown Overtake";

export function createDefaultGameData(c: HTMLCanvasElement | undefined, ctx: CanvasRenderingContext2D | undefined): Game {
    const game: Game = {
        canvasElement: c,
        ctx: ctx,
        controllersButtons: [],
        state: {
            restartCounter: 0,
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
            clientInfos: [{ id: -1, name: "", lastMousePosition: { x: 0, y: 0 } }],
            map: createMap(),
            deathCircleCreated: false,
            bossStuff: {
                bossSpawnEachXMilliSecond: 60000,
                bossLevelCounter: 1,
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
            gameVersion: GAME_VERSION,
            achievements: createDefaultAchivements(),
        },
        gameSpeedSettings: {
            desiredUpdatesPerSecond: 60,
            maxTicksPerPaint: 10,
            minimalFramesPerSecondBeforeReducingUpdatesPerSecond: 30,
            ticksPerPaint: [0],
        },
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
            },
            gameStateCompare: {
                compareInterval: 3000,
                maxKeep: 10,
                timeAndHash: [],
                stateTainted: false,
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
            zoom: {
                factor: 1,
                max: 2,
                min: 0.5,
            },
            inputType: "keyboard",
            touchInfo: {
                touchMoveCornerSize: 150,
            },
            rectangles: {},
            damageMeter: createDamageMeter(),
            displayMovementKeyHint: false,
            movementKeyPressed: false,
            displayTextData: [],
            stackTextsData: createDefaultStackTextsData(),
            moreInfos: createDefaultEmptyMoreInfos(),
            displayMoreInfos: false,
            playerGlobalAlphaMultiplier: 1,
            paintClosesInteractableMoreInfo: false,
            moneyGainedThisRun: [],
            lastMouseDownWasUIClick: false,
        },
        sound: createSound(),
    }
    if (game.state.map.kingArea) {
        setDefaultNextKings(game);
    }
    game.state.map.seed = nextRandom(game.state.randomSeed);
    generateMissingChunks(game.state.map, [{ x: 0, y: 0 }], game.state.idCounter, game);
    const player = createPlayerWithPlayerCharacter(game.state.idCounter, game.state.clientInfos[0].id, { x: 0, y: 0 }, game.state.randomSeed, game);
    game.state.players.push(player);

    return game;
}

export function setDefaultNextKings(game: Game) {
    game.state.bossStuff.nextKings.north = createDefaultNextKing(game.state.idCounter, game);
    game.state.bossStuff.nextKings.west = createDefaultNextKing(game.state.idCounter, game);
    game.state.bossStuff.nextKings.south = createDefaultNextKing(game.state.idCounter, game);
    game.state.bossStuff.nextKings.east = createDefaultNextKing(game.state.idCounter, game);
}