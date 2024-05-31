import { Game } from "../gameModel.js";
import { getHighestPlayerDistanceFromMapMiddle } from "../highscores.js";
import { MoreInfoPart, createMoreInfosPart } from "../moreInfo.js";
import { addMoneyAmountToPlayer, addMoneyUiMoreInfo } from "../player.js";
import { ACHIEVEMENTS_FUNCTIONS, Achievement } from "./achievements.js";

export const ACHIEVEMENT_NAME_DISTANCE = "Reach Distance";
export type AchievementDistance = Achievement & {
    distance: number,
    rewardMoney: number,
}

export function addAchievementDistance() {
    ACHIEVEMENTS_FUNCTIONS[ACHIEVEMENT_NAME_DISTANCE] = {
        createMoreInfoPart: createMoreInfoPart,
        getDescription: getDescription,
        giveReward: giveReward,
        onGameTickCheck: onGameTickCheck,
    }
}

export function createAchievementDistance(distance: number, rewardMoney: number): AchievementDistance {
    return {
        name: ACHIEVEMENT_NAME_DISTANCE,
        distance,
        rewardMoney
    }
}

function createMoreInfoPart(achievement: Achievement, ctx: CanvasRenderingContext2D): MoreInfoPart {
    const textLines: string[] = [`${achievement.name}:`];
    textLines.push(...getDescription(achievement));
    const part: MoreInfoPart = createMoreInfosPart(ctx, textLines);
    part.group = "ReachDistance";
    return part;
}

function onGameTickCheck(achievement: Achievement, game: Game): boolean {
    const distance = achievement as AchievementDistance;
    const highestDistance = getHighestPlayerDistanceFromMapMiddle(game);
    return highestDistance >= distance.distance;
}

function getDescription(achievement: Achievement) {
    const distance = achievement as AchievementDistance;
    return [
        `Reach distance of ${distance.distance}.`,
        `Reward: $${distance.rewardMoney}.`,
    ];
}

function giveReward(achievement: Achievement, game: Game) {
    const distance = achievement as AchievementDistance;
    addMoneyAmountToPlayer(distance.rewardMoney, game.state.players, game);
    addMoneyUiMoreInfo(distance.rewardMoney, `for achievement: ${ACHIEVEMENT_NAME_DISTANCE} of ${distance.distance}`, game);
}
