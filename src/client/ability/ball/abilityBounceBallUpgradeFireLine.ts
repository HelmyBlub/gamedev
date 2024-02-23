import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { calculateDistance } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { Ability, AbilityOwner } from "../ability.js";
import { createAbilityObjectFireLine } from "../abilityFireLine.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS, AbilityBounceBall } from "./abilityBounceBall.js";

type AbilityBounceBallUpgradeFireLine = AbilityUpgrade & {
    startPosition?: Position,
    damageFactor: number,
    duration: number,
}

const DURATION = 3000;
const DURATION_PER_LEVEL = 3000;
const DAMAGE_PER_SECOND_FACTOR = 1;
const TICK_INTERVAL = 250;

export const ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE = "Fire Line";

export function addAbilityBounceBallUpgradeFireLine() {
    ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS[ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        setUpgradeToBossLevel: setUpgradeToBossLevel,
    }
}

export function abilityBounceBallUpgradeFireLineStart(ability: AbilityBounceBall, owner: AbilityOwner, game: Game) {
    const up: AbilityBounceBallUpgradeFireLine = ability.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE];
    if (!up) return;
    up.startPosition = { x: owner.x, y: owner.y };
}

export function abilityBounceBallUpgradeFireLinePlace(ability: AbilityBounceBall, owner: AbilityOwner, game: Game) {
    const up: AbilityBounceBallUpgradeFireLine = ability.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE];
    if (!up) return;
    if (up.startPosition) {
        const width = 10;
        const endPos = { x: owner.x, y: owner.y };
        const distance = calculateDistance(up.startPosition, endPos);
        if (distance < 120) {
            const damage = ability.damage / (1000 / TICK_INTERVAL) * (1 + up.damageFactor);
            const fireLine = createAbilityObjectFireLine(owner.faction, up.startPosition, endPos, damage, width, up.duration, TICK_INTERVAL, "red", ability.id, game);
            game.state.abilityObjects.push(fireLine);
        }
        up.startPosition = { x: owner.x, y: owner.y };
    }
}

function setUpgradeToBossLevel(ability: Ability, level: number) {
    const up: AbilityBounceBallUpgradeFireLine = ability.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE];
    if (!up) return;
    up.level = level;
    up.duration = 1000 + level * 2000;
    up.damageFactor = 1;
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const ball = ability as AbilityBounceBall;
    let up: AbilityBounceBallUpgradeFireLine;
    if (ball.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE] === undefined) {
        up = { level: 0, damageFactor: DAMAGE_PER_SECOND_FACTOR, duration: DURATION };
        ball.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE] = up;
    } else {
        up = ball.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE];
        up.duration += DURATION_PER_LEVEL;
        up.damageFactor += DAMAGE_PER_SECOND_FACTOR;
    }
    up.level++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityBounceBallUpgradeFireLine = ability.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE];
    return `${ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE}: ${(DAMAGE_PER_SECOND_FACTOR * 100 * up.level)}%, ${(DURATION / 1000 * up.level).toFixed(1)}s`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const up: AbilityBounceBallUpgradeFireLine | undefined = ability.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE];
    if (up) {
        textLines.push(
            `Create fire lines while rolling around.`,
            `Duration increase from ${(DURATION / 1000 * up.level).toFixed(1)}s to ${(DURATION / 1000 * (up.level + 1)).toFixed(1)}s.`,
            `Damage per second increase from ${(DAMAGE_PER_SECOND_FACTOR * 100 * up.level)}% to ${DAMAGE_PER_SECOND_FACTOR * 100 * (up.level + 1)}%.`,
        );
    } else {
        textLines.push(`Create fire lines while rolling around.`);
        textLines.push(`Lasting ${(DURATION / 1000).toFixed(1)}s.`);
        textLines.push(`Doing ${DAMAGE_PER_SECOND_FACTOR * 100}% base damage per second.`);
    }
    return textLines;
}
