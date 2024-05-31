import { CHARACTER_CLASS_BALL } from "../character/playerCharacters/characterClassBall.js"
import { CHARACTER_CLASS_MUSICIAN } from "../character/playerCharacters/characterClassMusician.js"
import { CHARACTER_CLASS_SNIPER } from "../character/playerCharacters/characterClassSniper.js"
import { CHARACTER_CLASS_TOWER_BUILDER } from "../character/playerCharacters/characterClassTower.js"
import { CHARACTER_CLASS_TAMER } from "../character/playerCharacters/tamer/characterClassTamer.js"
import { Game } from "../gameModel.js"
import { MoreInfoPart, MoreInfos, MoreInfosPartContainer, createDefaultMoreInfosContainer, createMoreInfosPart } from "../moreInfo.js"
import { localStorageSaveAchievements } from "../permanentData.js"
import { addAchievementBossKill } from "./achievementBossKill.js"
import { addAchievementGodKill } from "./achievementGodKill.js"
import { addAchievementKingKill } from "./achievementKingKill.js"
import { ACHIEVEMENT_NAME_PLAY_CLASS, addAchievementPlayClass, createAchievementPlayClass } from "./achievementPlayClass.js"
import { ACHIEVEMENT_NAME_DISTANCE, addAchievementDistance, createAchievementDistance } from "./achievementReachDistance.js"

export type Achievement = {
    name: string
}

export type Achievements = {
    open: Achievement[],
    finished: Achievement[],
}

export type AchievementFunctions = {
    createMoreInfoPart?: (achievement: Achievement, ctx: CanvasRenderingContext2D) => MoreInfoPart,
    onGameTickCheck?: (achievement: Achievement, game: Game) => boolean,
    onBossKillCheck?: (achievement: Achievement, game: Game) => boolean,
    onGameEndCheck?: (achievement: Achievement, game: Game) => boolean,
    giveReward?: (achievement: Achievement, game: Game) => void,
    getDescription: (achievement: Achievement) => string[],
}

export type AchievementsFunctions = {
    [key: string]: AchievementFunctions,
}

export const ACHIEVEMENTS_FUNCTIONS: AchievementsFunctions = {};

export function onDomLoadSetAchievementsFunctions() {
    addAchievementBossKill();
    addAchievementKingKill();
    addAchievementGodKill();
    addAchievementDistance();
    addAchievementPlayClass();
}

export function achievementCheckOnBossKill(achievements: Achievements, game: Game) {
    achievementCheck(achievements, "onBossKillCheck", game);
}

export function achievementCheckOnGameEnd(achievements: Achievements, game: Game) {
    achievementCheck(achievements, "onGameEndCheck", game);
}

export function achievementCheckOnGameTick(achievements: Achievements, game: Game) {
    achievementCheck(achievements, "onGameTickCheck", game);
}

function achievementCheck<K extends keyof AchievementFunctions>(achievements: Achievements, functionName: K, game: Game) {
    for (let i = achievements.open.length - 1; i >= 0; i--) {
        const achievement = achievements.open[i];
        const functions = ACHIEVEMENTS_FUNCTIONS[achievement.name];
        const func = functions[functionName];
        if (func) {
            let finished = func(achievement, game as any);
            if (finished) {
                finishAchievement(achievement, achievements, game);
            }
        }
    }
}

export function createDefaultAchivements(): Achievements {
    const achievements: Achievements = {
        open: [],
        finished: [],
    }
    const achievementKeys = Object.keys(ACHIEVEMENTS_FUNCTIONS);
    for (let key of achievementKeys) {
        if (key === ACHIEVEMENT_NAME_DISTANCE || key === ACHIEVEMENT_NAME_PLAY_CLASS) continue;
        achievements.open.push({ name: key });
    }
    achievements.open.push(createAchievementPlayClass(CHARACTER_CLASS_SNIPER));
    achievements.open.push(createAchievementPlayClass(CHARACTER_CLASS_BALL));
    achievements.open.push(createAchievementPlayClass(CHARACTER_CLASS_MUSICIAN));
    achievements.open.push(createAchievementPlayClass(CHARACTER_CLASS_TOWER_BUILDER));
    achievements.open.push(createAchievementPlayClass(CHARACTER_CLASS_TAMER));
    achievements.open.push(createAchievementDistance(2000, 2));
    achievements.open.push(createAchievementDistance(10000, 20));
    achievements.open.push(createAchievementDistance(40000, 500));
    achievements.open.push(createAchievementDistance(100000, 10000));
    return achievements;
}

export function createAchievementsMoreInfo(ctx: CanvasRenderingContext2D, moreInfos: MoreInfos, achievements: Achievements): MoreInfosPartContainer {
    const moreInfosContainer = createDefaultMoreInfosContainer(ctx, "Achievements", moreInfos.headingFontSize);
    const openAchievementsSubContainer = createDefaultMoreInfosContainer(ctx, "Open Achievements", moreInfos.headingFontSize);
    const finishedAchievementsSubContainer = createDefaultMoreInfosContainer(ctx, "Finished Achievements", moreInfos.headingFontSize);
    moreInfosContainer.subContainer.containers.push(openAchievementsSubContainer);
    moreInfosContainer.subContainer.containers.push(finishedAchievementsSubContainer);

    for (let entry of achievements.open) {
        const openAchievementsPart = getAchievementMoreInfoPart(entry, ctx);
        openAchievementsSubContainer.moreInfoParts.push(openAchievementsPart);
    }
    for (let entry of achievements.finished) {
        const finishedAchievementsPart = getAchievementMoreInfoPart(entry, ctx);
        finishedAchievementsSubContainer.moreInfoParts.push(finishedAchievementsPart);
    }
    return moreInfosContainer;
}

function finishAchievement(achievement: Achievement, achievements: Achievements, game: Game) {
    const functions = ACHIEVEMENTS_FUNCTIONS[achievement.name];
    const index = achievements.open.findIndex((a) => a === achievement);
    if (index === -1) {
        console.log(`achievement not found. Name: ${achievement.name}`, achievements);
        return;
    }
    achievements.open.splice(index, 1)[0];
    achievements.finished.push(achievement);
    if (functions.giveReward) functions.giveReward(achievement, game);
    localStorageSaveAchievements(game);
}

function getAchievementMoreInfoPart(achievement: Achievement, ctx: CanvasRenderingContext2D): MoreInfoPart {
    const functions = ACHIEVEMENTS_FUNCTIONS[achievement.name];
    if (functions.createMoreInfoPart) {
        return functions.createMoreInfoPart(achievement, ctx);
    } else {
        const textLines: string[] = [`${achievement.name}:`];
        textLines.push(...functions.getDescription(achievement));
        const part = createMoreInfosPart(ctx, textLines);
        return part;
    }
}

