import { Game } from "../gameModel.js";
import { addMoneyAmountToPlayer, addMoneyUiMoreInfo } from "../player.js";
import { ACHIEVEMENTS_FUNCTIONS, Achievement } from "./achievements.js";

export const ACHIEVEMENT_NAME_BOSS_KILL = "Boss Kill";
const REWARD_MONEY_AMOUNT = 10;

export function addAchievementBossKill() {
    ACHIEVEMENTS_FUNCTIONS[ACHIEVEMENT_NAME_BOSS_KILL] = {
        onBossKillCheck: onBossKillCheck,
        getDescription: getDescription,
        giveReward: giveReward,
    }
}

function getDescription() {
    return [
        "Kill a boss.",
        `Reward: $${REWARD_MONEY_AMOUNT}.`,
    ];
}

function onBossKillCheck(achievement: Achievement, game: Game) {
    return true;
}

function giveReward(achievement: Achievement, game: Game) {
    addMoneyAmountToPlayer(REWARD_MONEY_AMOUNT, game.state.players, game, 20);
    addMoneyUiMoreInfo(REWARD_MONEY_AMOUNT, `for achievement: ${ACHIEVEMENT_NAME_BOSS_KILL}`, game);
}
