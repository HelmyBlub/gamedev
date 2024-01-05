import { Character } from "../../character/characterModel.js";
import { findCharacterClassById } from "../../character/playerCharacters/levelingCharacter.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { characterCreateAndAddUpgradeBonusHp } from "../../character/upgrades/characterUpgradeBonusHealth.js";
import { Ability, AbilityOwner } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS, AbilityLightningBall } from "./abilityLightningBall.js";

type AbilityLightningBallUpgradeLightningStrikesBuff = AbilityUpgrade & {
    healPerPixelTraveled: number
}

const HEAL_PER_PIXEL_TRAVELED = 0.1;
const BONUS_HP = 200;

export const ABILITY_LIGHTNING_BALL_UPGRADE_HP_LEACH = "HP Generation";

export function addAbilityLightningBallUpgradeHpLeach() {
    ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS[ABILITY_LIGHTNING_BALL_UPGRADE_HP_LEACH] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getLongExplainText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
    }
}

export function lightningBallUpgradeHpLeachExecute(ability: AbilityLightningBall, distanceTraveled: number, owner: AbilityOwner) {
    const up: AbilityLightningBallUpgradeLightningStrikesBuff = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_HP_LEACH];
    if (up && owner.hp) {
        owner.hp += up.healPerPixelTraveled * distanceTraveled;
        if (owner.hp > owner.maxHp!) {
            owner.hp = owner.maxHp;
        }
    }
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_LIGHTNING_BALL_UPGRADE_HP_LEACH);
    options[0].option.displayLongText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption, character: Character) {
    const as = ability as AbilityLightningBall;
    let up: AbilityLightningBallUpgradeLightningStrikesBuff;
    if (as.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_HP_LEACH] === undefined) {
        up = { level: 0, healPerPixelTraveled: 0 };
        as.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_HP_LEACH] = up;
    } else {
        up = as.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_HP_LEACH];
    }
    up.level++;
    const charClass = findCharacterClassById(character, ability.classIdRef!);
    characterCreateAndAddUpgradeBonusHp(charClass!, character, BONUS_HP);
    up.healPerPixelTraveled += HEAL_PER_PIXEL_TRAVELED;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityLightningBallUpgradeLightningStrikesBuff = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_HP_LEACH];
    return `${ABILITY_LIGHTNING_BALL_UPGRADE_HP_LEACH}: ${up.healPerPixelTraveled.toFixed(2)}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const up: AbilityLightningBallUpgradeLightningStrikesBuff | undefined = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_HP_LEACH];
    textLines.push(`Get an additional ${BONUS_HP} bonus HP.`);
    textLines.push(`When using Lightning Ball you will`);
    textLines.push(`heal for distance traveled.`);
    if (up) {
        textLines.push(`Increase heal per pixel from ${(HEAL_PER_PIXEL_TRAVELED * up.level).toFixed(2)} to ${(HEAL_PER_PIXEL_TRAVELED * (up.level + 1)).toFixed(2)}.`);
    } else {
        textLines.push(`${HEAL_PER_PIXEL_TRAVELED.toFixed(2)} heal per pixel traveled.`);
    }

    return textLines;
}
