import { Character } from "../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../character/upgrade.js";
import { getNextId } from "../game.js";
import { Game, IdCounter } from "../gameModel.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, paintDefaultAbilityStatsUI } from "./ability.js";

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
        paintAbilityStatsUI: paintAbilityHpRegenStatsUI,
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
    };
}

function reset(ability: Ability){
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
        displayText: "Hp Regen +1",
        type: "Ability",
        identifier: "Hp Regen+1",
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
    if (upgradeOption.identifier === "Hp Regen+1") {
        abilityHpRegen.amount += 1;
        return;
    }
}

function paintAbilityHpRegenStatsUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, game: Game): { width: number, height: number } {
    const abilityHpRegen = ability as AbilityHpRegen;
    const textLines: string[] = [
        `Ability: ${abilityHpRegen.name}`,
        `Ability stats:`,
        `Hp Tick Interval: ${(abilityHpRegen.tickInterval / 1000).toFixed(2)}s`,
        `Hp Tick Amount: ${abilityHpRegen.amount}`,
    ];
    return paintDefaultAbilityStatsUI(ctx, textLines, drawStartX, drawStartY);
}
