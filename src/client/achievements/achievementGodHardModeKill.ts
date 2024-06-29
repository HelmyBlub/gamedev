import { CHARACTER_TYPE_GOD_ENEMY, GodEnemyCharacter } from "../character/enemy/god/godEnemy.js";
import { Game } from "../gameModel.js";
import { MoreInfoPart, createMoreInfosPart } from "../moreInfo.js";
import { addMoneyAmountToPlayer, addMoneyUiMoreInfo } from "../player.js";
import { ACHIEVEMENTS_FUNCTIONS, Achievement } from "./achievements.js";

export const ACHIEVEMENT_NAME_GOD_HARD_MODE_KILL = "God Hard Mode Kill";
const REWARD_MONEY_AMOUNT = 500000;

export function addAchievementGodHardModeKill() {
    ACHIEVEMENTS_FUNCTIONS[ACHIEVEMENT_NAME_GOD_HARD_MODE_KILL] = {
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
    part.group = "Kill";
    return part;
}

function getDescription() {
    return [
        "Kill a god on hard mode",
        `Reward: $${REWARD_MONEY_AMOUNT}.`,
    ];
}

function onGameEndCheck(achievement: Achievement, game: Game) {
    if (!game.state.bossStuff.godFightStarted) return false;
    let playerAlive = false;
    for (let player of game.state.players) {
        if (player.character.state === "alive") {
            playerAlive = true;
            break;
        }
    }
    if (!playerAlive) return false;
    for (let boss of game.state.bossStuff.bosses) {
        if (boss.type === CHARACTER_TYPE_GOD_ENEMY) {
            let god = boss as GodEnemyCharacter;
            if (god.hardModeActivated) return true;
        }
    }
    return false;
}

function giveReward(achievement: Achievement, game: Game) {
    addMoneyAmountToPlayer(REWARD_MONEY_AMOUNT, game.state.players, game, 20);
    addMoneyUiMoreInfo(REWARD_MONEY_AMOUNT, `for achievement: ${ACHIEVEMENT_NAME_GOD_HARD_MODE_KILL}`, game);
}
