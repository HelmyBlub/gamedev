import { KingEnemyCharacter } from "../character/enemy/kingEnemy.js";
import { Game } from "../gameModel.js";
import { BUILDING_CLASS_BUILDING, ClassBuilding } from "../map/buildings/classBuilding.js";
import { MoreInfoPart, createMoreInfosPart } from "../moreInfo.js";
import { addMoneyAmountToPlayer, addMoneyUiMoreInfo } from "../player.js";
import { ACHIEVEMENTS_FUNCTIONS, Achievement } from "./achievements.js";

export const ACHIEVEMENT_NAME_UNLOCK_LEGENDARY_OF_CLASS = "Unlock Legendary of specific Class";
const REWARD_MONEY_AMOUNT = 200;

export type AchievementLegendaryClass = Achievement & {
    legendaryClass: string,
}

export function addAchievementUnlockLegendaryOfClass() {
    ACHIEVEMENTS_FUNCTIONS[ACHIEVEMENT_NAME_UNLOCK_LEGENDARY_OF_CLASS] = {
        createMoreInfoPart: createMoreInfoPart,
        onGameEndCheck: onGameEndCheck,
        getDescription: getDescription,
        giveReward: giveReward,
    }
}

export function createAchievementUnlockLegendaryOfClass(legendaryClass: string): AchievementLegendaryClass {
    return {
        name: ACHIEVEMENT_NAME_UNLOCK_LEGENDARY_OF_CLASS,
        legendaryClass,
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
    const legendaryClass = achievement as AchievementLegendaryClass;
    return [
        `Unlock Legendary of Class ${legendaryClass.legendaryClass}`,
        `Reward: $${REWARD_MONEY_AMOUNT}.`,
    ];
}

function onGameEndCheck(achievement: Achievement, game: Game) {
    if (!game.state.bossStuff.kingFightStarted) return false;
    const legendaryClass = achievement as AchievementLegendaryClass;
    let playerAlive = false;
    for (let player of game.state.players) {
        if (player.character.state === "alive") {
            playerAlive = true;
            break;
        }
    }
    if (!playerAlive) return false;
    let emptyBuilding = false;
    for (let building of game.state.buildings) {
        if (building.type === BUILDING_CLASS_BUILDING) {
            const classBuilding = building as ClassBuilding;
            if (classBuilding.characterClass === undefined) {
                emptyBuilding = true;
                break;
            }
        }
    }
    if (!emptyBuilding) return false;
    for (let bosses of game.state.bossStuff.bosses) {
        if (bosses.characterClasses && bosses.characterClasses.findIndex(c => c.className === legendaryClass.legendaryClass) !== -1) {
            return true;
        }
    }
    return false;
}

function giveReward(achievement: Achievement, game: Game) {
    const legendaryClass = achievement as AchievementLegendaryClass;
    addMoneyAmountToPlayer(REWARD_MONEY_AMOUNT, game.state.players, game, 20);
    addMoneyUiMoreInfo(REWARD_MONEY_AMOUNT, `for achievement: ${ACHIEVEMENT_NAME_UNLOCK_LEGENDARY_OF_CLASS} ${legendaryClass.legendaryClass}`, game);
}
