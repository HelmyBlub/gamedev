import { Game } from "./gameModel.js";
import { createDefaultMoreInfosContainer, createMoreInfosPart, MoreInfos, MoreInfosPartContainer } from "./moreInfo.js";
import { jsonParseNullAllowed } from "./permanentData.js";

export const PERMANENT_DATA_LOCALSTORAGE_GAME_STATISTICS = "HelmysGameStatistics";

export type GameStatistics = {
    storage: GameStatisticsLocalStorageData,
    lastSaveRealTime: number
    lastSaveGameTime: number
}

export type GameStatisticsLocalStorageData = {
    realTimePlayed: number,
    gameTimePlayed: number,
    runs: number,
}

export function statisticsCreate(): GameStatistics {
    let storage = jsonParseNullAllowed(localStorage.getItem(PERMANENT_DATA_LOCALSTORAGE_GAME_STATISTICS));
    if (!storage) {
        storage = {
            gameTimePlayed: 0,
            realTimePlayed: 0,
            runs: 0,
        };
    }
    return {
        storage: storage,
        lastSaveRealTime: performance.now(),
        lastSaveGameTime: 0,
    }
}

export function statisticsOnGameRestart(game: Game) {
    game.statistics.storage.gameTimePlayed += game.state.time - game.statistics.lastSaveGameTime;
    game.statistics.lastSaveGameTime = 0;

    const timeStampNow = performance.now();
    game.statistics.storage.realTimePlayed += timeStampNow - game.statistics.lastSaveRealTime;
    game.statistics.lastSaveRealTime = timeStampNow;

    saveToLocalStorage(game);
}

export function statisticsAddRun(game: Game) {
    game.statistics.storage.runs += 1;
    saveToLocalStorage(game);
}

export function createMoreInfoStatistics(moreInfos: MoreInfos, game: Game): MoreInfosPartContainer | undefined {
    if (!game.ctx || !game.statistics) return;
    const container = createDefaultMoreInfosContainer(game.ctx, "Statistics", moreInfos.headingFontSize);
    const realTimePlayed = game.statistics.storage.realTimePlayed + performance.now() - game.statistics.lastSaveRealTime;
    const gameTimePlayed = game.statistics.storage.gameTimePlayed + game.state.time - game.statistics.lastSaveGameTime;
    const someText = createMoreInfosPart(game.ctx, [
        `Real Time Played: ${timeToStringHHMMSS(realTimePlayed)}`,
        `Game Time Played: ${timeToStringHHMMSS(gameTimePlayed)}`,
        `Runs: ${game.statistics.storage.runs}`,
    ]);
    container.moreInfoParts.push(someText);
    return container;
}

function timeToStringHHMMSS(timeInMilliseconds: number): string {
    let result = "";
    const seconds = (timeInMilliseconds / 1000) % 60;
    if (timeInMilliseconds > 60 * 1000) {
        const minutes = (timeInMilliseconds / 1000 / 60) % 60;
        if (timeInMilliseconds > 60 * 60 * 1000) {
            const hours = (timeInMilliseconds / 1000 / 60 / 60);
            result += `${hours.toFixed()}:`;
            if (minutes < 10) result += "0";
        }
        result += `${minutes.toFixed()}:`;
        if (seconds < 10) result += "0";
    }
    result += `${seconds.toFixed()}`;
    return result;;
}

function saveToLocalStorage(game: Game) {
    localStorage.setItem(PERMANENT_DATA_LOCALSTORAGE_GAME_STATISTICS, JSON.stringify(game.statistics.storage));
}
