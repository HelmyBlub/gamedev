import { Game } from "../gameModel.js";
import { MoreInfoPart, createMoreInfosPart } from "../moreInfo.js";
import { addMoneyAmountToPlayer, addMoneyUiMoreInfo } from "../player.js";
import { ACHIEVEMENTS_FUNCTIONS, Achievement } from "./achievements.js";

export const ACHIEVEMENT_NAME_GAIN_LEGENDARY_BLESSING = "Gain a Legendary Blessing";
const REWARD_MONEY_AMOUNT = 300;

export function addAchievementGainLegendaryBlessing() {
    ACHIEVEMENTS_FUNCTIONS[ACHIEVEMENT_NAME_GAIN_LEGENDARY_BLESSING] = {
        createMoreInfoPart: createMoreInfoPart,
        onGameEndCheck: onGameEndCheck,
        getDescription: getDescription,
        giveReward: giveReward,
    }
}

function createMoreInfoPart(achievement: Achievement, ctx: CanvasRenderingContext2D): MoreInfoPart {
    const textLines: string[] = [`${achievement.name}:`];
    textLines.push(...getDescription(achievement));
    const part: MoreInfoPart = createMoreInfosPart(ctx, textLines);
    part.group = "Legendary";
    return part;
}

function getDescription(achievement: Achievement) {
    return [
        `Gain a Legendary Blessing.`,
        `Reward: $${REWARD_MONEY_AMOUNT}.`,
    ];
}

function onGameEndCheck(achievement: Achievement, game: Game) {
    if (!game.state.bossStuff.kingFightStarted) return false;
    let playerAlive = false;
    for (let player of game.state.players) {
        if (player.character.state === "alive") {
            playerAlive = true;
            break;
        }
    }
    if (!playerAlive) return false;
    for (let boss of game.state.bossStuff.bosses) {
        if (boss.characterClasses) {
            for (let charClass of boss.characterClasses) {
                if (charClass.legendary) {
                    return true;
                }
            }
        }
    }
    return false;
}

function giveReward(achievement: Achievement, game: Game) {
    addMoneyAmountToPlayer(REWARD_MONEY_AMOUNT, game.state.players, game, 20);
    addMoneyUiMoreInfo(REWARD_MONEY_AMOUNT, `for achievement: ${ACHIEVEMENT_NAME_GAIN_LEGENDARY_BLESSING}`, game);
}
