import { Game } from "../gameModel.js";
import { ACHIEVEMENTS_FUNCTIONS } from "./achievements.js";
export const ACHIEVEMENT_NAME_GOD_KILL = "God Kill";

export function addAchievementGodKill() {
    ACHIEVEMENTS_FUNCTIONS[ACHIEVEMENT_NAME_GOD_KILL] = {
        onGameEndCheck: onGameEndCheck,
        getDescription: getDescription,
    }
}

function getDescription() {
    return "Kill a god";
}

function onGameEndCheck(game: Game) {
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
