import { findCharacterById, getPlayerCharacters } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { createBuffSpeed } from "../../debuff/buffSpeed.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { getNextId } from "../../game.js";
import { Game, IdCounter, Position } from "../../gameModel.js";
import { playerInputBindingToDisplayValue } from "../../input/playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, getAbilityNameUiText, paintAbilityUiDefault, paintAbilityUiKeyBind } from "../ability.js";
import { AbilityUpgradesFunctions, pushAbilityUpgradesOptions, pushAbilityUpgradesUiTexts, upgradeAbility } from "../abilityUpgrade.js";
import { ABILITY_SPEED_BOOST_UPGRADE_ADD_CHARGE, AbilitySpeedBoostUpgradeAddCharge, addAbilitySpeedBoostUpgradeAddCharge, tickAbilitySpeedBoostUpgradeAddCharge } from "./abilitySpeedBoostUpgradeAddCharge.js";
import { addAbilitySpeedBoostUpgradeDuration } from "./abilitySpeedBoostUpgradeDuration.js";
import { addAbilitySpeedBoostUpgradeSlowTrail, executeAbilitySpeedBoostUpgradeSlowTrail } from "./abilitySpeedBoostUpgradeSlowTrail.js";
import { addAbilitySpeedBoostUpgradeSpeed } from "./abilitySpeedBoostUpgradeSpeed.js";
import { addAbilitySpeedBoostUpgradeCooldown } from "./abilitySpeedBoostUpradeCooldown.js";
import { GAME_IMAGES } from "../../imageLoad.js";
import { addPaintFloatingTextInfoForMyself } from "../../floatingText.js";

export type AbilitySpeedBoost = Ability & {
    speedFactor: number,
    duration: number,
    cooldown: number,
    cooldownFinishTime: number,
}

export const IMAGE_NAME_RUN_SPEED = "run speed";
export const ABILITY_NAME_SPEED_BOOST = "SpeedBoost";
export const ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};
GAME_IMAGES[IMAGE_NAME_RUN_SPEED] = {
    imagePath: "/images/runspeed.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};

export function addAbilitySpeedBoost() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SPEED_BOOST] = {
        activeAbilityCast: castSpeedBoost,
        createAbility: createAbilitySpeedBoost,
        createAbilityBossUpgradeOptions: createAbilityBossSpeedBoostUpgradeOptions,
        createAbilityMoreInfos: createAbilitySpeedBoostMoreInfos,
        executeUpgradeOption: executeAbilitySpeedBoostUpgradeOption,
        paintAbilityUI: paintAbilitySpeedBoostUI,
        resetAbility: resetAbility,
        setAbilityToLevel: setAbilitySpeedBoostToLevel,
        tickAbility: tickAbilitySpeedBoost,
        abilityUpgradeFunctions: ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS,
        positionNotRquired: true,
    };

    addAbilitySpeedBoostUpgradeAddCharge();
    addAbilitySpeedBoostUpgradeSlowTrail();
    addAbilitySpeedBoostUpgradeSpeed();
    addAbilitySpeedBoostUpgradeDuration();
    addAbilitySpeedBoostUpgradeCooldown();
}

function createAbilitySpeedBoost(
    idCounter: IdCounter,
    playerInputBinding?: string,
): AbilitySpeedBoost {
    return {
        name: ABILITY_NAME_SPEED_BOOST,
        speedFactor: 1.5,
        cooldown: 18000,
        cooldownFinishTime: 0,
        duration: 3000,
        playerInputBinding: playerInputBinding,
        id: getNextId(idCounter),
        passive: false,
        upgrades: {},
        tradable: true,
    };
}

function resetAbility(ability: Ability) {
    const speed = ability as AbilitySpeedBoost;
    speed.cooldownFinishTime = 0;
}

function tickAbilitySpeedBoost(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilitySpeedBoost = ability as AbilitySpeedBoost;
    tickAbilitySpeedBoostUpgradeAddCharge(abilitySpeedBoost, game);
}

function castSpeedBoost(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, castPositionRelativeToCharacter: Position | undefined, isInputdown: boolean, game: Game) {
    if (!isInputdown) return;
    const abilitySpeedBoost = ability as AbilitySpeedBoost;
    const chargeUpgrade: AbilitySpeedBoostUpgradeAddCharge | undefined = ability.upgrades[ABILITY_SPEED_BOOST_UPGRADE_ADD_CHARGE];
    const readyToCast = (chargeUpgrade && chargeUpgrade.currentCharges > 0) || (!chargeUpgrade && abilitySpeedBoost.cooldownFinishTime <= game.state.time);
    if (readyToCast) {
        const speedBuff = createBuffSpeed(abilitySpeedBoost.speedFactor, abilitySpeedBoost.duration, game.state.time);
        const character = findCharacterById(getPlayerCharacters(game.state.players), abilityOwner.id)!;
        applyDebuff(speedBuff, character, game);
        if (!chargeUpgrade) {
            abilitySpeedBoost.cooldownFinishTime = game.state.time + abilitySpeedBoost.cooldown;
        } else {
            if (chargeUpgrade.currentCharges === chargeUpgrade.maxCharges) {
                abilitySpeedBoost.cooldownFinishTime = game.state.time + abilitySpeedBoost.cooldown;
            }
            chargeUpgrade.currentCharges--;
        }
        executeAbilitySpeedBoostUpgradeSlowTrail(abilitySpeedBoost, character, game);
    } else {
        const timeUntil = abilitySpeedBoost.cooldownFinishTime - game.state.time;
        addPaintFloatingTextInfoForMyself(`on cooldown`, game, timeUntil, abilityOwner.id, abilitySpeedBoost.id, IMAGE_NAME_RUN_SPEED);
    }
}

function paintAbilitySpeedBoostUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const abilitySpeedBoost = ability as AbilitySpeedBoost;
    const upgrade: AbilitySpeedBoostUpgradeAddCharge = ability.upgrades[ABILITY_SPEED_BOOST_UPGRADE_ADD_CHARGE];
    let heightFactor = 0;
    let displayNumber: number | undefined = undefined;
    if (upgrade || game.state.time < abilitySpeedBoost.cooldownFinishTime) {
        heightFactor = Math.max((abilitySpeedBoost.cooldownFinishTime - game.state.time) / abilitySpeedBoost.cooldown, 0);
        const cooldownSeconds = Math.ceil((abilitySpeedBoost.cooldownFinishTime - game.state.time) / 1000);
        displayNumber = cooldownSeconds;
        if (upgrade) {
            displayNumber = upgrade.currentCharges;
        }
    }
    paintAbilityUiDefault(ctx, ability, drawStartX, drawStartY, size, game, IMAGE_NAME_RUN_SPEED, heightFactor, displayNumber);
}

function createAbilitySpeedBoostMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilitySpeedBoost = ability as AbilitySpeedBoost;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilitySpeedBoost.playerInputBinding!, game)}`,
        `Ability stats: `,
        `Speed Increase: ${((abilitySpeedBoost.speedFactor - 1) * 100).toFixed()}%`,
        `Speed Duration: ${(abilitySpeedBoost.duration / 1000).toFixed(2)}s`,
        `Speed Cooldown: ${(abilitySpeedBoost.cooldown / 1000).toFixed(2)}s`,
    );
    pushAbilityUpgradesUiTexts(ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS, textLines, undefined, ability);

    return createMoreInfosPart(ctx, textLines);
}

function setAbilitySpeedBoostToLevel(ability: Ability, level: number) {
    const abilitySpeedBoost = ability as AbilitySpeedBoost;
    abilitySpeedBoost.speedFactor = 1.20 + 0.05 * level;
}

function createAbilityBossSpeedBoostUpgradeOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS, upgradeOptions, ability, character, game);
    return upgradeOptions;
}

function executeAbilitySpeedBoostUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    upgradeAbility(ability, character, abilityUpgradeOption);
}


