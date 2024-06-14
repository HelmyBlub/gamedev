import { Character } from "../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../character/upgrade.js";
import { getNextId } from "../game.js";
import { Game, IdCounter } from "../gameModel.js";
import { MoreInfoPart, createMoreInfosPart } from "../moreInfo.js";
import { ABILITIES_FUNCTIONS, ABILITY_DEFAULT_SMALL_GROUP, Ability, AbilityOwner, getAbilityNameUiText } from "./ability.js";

type AbilityHpRegen = Ability & {
    amount: number,
    tickInterval: number,
    nextIntervalTick?: number,
}

const ABILITY_NAME_HP_REGEN = "HP Regen";
const START_HP_REG = 1;
const UPGRADE_HP_REG = 5;

export function addAbilityHpRegen() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_HP_REGEN] = {
        tickAbility: tickAbilityHpRegen,
        createAbilityUpgradeOptions: createAbilityHpRegenUpgradeOptions,
        executeUpgradeOption: executeAbilityHpRegenUpgradeOption,
        createAbility: createAbilityHpRegen,
        createAbilityMoreInfos: createAbilityHpRegenMoreInfos,
        resetAbility: reset,
    };
}

export function createAbilityHpRegen(
    idCounter: IdCounter,
    playerInputBinding?: string,
    regAmount: number = START_HP_REG,
): AbilityHpRegen {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_HP_REGEN,
        amount: regAmount,
        tickInterval: 500,
        passive: true,
        upgrades: {},
        tradable: true,
    };
}

function reset(ability: Ability) {
    const abilityHpRegen = ability as AbilityHpRegen;
    abilityHpRegen.nextIntervalTick = undefined;
}

function tickAbilityHpRegen(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityHpRegen = ability as AbilityHpRegen;
    if (abilityHpRegen.nextIntervalTick === undefined) {
        abilityHpRegen.nextIntervalTick = game.state.time + abilityHpRegen.tickInterval;
    }
    if (abilityHpRegen.nextIntervalTick <= game.state.time) {
        if (abilityOwner.hp === undefined || abilityOwner.maxHp === undefined) throw new Error("abilityOwner does not have HP for HPRegen ability");
        abilityHpRegen.nextIntervalTick += abilityHpRegen.tickInterval;
        if (abilityOwner.hp < abilityOwner.maxHp) {
            abilityOwner.hp += abilityHpRegen.amount;
            if (abilityOwner.hp > abilityOwner.maxHp) {
                abilityOwner.hp = abilityOwner.maxHp;
            }
        }
    }
}

function createAbilityHpRegenUpgradeOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const abilityReg = ability as AbilityHpRegen;
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    const upgradeCountReg = abilityReg.amount > START_HP_REG ? ` (${(abilityReg.amount - START_HP_REG) / UPGRADE_HP_REG + 1})` : "";

    const option: AbilityUpgradeOption = {
        displayText: `Hp Regen +${UPGRADE_HP_REG}${upgradeCountReg}`,
        type: "Ability",
        identifier: "Hp Regen",
        displayMoreInfoText: [`Increase hp reg from ${abilityReg.amount} to ${abilityReg.amount + UPGRADE_HP_REG} `],
        name: ability.name,
    }
    upgradeOptions.push({
        option: option,
        probability: 1,
    });
    return upgradeOptions;
}

function executeAbilityHpRegenUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityHpRegen = ability as AbilityHpRegen;
    if (upgradeOption.identifier === "Hp Regen") {
        abilityHpRegen.amount += UPGRADE_HP_REG;
        return;
    }
}

function createAbilityHpRegenMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilityHpRegen = ability as AbilityHpRegen;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Ability stats:`,
        `Hp Tick Interval: ${(abilityHpRegen.tickInterval / 1000).toFixed(2)}s`,
        `Hp Tick Amount: ${abilityHpRegen.amount}`,
    );
    return createMoreInfosPart(ctx, textLines, ABILITY_DEFAULT_SMALL_GROUP);
}
