import { Game } from "../gameModel.js";
import { getHighestPlayerDistanceFromMapMiddle } from "../highscores.js";
import { MoreInfoPart, createMoreInfosPart } from "../moreInfo.js";
import { addMoneyAmountToPlayer, addMoneyUiMoreInfo } from "../player.js";
import { ACHIEVEMENTS_FUNCTIONS, Achievement } from "./achievements.js";

export const ACHIEVEMENT_NAME_PLAY_CLASS = "Play Class";
const REWARD_MONEY = 10;
export type AchievementPlayClass = Achievement & {
    className: string,
}

export function addAchievementPlayClass() {
    ACHIEVEMENTS_FUNCTIONS[ACHIEVEMENT_NAME_PLAY_CLASS] = {
        createMoreInfoPart: createMoreInfoPart,
        getDescription: getDescription,
        giveReward: giveReward,
        onGameEndCheck: onGameEndCheck,
    }
}

export function createAchievementPlayClass(className: string): AchievementPlayClass {
    return {
        name: ACHIEVEMENT_NAME_PLAY_CLASS,
        className: className,
    }
}

function createMoreInfoPart(achievement: Achievement, ctx: CanvasRenderingContext2D): MoreInfoPart {
    const textLines: string[] = [`${achievement.name}:`];
    textLines.push(...getDescription(achievement));
    const part: MoreInfoPart = createMoreInfosPart(ctx, textLines);
    part.group = "PlayClass";
    return part;
}

function onGameEndCheck(achievement: Achievement, game: Game): boolean {
    const playClass = achievement as AchievementPlayClass;
    let someonePlayedClass = false;
    for (let player of game.state.players) {
        if (!player.character.characterClasses) continue;
        if (player.character.characterClasses.find(c => c.className === playClass.className)) {
            someonePlayedClass = true;
            break;
        }
    }
    return someonePlayedClass;
}

function getDescription(achievement: Achievement) {
    const playClass = achievement as AchievementPlayClass;
    return [
        `End a run with class ${playClass.className}.`,
        `Reward: $${REWARD_MONEY}.`,
    ];
}

function giveReward(achievement: Achievement, game: Game) {
    const playClass = achievement as AchievementPlayClass;
    addMoneyAmountToPlayer(REWARD_MONEY, game.state.players, game, 20);
    addMoneyUiMoreInfo(REWARD_MONEY, `for achievement: ${ACHIEVEMENT_NAME_PLAY_CLASS} ${playClass.className}`, game);
}
