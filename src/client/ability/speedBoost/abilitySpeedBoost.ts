import { findCharacterById, getPlayerCharacters } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { createBuffSlowTrail } from "../../debuff/buffSlowTrail.js";
import { createBuffSpeed } from "../../debuff/buffSpeed.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { getNextId } from "../../game.js";
import { Game, IdCounter, Position } from "../../gameModel.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, getAbilityNameUiText, paintDefaultAbilityStatsUI } from "../ability.js";
import { AbilityUpgradesFunctions, pushAbilityUpgradesOptions, pushAbilityUpgradesUiTexts, upgradeAbility } from "../abilityUpgrade.js";
import { ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE, AbilitySpeedBoostUpgradeAddCharge, addAbilitySpeedBoostUpgradeAddCharge, tickAbilitySpeedBoostUpgradeAddCharge } from "./abilitySpeedBoostUpgradeAddCharge.js";
import { addAbilitySpeedBoostUpgradeDuration } from "./abilitySpeedBoostUpgradeDuration.js";
import { ABILITY_SPEED_BOOST_UPGARDE_SLOW_TRAIL, addAbilitySpeedBoostUpgradeSlowTrail } from "./abilitySpeedBoostUpgradeSlowTrail.js";
import { addAbilitySpeedBoostUpgradeSpeed } from "./abilitySpeedBoostUpgradeSpeed.js";
import { addAbilitySpeedBoostUpgradeCooldown } from "./abilitySpeedBoostUpradeCooldown.js";

export type AbilitySpeedBoost = Ability & {
    speedFactor: number,
    duration: number,
    cooldown: number,
    cooldownFinishTime: number,
}

export const ABILITY_NAME_SPEED_BOOST = "SpeedBoost";
export const ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};

export function addAbilitySpeedBoost() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SPEED_BOOST] = {
        tickAbility: tickAbilitySpeedBoost,
        setAbilityToLevel: setAbilitySpeedBoostToLevel,
        createAbility: createAbilitySpeedBoost,
        activeAbilityCast: castSpeedBoost,
        paintAbilityUI: paintAbilitySpeedBoostUI,
        createAbilityBossUpgradeOptions: createAbilityBossSpeedBoostUpgradeOptions,
        executeUpgradeOption: executeAbilitySpeedBoostUpgradeOption,
        paintAbilityStatsUI: paintAbilitySpeedBoostStatsUI,
        resetAbility: resetAbility,
        abilityUpgradeFunctions: ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS,
        isPassive: false,
    };

    addAbilitySpeedBoostUpgradeAddCharge();
    addAbilitySpeedBoostUpgradeSlowTrail();
    addAbilitySpeedBoostUpgradeSpeed();
    addAbilitySpeedBoostUpgradeDuration();
    addAbilitySpeedBoostUpgradeCooldown();
}

export function createAbilitySpeedBoost(
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

function resetAbility(ability: Ability){
    const speed = ability as AbilitySpeedBoost;
    speed.cooldownFinishTime = 0;
}

function tickAbilitySpeedBoost(abilityOwner: AbilityOwner, ability: Ability, game: Game){
    const abilitySpeedBoost = ability as AbilitySpeedBoost;
    tickAbilitySpeedBoostUpgradeAddCharge(abilitySpeedBoost, game);
}

function castSpeedBoost(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isInputdown: boolean, game: Game) {
    if(!isInputdown) return;
    const abilitySpeedBoost = ability as AbilitySpeedBoost;
    const chargeUpgrade: AbilitySpeedBoostUpgradeAddCharge | undefined = ability.upgrades[ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE];
    const readyToCast = (chargeUpgrade && chargeUpgrade.currentCharges > 0) || (!chargeUpgrade && abilitySpeedBoost.cooldownFinishTime <= game.state.time);
    if (readyToCast) {
        const speedBuff = createBuffSpeed(abilitySpeedBoost.speedFactor, abilitySpeedBoost.duration, game.state.time);
        const character = findCharacterById(getPlayerCharacters(game.state.players), abilityOwner.id)!;
        applyDebuff(speedBuff, character, game);
        if(!chargeUpgrade){
            abilitySpeedBoost.cooldownFinishTime = game.state.time + abilitySpeedBoost.cooldown;
        }else{
            if(chargeUpgrade.currentCharges === chargeUpgrade.maxCharges){
                abilitySpeedBoost.cooldownFinishTime = game.state.time + abilitySpeedBoost.cooldown;
            }
            chargeUpgrade.currentCharges--;
        }

        if(ability.upgrades[ABILITY_SPEED_BOOST_UPGARDE_SLOW_TRAIL]){
            const slowTrail = createBuffSlowTrail(abilitySpeedBoost.duration, game.state.time);
            applyDebuff(slowTrail, character, game);
        }
    }
}

function paintAbilitySpeedBoostUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    let abilitySpeedBoost = ability as AbilitySpeedBoost;
    let fontSize = size;
    let rectSize = size;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.lineWidth = 1;
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();
    const upgrade: AbilitySpeedBoostUpgradeAddCharge = ability.upgrades[ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE];
    if (upgrade || game.state.time < abilitySpeedBoost.cooldownFinishTime) {
        ctx.fillStyle = "gray";
        const heightFactor = Math.max((abilitySpeedBoost.cooldownFinishTime - game.state.time) / abilitySpeedBoost.cooldown, 0);
        ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize * heightFactor);

        ctx.fillStyle = "black";
        const fontSize2 = Math.floor(size * 0.8);
        ctx.font = fontSize2 + "px Arial";
        const cooldownSeconds = Math.ceil((abilitySpeedBoost.cooldownFinishTime - game.state.time) / 1000);
        let displayNumber = cooldownSeconds;
        if(upgrade){
            displayNumber = upgrade.currentCharges;
        }
        ctx.fillText("" + displayNumber, drawStartX, drawStartY + rectSize - (rectSize - fontSize2 * 0.9));
    }


    if (abilitySpeedBoost.playerInputBinding) {
        let keyBind = "";
        game.clientKeyBindings[0].keyCodeToActionPressed.forEach((value, key) => {
            if (value.action === abilitySpeedBoost.playerInputBinding) {
                keyBind = value.uiDisplayInputValue;
            }
        });
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(keyBind, drawStartX + 1, drawStartY + 8);
    }
}

function paintAbilitySpeedBoostStatsUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, game: Game): { width: number, height: number } {
    const abilitySpeedBoost = ability as AbilitySpeedBoost;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(    
        `Key: ${playerInputBindingToDisplayValue(abilitySpeedBoost.playerInputBinding!, game)}`,
        `Ability stats: `,
        `Speed Increase: ${((abilitySpeedBoost.speedFactor - 1) * 100).toFixed()}%`,
        `Speed Duration: ${(abilitySpeedBoost.duration / 1000).toFixed(2)}s`,
        `Speed Cooldown: ${(abilitySpeedBoost.cooldown / 1000).toFixed(2)}s`,
    );
    pushAbilityUpgradesUiTexts(ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS, textLines, ability);

    return paintDefaultAbilityStatsUI(ctx, textLines, drawStartX, drawStartY);
}

function setAbilitySpeedBoostToLevel(ability: Ability, level: number) {
    let abilitySpeedBoost = ability as AbilitySpeedBoost;
    abilitySpeedBoost.speedFactor = 1.20 + 0.05 * level;
}

function createAbilityBossSpeedBoostUpgradeOptions(ability: Ability): UpgradeOptionAndProbability[] {
    let upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS, upgradeOptions, ability);
    return upgradeOptions;
}

function executeAbilitySpeedBoostUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game){
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    upgradeAbility(ability, character, abilityUpgradeOption);
}


