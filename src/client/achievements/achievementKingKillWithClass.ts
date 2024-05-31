import { KingEnemyCharacter } from "../character/enemy/kingEnemy.js";
import { Game } from "../gameModel.js";
import { MoreInfoPart, createMoreInfosPart } from "../moreInfo.js";
import { addMoneyAmountToPlayer, addMoneyUiMoreInfo } from "../player.js";
import { ACHIEVEMENTS_FUNCTIONS, Achievement } from "./achievements.js";

export const ACHIEVEMENT_NAME_CLASS_KING_KILL = "Class King Kill";
const REWARD_MONEY_AMOUNT = 100;

export type AchievementClassKingKill = Achievement & {
    kingClass: string,
}

export function addAchievementClassKingKill() {
    ACHIEVEMENTS_FUNCTIONS[ACHIEVEMENT_NAME_CLASS_KING_KILL] = {
        createMoreInfoPart: createMoreInfoPart,
        onGameEndCheck: onGameEndCheck,
        getDescription: getDescription,
        giveReward: giveReward,
    }
}

export function createAchievementKingClass(kingClass: string): AchievementClassKingKill {
    return {
        name: ACHIEVEMENT_NAME_CLASS_KING_KILL,
        kingClass: kingClass,
    }
}

function createMoreInfoPart(achievement: Achievement, ctx: CanvasRenderingContext2D): MoreInfoPart {
    const textLines: string[] = [`${achievement.name}:`];
    textLines.push(...getDescription(achievement));
    const part: MoreInfoPart = createMoreInfosPart(ctx, textLines);
    part.group = "KillWithClass";
    return part;
}

function getDescription(achievement: Achievement) {
    const kingClass = achievement as AchievementClassKingKill;
    return [
        `Kill a ${kingClass.kingClass} king`,
        `Reward: $${REWARD_MONEY_AMOUNT}.`,
    ];
}

function onGameEndCheck(achievement: Achievement, game: Game) {
    const kingClass = achievement as AchievementClassKingKill;
    if (!game.state.bossStuff.kingFightStarted) return false;
    let playerAlive = false;
    for (let player of game.state.players) {
        if (!player.character.isDead && !player.character.isPet) {
            playerAlive = true;
            break;
        }
    }
    if (!playerAlive) return false;
    let king: KingEnemyCharacter;
    for (let bosses of game.state.bossStuff.bosses) {
        if (bosses.characterClasses && bosses.characterClasses.findIndex(c => c.className === kingClass.kingClass) !== -1) {
            return true;
        }
    }
    return false;
}

function giveReward(achievement: Achievement, game: Game) {
    const kingClass = achievement as AchievementClassKingKill;
    addMoneyAmountToPlayer(REWARD_MONEY_AMOUNT, game.state.players, game, 20);
    addMoneyUiMoreInfo(REWARD_MONEY_AMOUNT, `for achievement: ${ACHIEVEMENT_NAME_CLASS_KING_KILL} of class ${kingClass.kingClass}`, game);
}
