import { Character } from "../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../character/upgrade.js";
import { getNextId } from "../game.js";
import { Game, IdCounter } from "../gameModel.js";
import { StatsUIPart, createStatsUI } from "../statsUI.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, getAbilityNameUiText } from "./ability.js";

type AbilityHpRegen = Ability & {
    amount: number,
    tickInterval: number,
    nextIntervalTick?: number,
}

const ABILITY_NAME_HP_REGEN = "HP Regen";

export function addAbilityHpRegen() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_HP_REGEN] = {
        tickAbility: tickAbilityHpRegen,
        createAbilityUpgradeOptions: createAbilityHpRegenUpgradeOptions,
        executeUpgradeOption: executeAbilityHpRegenUpgradeOption,
        createAbility: createAbilityHpRegen,
        createAbilityStatsUI: createAbilityHpRegenStatsUI,
        resetAbility: reset,
    };
}

export function createAbilityHpRegen(
    idCounter: IdCounter,
    playerInputBinding?: string,
    regAmount: number = 1,
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
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    const option: AbilityUpgradeOption = {
        displayText: "Hp Regen +5",
        type: "Ability",
        identifier: "Hp Regen +5",
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
    if (upgradeOption.identifier === "Hp Regen +5") {
        abilityHpRegen.amount += 5;
        return;
    }
}

function createAbilityHpRegenStatsUI(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): StatsUIPart {
    const abilityHpRegen = ability as AbilityHpRegen;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Ability stats:`,
        `Hp Tick Interval: ${(abilityHpRegen.tickInterval / 1000).toFixed(2)}s`,
        `Hp Tick Amount: ${abilityHpRegen.amount}`,
    );
    return createStatsUI(ctx, textLines);
}
