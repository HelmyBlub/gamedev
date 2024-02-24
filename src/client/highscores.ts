import { Character } from "./character/characterModel.js";
import { findMainCharacterClass } from "./character/playerCharacters/playerCharacters.js";
import { calculateDistance, getTimeSinceFirstKill } from "./game.js";
import { Game } from "./gameModel.js";
import { paintKey } from "./gamePaint.js";
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

export type HighscoreBoard = {
    scores: {
        score: number,
        playerClass: string,
    }[],
    description: string[],
    scoreType?: string,
}

const HIGHSCORE_DISTANCE = "Distance";
const HIGHSCORE_KING_TIME = "KingTime";
const SCORE_TYPE_MILLISECONDS = "Score Type Milliseconds"

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
            "Highscore number based on time",
            "off end boss kill."
        ],
        scoreType: SCORE_TYPE_MILLISECONDS,
    }

    return highscores;
}

export function calculateHighscoreOnGameEnd(game: Game, isKingKill: boolean): number {
    let newScore: number = 0;
    let playerClass = "";
    const state = game.state;
    for (let i = 0; i < game.state.players.length; i++) {
        const player = game.state.players[i];
        if (player.character.characterClasses) {
            if (playerClass.length > 1) playerClass += ", ";
            playerClass += getPlayerClassesString(player.character);
        }
        const distance = Math.round(calculateDistance(player.character, getMapMidlePosition(state.map)));
        if (distance > newScore) newScore = distance;
    }

    if (isKingKill) {
        newScore = getTimeSinceFirstKill(game.state);
        const board = state.highscores.scoreBoards[HIGHSCORE_KING_TIME];
        board.scores.push({ score: newScore, playerClass: playerClass });
        game.UI.lastHighscore = { text: "New Score (King Kill Time): ", amount: newScore };
        board.scores.sort((a, b) => a.score - b.score);
        state.highscores.lastHighscorePosition = board.scores.findIndex((e) => e.score === newScore);
        state.highscores.lastBoard = HIGHSCORE_KING_TIME;
        if (board.scores.length > state.highscores.maxLength) {
            board.scores.pop();
        }
    } else {
        const board = state.highscores.scoreBoards[HIGHSCORE_DISTANCE];
        board.scores.push({ score: newScore, playerClass: playerClass });
        game.UI.lastHighscore = { text: "New Score (Distance): ", amount: newScore };
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
    if (highscoreBoard.scoreType === SCORE_TYPE_MILLISECONDS) {
        return `${(index + 1)}: ${(highscoreBoard.scores[index].score / 1000).toFixed(2)}s (${highscoreBoard.scores[index].playerClass})`;
    } else {
        return `${(index + 1)}: ${highscoreBoard.scores[index].score} (${highscoreBoard.scores[index].playerClass})`;
    }
}