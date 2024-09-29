import { CHARACTER_TYPE_KING_ENEMY, KingEnemyCharacter } from "../character/enemy/kingEnemy.js";
import { Game } from "../gameModel.js";
import { MoreInfoPart, createMoreInfosPart } from "../moreInfo.js";
import { addMoneyAmountToPlayer, addMoneyUiMoreInfo } from "../player.js";
import { ACHIEVEMENTS_FUNCTIONS, Achievement } from "./achievements.js";

export const ACHIEVEMENT_NAME_UNLOCK_LEGENDARY = "Unlock Legendary";
const REWARD_MONEY_AMOUNT = 100;

export function addAchievementUnlockLegendary() {
    ACHIEVEMENTS_FUNCTIONS[ACHIEVEMENT_NAME_UNLOCK_LEGENDARY] = {
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
    part.group = "Legendary";
    return part;
}

function getDescription() {
    return [
        "Unlock A Legendary Class",
        `Reward: $${REWARD_MONEY_AMOUNT}.`,
    ];
}

function onGameEndCheck(achievement: Achievement, game: Game) {
    if (game.state.bossStuff.kingFightStartedTime === undefined) return false;
    let playerAlive = false;
    for (let player of game.state.players) {
        if (player.character.state === "alive") {
            playerAlive = true;
            break;
        }
    }
    if (!playerAlive) return false;
    for (let boss of game.state.bossStuff.bosses) {
        if (boss.type !== CHARACTER_TYPE_KING_ENEMY) continue;
        if (boss.characterClasses && boss.characterClasses.length > 0) {
            return true;
        }
    }
    return false;
}

function giveReward(achievement: Achievement, game: Game) {
    addMoneyAmountToPlayer(REWARD_MONEY_AMOUNT, game.state.players, game, 20);
    addMoneyUiMoreInfo(REWARD_MONEY_AMOUNT, `for achievement: ${ACHIEVEMENT_NAME_UNLOCK_LEGENDARY}`, game);
}
