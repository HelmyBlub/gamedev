import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Game, Position } from "../../gameModel.js";
import { Ability, AbilityOwner } from "../ability.js";
import { createAbilityObjectFireLine } from "../abilityFireLine.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS, AbilityBounceBall } from "./abilityBounceBall.js";

type AbilityBounceBallUpgradeFireLine = AbilityUpgrade & {
    startPosition?: Position,
}

const DURATION = 3000;
const DAMAGE_PER_SECOND_FACTOR = 1;
const TICK_INTERVAL = 250;

export const ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE = "Fire Line";

export function addAbilityBounceBallUpgradeFireLine() {
    ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS[ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getLongExplainText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
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
        const damage = ability.damage / (1000 / TICK_INTERVAL) * (1 + DAMAGE_PER_SECOND_FACTOR * up.level);
        const fireLine = createAbilityObjectFireLine(owner.faction, up.startPosition, endPos, damage, width, DURATION * up.level, TICK_INTERVAL, "red", ability.id, game);
        game.state.abilityObjects.push(fireLine);
        up.startPosition = { x: owner.x, y: owner.y };
    }
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE);
    options[0].option.displayLongText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const ball = ability as AbilityBounceBall;
    let up: AbilityBounceBallUpgradeFireLine;
    if (ball.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE] === undefined) {
        up = { level: 0 };
        ball.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE] = up;
    } else {
        up = ball.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE];
    }
    up.level++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityBounceBallUpgradeFireLine = ability.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE];
    return `${ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE}: ${(up.level)}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    textLines.push(`Create fire lines while rolling around.`);
    textLines.push(`Lasting ${(DURATION / 1000).toFixed(1)}s.`);
    textLines.push(`Doing ${DAMAGE_PER_SECOND_FACTOR * 100}% base damage per second.`);
    return textLines;
}
