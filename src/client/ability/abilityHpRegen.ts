import { Game } from "../gameModel.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, UpgradeOptionAbility } from "./ability.js";

type AbilityHpRegen = Ability & {
    amount: number,
    tickInterval: number,
    nextIntervalTick?: number,
}

const ABILITY_NAME_LEASH = "HP Regen";

export function addHpRegenAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_LEASH] = {
        tickAbility: tickAbilityHpRegen,
        createAbiltiyUpgradeOptions: createAbilityHpRegenUpgradeOptions,
        createAbility: createAbilityHpRegen,
        paintAbilityStatsUI: paintAbilityHpRegenStatsUI,
        notInheritable: true,
        isPassive: true,
    };
}

export function createAbilityHpRegen(): AbilityHpRegen {
    return {
        name: ABILITY_NAME_LEASH,
        amount: 1,
        tickInterval: 500,
        passive: true,
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
    let abilityHpRegen = ability as AbilityHpRegen;
    const fontSize = 14;
    const width = 425;
    const height = 200;
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, width, height);
    ctx.font = fontSize + "px Arial";
    ctx.fillStyle = "black";
    let textLineCounter = 1;
    ctx.fillText("Ability:" + abilityHpRegen.name, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    textLineCounter++;
    ctx.fillText("Ability stats: ", drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    ctx.fillText(`Hp Tick Interval: ${(abilityHpRegen.tickInterval/1000).toFixed(2)}s`, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    ctx.fillText("Hp Tick Amount: " + abilityHpRegen.amount, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);

    return { width, height };
}
