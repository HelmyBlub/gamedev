import { Game } from "../gameModel.js";
import { ACHIEVEMENTS_FUNCTIONS } from "./achievements.js";
export const ACHIEVEMENT_NAME_BOSS_KILL = "Boss Kill";

export function addAchievementBossKill() {
    ACHIEVEMENTS_FUNCTIONS[ACHIEVEMENT_NAME_BOSS_KILL] = {
        onBossKillCheck: onBossKillCheck,
        getDescription: getDescription,
    }
}

function getDescription() {
    return "Kill a boss";
}

function onBossKillCheck(game: Game) {
    return true;
}
