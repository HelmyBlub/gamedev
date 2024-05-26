import { Game } from "../gameModel.js"
import { MoreInfos, MoreInfosPartContainer, createDefaultMoreInfosContainer, createMoreInfosPart } from "../moreInfo.js"
import { localStorageSaveAchievements } from "../permanentData.js"
import { addAchievementBossKill } from "./achievementBossKill.js"
import { addAchievementGodKill } from "./achievementGodKill.js"
import { addAchievementKingKill } from "./achievementKingKill.js"

export type Achievement = {
    name: string
}

export type Achievements = {
    open: Achievement[],
    finished: Achievement[],
}

export type AchievementFunctions = {
    onGameTickCheck?: (game: Game) => boolean,
    onBossKillCheck?: (game: Game) => boolean,
    onGameEndCheck?: (game: Game) => boolean,
    getDescription: () => string,
}

export type AchievementsFunctions = {
    [key: string]: AchievementFunctions,
}

export const ACHIEVEMENTS_FUNCTIONS: AchievementsFunctions = {};

export function onDomLoadSetAchievementsFunctions() {
    addAchievementBossKill();
    addAchievementKingKill();
    addAchievementGodKill();
}

export function achievementCheckOnBossKill(achievements: Achievements, game: Game) {
    for (let i = achievements.open.length - 1; i >= 0; i--) {
        const achievement = achievements.open[i];
        const functions = ACHIEVEMENTS_FUNCTIONS[achievement.name];
        if (functions.onBossKillCheck) {
            let finished = functions.onBossKillCheck(game);
            if (finished) {
                finishAchievement(achievement.name, achievements, game);
            }
        }
    }
}

export function achievementCheckOnGameEnd(achievements: Achievements, game: Game) {
    for (let i = achievements.open.length - 1; i >= 0; i--) {
        const achievement = achievements.open[i];
        const functions = ACHIEVEMENTS_FUNCTIONS[achievement.name];
        if (functions.onGameEndCheck) {
            let finished = functions.onGameEndCheck(game);
            if (finished) {
                finishAchievement(achievement.name, achievements, game);
            }
        }
    }
}

export function finishAchievement(achievementName: string, achievements: Achievements, game: Game) {
    const index = achievements.open.findIndex((a) => a.name === achievementName);
    if (index === -1) {
        console.log(`achievement not found. Name: ${achievementName}`, achievements);
        return;
    }
    const achievement = achievements.open.splice(index, 1)[0];
    achievements.finished.push(achievement);
    localStorageSaveAchievements(game);
}

export function createDefaultAchivements(): Achievements {
    const achievements: Achievements = {
        open: [],
        finished: [],
    }
    const achievementKeys = Object.keys(ACHIEVEMENTS_FUNCTIONS);
    for (let key of achievementKeys) {
        achievements.open.push({ name: key });
    }
    return achievements;
}

export function createAchievementsMoreInfo(ctx: CanvasRenderingContext2D, moreInfos: MoreInfos, achievements: Achievements): MoreInfosPartContainer {
    const moreInfosContainer = createDefaultMoreInfosContainer(ctx, "Achievements(Work in Progress)", moreInfos.headingFontSize);
    const openAchievementsSubContainer = createDefaultMoreInfosContainer(ctx, "Open Achievements", moreInfos.headingFontSize);
    const finishedAchievementsSubContainer = createDefaultMoreInfosContainer(ctx, "Finished Achievements", moreInfos.headingFontSize);
    moreInfosContainer.subContainer.containers.push(openAchievementsSubContainer);
    moreInfosContainer.subContainer.containers.push(finishedAchievementsSubContainer);

    for (let entry of achievements.open) {
        const openAchievementsPart = createMoreInfosPart(ctx, getMoreInfoPartTextLines(entry));
        openAchievementsSubContainer.moreInfoParts.push(openAchievementsPart);
    }
    for (let entry of achievements.finished) {
        const finishedAchievementsPart = createMoreInfosPart(ctx, getMoreInfoPartTextLines(entry));
        finishedAchievementsSubContainer.moreInfoParts.push(finishedAchievementsPart);
    }
    return moreInfosContainer;
}

function getMoreInfoPartTextLines(achievement: Achievement): string[] {
    const textLines: string[] = [`${achievement.name}:`];
    const functions = ACHIEVEMENTS_FUNCTIONS[achievement.name];
    textLines.push(functions.getDescription());
    return textLines;

}

