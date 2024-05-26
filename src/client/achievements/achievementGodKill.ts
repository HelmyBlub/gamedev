import { Game } from "../gameModel.js";
import { addMoneyAmountToPlayer, addMoneyUiMoreInfo } from "../player.js";
import { ACHIEVEMENTS_FUNCTIONS, Achievement } from "./achievements.js";

export const ACHIEVEMENT_NAME_GOD_KILL = "God Kill";
const REWARD_MONEY_AMOUNT = 5000;

export function addAchievementGodKill() {
    ACHIEVEMENTS_FUNCTIONS[ACHIEVEMENT_NAME_GOD_KILL] = {
        onGameEndCheck: onGameEndCheck,
        getDescription: getDescription,
        giveReward: giveReward,
    }
}

function getDescription() {
    return [
        "Kill a god",
        `Reward: $${REWARD_MONEY_AMOUNT}.`,
    ];
}

function onGameEndCheck(achievement: Achievement, game: Game) {
    if (!game.state.bossStuff.godFightStarted) return false;
    let playerAlive = false;
    for (let player of game.state.players) {
        if (!player.character.isDead && !player.character.isPet) {
            playerAlive = true;
            break;
        }
    }
    const ifPlayerAliveMeansGodIsKilled = playerAlive;
    return ifPlayerAliveMeansGodIsKilled;
}

function giveReward(achievement: Achievement, game: Game) {
    addMoneyAmountToPlayer(REWARD_MONEY_AMOUNT, game.state.players, game, 20);
    addMoneyUiMoreInfo(REWARD_MONEY_AMOUNT, `for achievement: ${ACHIEVEMENT_NAME_GOD_KILL}`, game);
}
