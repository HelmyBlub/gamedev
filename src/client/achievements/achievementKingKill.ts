import { Game } from "../gameModel.js";
import { ACHIEVEMENTS_FUNCTIONS } from "./achievements.js";
export const ACHIEVEMENT_NAME_KING_KILL = "King Kill";

export function addAchievementKingKill() {
    ACHIEVEMENTS_FUNCTIONS[ACHIEVEMENT_NAME_KING_KILL] = {
        onGameEndCheck: onGameEndCheck,
        getDescription: getDescription,
    }
}

function getDescription() {
    return "Kill a king";
}

function onGameEndCheck(game: Game) {
    if (!game.state.bossStuff.kingFightStarted) return false;
    let playerAlive = false;
    for (let player of game.state.players) {
        if (!player.character.isDead && !player.character.isPet) {
            playerAlive = true;
            break;
        }
    }
    const ifPlayerAliveMeansKingIsKilled = playerAlive;
    return ifPlayerAliveMeansKingIsKilled;
}
