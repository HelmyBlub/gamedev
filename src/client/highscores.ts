import { Character } from "./character/characterModel.js";
import { CHARACTER_TYPE_GOD_ENEMY, GodEnemyCharacter } from "./character/enemy/god/godEnemy.js";
import { CHARACTER_TYPE_KING_ENEMY } from "./character/enemy/kingEnemy.js";
import { calculateDistance, getTimeSinceFirstKill } from "./game.js";
import { Game } from "./gameModel.js";
import { getMapMidlePosition } from "./map/map.js";
import { MoreInfoPart, createMoreInfosPart } from "./moreInfo.js";
import { localStorageSaveHighscores } from "./permanentData.js";

export type Highscores = {
    scoreBoards: {
        [key: string]: HighscoreBoard,
    },
    lastBoard: string,
    lastHighscorePosition: number,
    maxLength: 10,
}

export type HighscoreEntry = {
    score: number,
    playerClass: string,
    scoreTypePrio?: number,
    scoreSuffix?: string,
}

export type HighscoreBoard = {
    scores: HighscoreEntry[],
    description: string[],
    scoreType?: string,
}
const TO_LOCAL_NO_DECIAMLS = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
}
const HIGHSCORE_DISTANCE = "Distance";
const HIGHSCORE_KING_TIME = "KingTime";
const HIGHSCORE_GOD_TIME = "GodTime";
const SCORE_PRIO_HP_PER_CENT = 4;
const SCORE_PRIO_KILL_DPS = 3;
const SCORE_PRIO_HARD_MODE_HP_PER_CENT = 2;
const SCORE_PRIO_HARD_MODE_KILL_DPS = 1;

export function createHighscoreBoards(): Highscores {
    const highscores: Highscores = {
        scoreBoards: {},
        maxLength: 10,
        lastHighscorePosition: 0,
        lastBoard: "",
    }
    highscores.scoreBoards[HIGHSCORE_DISTANCE] = {
        scores: [],
        description: [
            "Highscore number based on how far away",
            "from starting point the player died."
        ],
    }
    highscores.scoreBoards[HIGHSCORE_KING_TIME] = {
        scores: [],
        description: [
            "Highscore number based on damage per second",
            "or HP% of King kill."
        ]
    }
    createAndSetGodBoard(highscores);
    return highscores;
}

export function getHighestPlayerDistanceFromMapMiddle(game: Game): number {
    let highestPlayerDistance = 0;
    for (let player of game.state.players) {
        const distance = Math.round(calculateDistance(player.character, getMapMidlePosition(game.state.map)));
        if (distance > highestPlayerDistance) highestPlayerDistance = distance;
    }
    return highestPlayerDistance;
}

export function calculateHighscoreOnGameEnd(game: Game): number {
    let newScore: number = 0;
    let playerClass = "";
    const state = game.state;
    for (let i = 0; i < game.state.players.length; i++) {
        const player = game.state.players[i];
        if (player.character.characterClasses) {
            if (playerClass.length > 1) playerClass += ", ";
            playerClass += getPlayerClassesString(player.character);
        }
    }

    if (game.state.bossStuff.kingFightStartedTime !== undefined) {
        newScore = createAndPushKingScore(playerClass, game);
    } else if (game.state.bossStuff.godFightStartedTime !== undefined) {
        newScore = createAndPushGodScore(playerClass, game);
    } else {
        newScore = getHighestPlayerDistanceFromMapMiddle(game);
        const board = state.highscores.scoreBoards[HIGHSCORE_DISTANCE];
        board.scores.push({ score: newScore, playerClass: playerClass });
        game.UI.lastHighscoreText = `New Score (Distance): ${newScore}`;
        board.scores.sort((a, b) => b.score - a.score);
        state.highscores.lastHighscorePosition = board.scores.findIndex((e) => e.score === newScore);
        state.highscores.lastBoard = HIGHSCORE_DISTANCE;
        if (board.scores.length > state.highscores.maxLength) {
            board.scores.pop();
        }
    }
    localStorageSaveHighscores(game);
    return newScore;
}

export function createHighscoresMoreInfos(ctx: CanvasRenderingContext2D, highscores: Highscores): MoreInfoPart[] {
    const moreInfosParts: MoreInfoPart[] = [];
    const keys = Object.keys(highscores.scoreBoards);
    for (let key of keys) {
        const scoreBoard = highscores.scoreBoards[key];
        if (scoreBoard.scores.length === 0) continue;
        const textLines: string[] = [];
        textLines.push(...scoreBoard.description);
        textLines.push("");
        for (let i = 0; i < scoreBoard.scores.length; i++) {
            textLines.push(getHighscoreTextLine(i, scoreBoard));
        }
        moreInfosParts.push(createMoreInfosPart(ctx, textLines));
    }
    return moreInfosParts;
}

export function paintHighscores(ctx: CanvasRenderingContext2D, paintX: number, paintY: number, highscoreBoard: HighscoreBoard, lastHighscorePosition: number | undefined, fontSize: number): { width: number, height: number } {
    const textGap = 2;
    const textSpace = fontSize + textGap;
    ctx.font = fontSize + "px Arial";
    ctx.fillStyle = "black";
    const headingText = "Highscores:";
    const width = getHighscoreWidth(ctx, highscoreBoard, fontSize);
    const height = textSpace * (highscoreBoard.scores.length + 1) + 4;

    ctx.fillStyle = "white";
    ctx.fillRect(paintX, paintY, width, height);
    ctx.fillStyle = "black";
    ctx.fillText(headingText, paintX, paintY + textSpace - textGap);
    for (let i = 0; i < highscoreBoard.scores.length; i++) {
        if (i === lastHighscorePosition) {
            ctx.fillStyle = "lightblue";
            ctx.fillRect(paintX, paintY + textSpace * (i + 1) + 1, width, textSpace);
            ctx.fillStyle = "black";
        }
        ctx.fillText(getHighscoreTextLine(i, highscoreBoard), paintX, paintY + textSpace * (i + 2));
    }

    return { width, height };
}

function createAndPushGodScore(playerClass: string, game: Game): number {
    let newScore = 0;
    const board = game.state.highscores.scoreBoards[HIGHSCORE_GOD_TIME];
    const bosses = game.state.bossStuff.bosses;
    let god: GodEnemyCharacter | undefined;
    for (let boss of bosses) {
        if (boss.type !== CHARACTER_TYPE_GOD_ENEMY) continue;
        god = boss as GodEnemyCharacter;
        break;
    }

    if (god === undefined || game.state.bossStuff.godFightStartedTime === undefined) throw Error("should not be possible?");
    const hardModeText = god.hardModeActivated ? "Hard Mode " : "";
    if (god.hp <= 0) {
        newScore = god.maxHp / ((game.state.time - game.state.bossStuff.godFightStartedTime) / 1000);
        let scoreTypePrio = SCORE_PRIO_KILL_DPS;
        if (god.hardModeActivated) {
            scoreTypePrio = SCORE_PRIO_HARD_MODE_KILL_DPS;
        }
        board.scores.push({ score: newScore, playerClass: playerClass, scoreTypePrio: scoreTypePrio, scoreSuffix: "DPS" });
        game.UI.lastHighscoreText = `New Score (God ${hardModeText}Kill DPS): ${(newScore).toLocaleString(undefined, { maximumFractionDigits: 0 })} DPS`;
    } else {
        let scoreTypePrio = SCORE_PRIO_HP_PER_CENT;
        if (god.hardModeActivated) {
            scoreTypePrio = SCORE_PRIO_HARD_MODE_HP_PER_CENT;
        }
        newScore = god.hp / god.maxHp * 100;
        board.scores.push({ score: newScore, playerClass: playerClass, scoreTypePrio: scoreTypePrio, scoreSuffix: "%" });
        game.UI.lastHighscoreText = `New Score (God ${hardModeText}HP %): ${(newScore).toFixed(2)}%`;
    }
    board.scores.sort(highscoreSort);
    game.state.highscores.lastHighscorePosition = board.scores.findIndex((e) => e.score === newScore);
    game.state.highscores.lastBoard = HIGHSCORE_GOD_TIME;
    if (board.scores.length > game.state.highscores.maxLength) {
        board.scores.pop();
    }
    return newScore;
}

function createAndPushKingScore(playerClass: string, game: Game): number {
    let newScore = 0;
    const board = game.state.highscores.scoreBoards[HIGHSCORE_KING_TIME];
    const bosses = game.state.bossStuff.bosses;
    let king: Character | undefined;
    for (let boss of bosses) {
        if (boss.type !== CHARACTER_TYPE_KING_ENEMY) continue;
        king = boss as GodEnemyCharacter;
        break;
    }
    if (king === undefined || game.state.bossStuff.kingFightStartedTime === undefined) throw Error("should not be possible?");
    if (king.hp <= 0) {
        newScore = king.maxHp / ((game.state.time - game.state.bossStuff.kingFightStartedTime) / 1000);
        board.scores.push({ score: newScore, playerClass: playerClass, scoreTypePrio: SCORE_PRIO_KILL_DPS, scoreSuffix: "DPS" });
        game.UI.lastHighscoreText = `New Score (King Kill DPS): ${(newScore).toLocaleString(undefined, { maximumFractionDigits: 0 })} DPS`;
    } else {
        newScore = king.hp / king.maxHp * 100;
        board.scores.push({ score: newScore, playerClass: playerClass, scoreTypePrio: SCORE_PRIO_HP_PER_CENT, scoreSuffix: "%" });
        game.UI.lastHighscoreText = `New Score (King HP %): ${(newScore).toFixed(2)}%`;
    }
    board.scores.sort(highscoreSort);
    game.state.highscores.lastHighscorePosition = board.scores.findIndex((e) => e.score === newScore);
    game.state.highscores.lastBoard = HIGHSCORE_KING_TIME;
    if (board.scores.length > game.state.highscores.maxLength) {
        board.scores.pop();
    }
    return newScore;
}

function highscoreSort(entryA: HighscoreEntry, entryB: HighscoreEntry): number {
    if (entryA.scoreTypePrio === entryB.scoreTypePrio) {
        if (entryA.scoreTypePrio === SCORE_PRIO_KILL_DPS) {
            return entryB.score - entryA.score;
        } else {
            return entryA.score - entryB.score;
        }
    } else if (entryA.scoreTypePrio !== undefined && entryB.scoreTypePrio !== undefined) {
        return entryA.scoreTypePrio - entryB.scoreTypePrio;
    }
    return 0;
}

function createAndSetGodBoard(highscores: Highscores) {
    highscores.scoreBoards[HIGHSCORE_GOD_TIME] = {
        scores: [],
        description: [
            "Highscore number based on damage per second",
            "or HP% of God kill."
        ]
    }
    return highscores.scoreBoards[HIGHSCORE_GOD_TIME];
}

function getPlayerClassesString(character: Character): string {
    if (!character.characterClasses) return "";
    let result = "";
    for (let i = 0; i < character.characterClasses.length; i++) {
        const charClass = character.characterClasses[i];
        if (i > 0) result += "+";
        result += charClass.className;
        if (charClass.gifted) result += "[g]";
        if (charClass.legendary) result += "[L]";
    }
    return result;
}

function getHighscoreWidth(ctx: CanvasRenderingContext2D, highscoreBoard: HighscoreBoard, fontSize: number): number {
    ctx.font = fontSize + "px Arial";
    let resultWidth = 0;
    for (let i = 0; i < highscoreBoard.scores.length; i++) {
        const width = ctx.measureText(getHighscoreTextLine(i, highscoreBoard)).width;
        if (width > resultWidth) resultWidth = width;
    }
    return resultWidth;
}

function getHighscoreTextLine(index: number, highscoreBoard: HighscoreBoard): string {
    const isHardMode = (highscoreBoard.scores[index].scoreTypePrio === SCORE_PRIO_HARD_MODE_HP_PER_CENT || highscoreBoard.scores[index].scoreTypePrio === SCORE_PRIO_HARD_MODE_KILL_DPS);
    const hardModeText = isHardMode ? "(Hard Mode) " : "";
    if (highscoreBoard.scores[index].scoreSuffix !== undefined) {
        if (highscoreBoard.scores[index].scoreSuffix === "DPS") {
            return `${(index + 1)}: ${(highscoreBoard.scores[index].score).toLocaleString(undefined, TO_LOCAL_NO_DECIAMLS)} ${highscoreBoard.scores[index].scoreSuffix} ${hardModeText}(${highscoreBoard.scores[index].playerClass})`;
        } else {
            return `${(index + 1)}: ${(highscoreBoard.scores[index].score).toFixed(2)}${highscoreBoard.scores[index].scoreSuffix} ${hardModeText}(${highscoreBoard.scores[index].playerClass})`;
        }
    } else {
        return `${(index + 1)}: ${highscoreBoard.scores[index].score} (${highscoreBoard.scores[index].playerClass})`;
    }
}