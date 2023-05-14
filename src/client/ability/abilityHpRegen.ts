import { getNextId } from "../game.js";
import { Game, IdCounter } from "../gameModel.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, UpgradeOptionAbility, paintDefaultAbilityStatsUI } from "./ability.js";

type AbilityHpRegen = Ability & {
    amount: number,
    tickInterval: number,
    nextIntervalTick?: number,
}

const ABILITY_NAME_HP_REGEN = "HP Regen";

export function addHpRegenAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_HP_REGEN] = {
        tickAbility: tickAbilityHpRegen,
        createAbiltiyUpgradeOptions: createAbilityHpRegenUpgradeOptions,
        createAbility: createAbilityHpRegen,
        paintAbilityStatsUI: paintAbilityHpRegenStatsUI,
        notInheritable: true,
        isPassive: true,
    };
}

export function createAbilityHpRegen(idCounter: IdCounter): AbilityHpRegen {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_HP_REGEN,
        amount: 1,
        tickInterval: 500,
        passive: true,
        upgrades: {},
    };
}

function tickAbilityHpRegen(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilityHpRegen= ability as AbilityHpRegen;
    if(abilityHpRegen.nextIntervalTick === undefined){
        abilityHpRegen.nextIntervalTick = game.state.time + abilityHpRegen.tickInterval;
    } 
    if(abilityHpRegen.nextIntervalTick <= game.state.time){
        if(abilityOwner.hp === undefined || abilityOwner.maxHp === undefined) throw new Error("abilityOwner does not have HP for HPRegen ability");
        abilityHpRegen.nextIntervalTick += abilityHpRegen.tickInterval;
        if(abilityOwner.hp < abilityOwner.maxHp){
            abilityOwner.hp += abilityHpRegen.amount;
            if(abilityOwner.hp > abilityOwner.maxHp){
                abilityOwner.hp = abilityOwner.maxHp;
            }
        }
    }
}

function createAbilityHpRegenUpgradeOptions(): UpgradeOptionAbility[] {
    let upgradeOptions: UpgradeOptionAbility[] = [];
    upgradeOptions.push({
        name: "Hp Regen+", probabilityFactor: 1, upgrade: (a: Ability) => {
            let abilityHpRegen = a as AbilityHpRegen;
            abilityHpRegen.amount += 1;
        }
    });

    return upgradeOptions;
}

function paintAbilityHpRegenStatsUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, game: Game): { width: number, height: number } {
    const abilityHpRegen = ability as AbilityHpRegen;
    const textLines: string[] = [
        `Ability: ${abilityHpRegen.name}`,
        `Ability stats:`,
        `Hp Tick Interval: ${(abilityHpRegen.tickInterval/1000).toFixed(2)}s`,
        `Hp Tick Amount: ${abilityHpRegen.amount}`,    
    ];
    return paintDefaultAbilityStatsUI(ctx, textLines, drawStartX, drawStartY);
}
