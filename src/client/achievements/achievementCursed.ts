import { Game } from "../gameModel.js";
import { MoreInfoPart, createMoreInfosPart } from "../moreInfo.js";
import { addMoneyAmountToPlayer, addMoneyUiMoreInfo } from "../player.js";
import { ACHIEVEMENTS_FUNCTIONS, Achievement, finishAchievement } from "./achievements.js";

export const ACHIEVEMENT_NAME_CURSED = "Get Cursed";
const REWARD_MONEY_AMOUNT = 150;

export function addAchievementCursed() {
    ACHIEVEMENTS_FUNCTIONS[ACHIEVEMENT_NAME_CURSED] = {
        createMoreInfoPart: createMoreInfoPart,
        getDescription: getDescription,
        giveReward: giveReward,
    }
}

function createMoreInfoPart(achievement: Achievement, ctx: CanvasRenderingContext2D): MoreInfoPart {
    const textLines: string[] = [`${achievement.name}:`];
    textLines.push(...getDescription(achievement));
    const part: MoreInfoPart = createMoreInfosPart(ctx, textLines);
    part.group = "Curse";
    return part;
}

export function achivementCursedOnGettingCursed(game: Game) {
    for (let i = game.state.achievements.open.length - 1; i >= 0; i--) {
        const achievement = game.state.achievements.open[i];
        if (achievement.name === ACHIEVEMENT_NAME_CURSED) {
            finishAchievement(achievement, game.state.achievements, game);
            return;
        }
    }
}

function getDescription(achievement: Achievement) {
    return [
        `Get Cursed.`,
        `Reward: $${REWARD_MONEY_AMOUNT}.`,
    ];
}

function giveReward(achievement: Achievement, game: Game) {
    addMoneyAmountToPlayer(REWARD_MONEY_AMOUNT, game.state.players, game, 0, `${ACHIEVEMENT_NAME_CURSED}: `);
    addMoneyUiMoreInfo(REWARD_MONEY_AMOUNT, `for achievement: ${ACHIEVEMENT_NAME_CURSED}`, game);
}
