import { findMyCharacter } from "../../character/character.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { FACTION_ENEMY, Game, Position } from "../../gameModel.js";
import { getPointPaintPosition, paintTextWithOutline } from "../../gamePaint.js";
import { Ability, AbilityOwner } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS, AbilityBounceBall } from "./abilityBounceBall.js";

export type AbilityBounceBallUpgradeBounceBonusDamage = AbilityUpgrade & {
    bounces: number,
    stackLossTime?: number,
    lossInterval: number,
    maxBounceBonus: number,
}

const STACK_LOSS_INTERVAL = 1500;
const BONUS_DAMAGE_PER_LEVEL = 0.25;
const MAX_BONUS_BOUNCE = 50;

export const ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE = "Bounce Bonus Damage";

export function addAbilityBounceBallUpgradeBounceBonusDamage() {
    ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getDamageFactor: getDamageFactor,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        reset: reset,
    }
}

export function abilityBounceBallUpgradeBounceBonusDamageAddBounce(ability: Ability) {
    const up: AbilityBounceBallUpgradeBounceBonusDamage = ability.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE];
    if (!up) return;
    up.bounces++;
    if (up.bounces > up.maxBounceBonus) up.bounces = up.maxBounceBonus;
}

export function abilityBounceBallUpgradeBounceBonusDamagePaintStacks(ctx: CanvasRenderingContext2D, ability: AbilityBounceBall, abiltiyOwner: AbilityOwner, cameraPosition: Position, game: Game) {
    const char = findMyCharacter(game);
    if (!char || char.id !== abiltiyOwner.id) return;
    const up: AbilityBounceBallUpgradeBounceBonusDamage = ability.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE];
    if (!up) return;
    ctx.font = "bold 16px arial";
    const paintPos = getPointPaintPosition(ctx, abiltiyOwner, cameraPosition, game.UI.zoom);
    paintTextWithOutline(ctx, "white", "black", up.bounces.toFixed(), paintPos.x, paintPos.y + 20, true, 3);
}

export function abilityBounceBallUpgradeBounceBonusDamageTick(ability: Ability, game: Game) {
    const up: AbilityBounceBallUpgradeBounceBonusDamage = ability.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE];
    if (!up) return;
    if (up.stackLossTime === undefined) up.stackLossTime = game.state.time + up.lossInterval;
    if (up.stackLossTime < game.state.time) {
        if (up.bounces > 0) up.bounces--;
        up.stackLossTime = game.state.time + up.lossInterval;
    }
}

function reset(ability: Ability) {
    const abilityBall = ability as AbilityBounceBall;
    const upgrade: AbilityBounceBallUpgradeBounceBonusDamage | undefined = abilityBall.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE];
    if (!upgrade) return;
    upgrade.bounces = 0;
    upgrade.stackLossTime = undefined;
}

function getDamageFactor(ability: Ability, playerTriggered: boolean, faction: string): number {
    const up: AbilityBounceBallUpgradeBounceBonusDamage = ability.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE];
    if (!up) return 1;
    let factor = up.level * up.bounces * BONUS_DAMAGE_PER_LEVEL;
    if (faction === FACTION_ENEMY) factor *= 0.1;
    return 1 + factor;
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const ball = ability as AbilityBounceBall;
    let up: AbilityBounceBallUpgradeBounceBonusDamage;
    if (ball.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE] === undefined) {
        up = { level: 0, bounces: 0, maxBounceBonus: MAX_BONUS_BOUNCE, lossInterval: 1000 };
        ball.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE] = up;
    } else {
        up = ball.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE];
    }
    up.level++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityBounceBallUpgradeBounceBonusDamage = ability.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE];
    const addMaxHint = up.bounces >= up.maxBounceBonus ? "(max)" : "";
    const bouncesText = `Stacks: ${up.bounces}${addMaxHint}`;
    return `${ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE} per stack: ${up.level * BONUS_DAMAGE_PER_LEVEL * 100}%. ${bouncesText}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityBounceBallUpgradeBounceBonusDamage | undefined = ability.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE];
    if (upgrade) {
        textLines.push(
            `Each bounce while rolling gives one stack which increases damage.`,
            `Bonus damage increase from ${BONUS_DAMAGE_PER_LEVEL * 100 * upgrade.level}% to ${BONUS_DAMAGE_PER_LEVEL * 100 * (upgrade.level + 1)}%.`,
            `Stacks decreas every ${STACK_LOSS_INTERVAL / upgrade.lossInterval}s.`,
            `Max stacks of ${MAX_BONUS_BOUNCE}.`,
        );
    } else {
        textLines.push(
            `Each bounce while rolling gives one stack which`,
            `increases damage by ${BONUS_DAMAGE_PER_LEVEL * 100}%.`,
            `Stacks decreas every ${STACK_LOSS_INTERVAL / 1000}s.`,
            `Max stacks of ${MAX_BONUS_BOUNCE}.`,
        );
    }
    return textLines;
}
