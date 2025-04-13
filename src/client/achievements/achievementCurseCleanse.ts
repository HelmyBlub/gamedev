import { Game } from "../gameModel.js";
import { MAP_AREA_SPAWN_ON_DISTANCE_CURSE_CLEANSE } from "../map/mapCurseCleanseArea.js";
import { MAP_AREA_SPAWN_ON_DISTANCE_GOD } from "../map/mapGodArea.js";
import { MoreInfoPart, createMoreInfosPart } from "../moreInfo.js";
import { addMoneyAmountToPlayer, addMoneyUiMoreInfo } from "../player.js";
import { ACHIEVEMENTS_FUNCTIONS, Achievement } from "./achievements.js";

export const ACHIEVEMENT_NAME_CURSE_CLEANSE_LEGENDARY = "Curse Cleanse Legendary";
const REWARD_MONEY_AMOUNT = 10000;

export function addAchievementCurseCleanseLegendary() {
    ACHIEVEMENTS_FUNCTIONS[ACHIEVEMENT_NAME_CURSE_CLEANSE_LEGENDARY] = {
        createMoreInfoPart: createMoreInfoPart,
        onGameEndCheck: onGameEndCheck,
        getDescription: getDescription,
        giveReward: giveReward,
    }
}

function createMoreInfoPart(achievement: Achievement, ctx: CanvasRenderingContext2D): MoreInfoPart {
    const textLines: string[] = [`${achievement.name}:`];
    textLines.push(...getDescription());
    const part: MoreInfoPart = createMoreInfosPart(ctx, textLines);
    part.group = "Curse";
    return part;
}

function getDescription() {
    return [
        "Clease a legendary which is cursed",
        `Reward: $${REWARD_MONEY_AMOUNT}.`,
    ];
}

function onGameEndCheck(achievement: Achievement, game: Game) {
    if (game.state.bossStuff.areaSpawnFightStartedTime === undefined) return false;
    const area = game.state.map.areaSpawnOnDistance.find(a => a.id === game.state.bossStuff.areaSpawnIdFightStart);
    if (!area || area.type !== MAP_AREA_SPAWN_ON_DISTANCE_CURSE_CLEANSE) {
        return false;
    }

    let playerAlive = false;
    for (let player of game.state.players) {
        if (player.character.state === "alive") {
            playerAlive = true;
            break;
        }
    }
    const ifPlayerAliveMeansFountainBossIsKilled = playerAlive;
    return ifPlayerAliveMeansFountainBossIsKilled;
}

function giveReward(achievement: Achievement, game: Game) {
    addMoneyAmountToPlayer(REWARD_MONEY_AMOUNT, game.state.players, game, 20);
    addMoneyUiMoreInfo(REWARD_MONEY_AMOUNT, `for achievement: ${ACHIEVEMENT_NAME_CURSE_CLEANSE_LEGENDARY}`, game);
}
