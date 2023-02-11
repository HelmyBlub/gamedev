import { Character } from "../character/characterModel.js";
import { Game, Position } from "../gameModel.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, detectAbilityObjectToCharacterHit, UpgradeOptionAbility } from "./ability.js";

const ABILITY_NAME = "FireCircle";
export type AbilityFireCircle = Ability & {    
    objectDuration: number,
    damage: number,
    size: number,
    baseRechargeTime: number,
    rechargeTimeDecreaseFaktor: number,
    maxCharges: number,
    currentCharges: number,
    nextRechargeTime: number,
}

export type AbilityObjectFireCircle = AbilityObject & {
    deleteTime: number,
}

export function addFireCircleAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME] = {
        tickAbility: tickAbilityFireCircle,
        createAbiltiyUpgradeOptions: createAbiltiyFireCircleUpgradeOptions,
        activeAbilityCast: castFireCircle,
        tickAbilityObject: tickAbilityObject,
        deleteAbilityObject: deleteObjectFireCircle,
    };
}

export function createAbilityFireCircle(
    objectDuration: number = 2000,
    damage: number = 10,
    size: number = 30,
    rechargeTime: number = 2000,
    maxCharges: number = 3
): AbilityFireCircle {
    return {
        name: ABILITY_NAME,
        objectDuration: objectDuration,
        damage: damage,
        size: size,
        baseRechargeTime: rechargeTime,
        rechargeTimeDecreaseFaktor: 1,
        maxCharges: maxCharges,
        currentCharges: maxCharges,
        nextRechargeTime: 0,
        passive: false,
    };
}

export function tickAbilityFireCircle(character: Character, ability: Ability, game: Game) {
    let abilityFireCircle = ability as AbilityFireCircle;
    if(abilityFireCircle.currentCharges < abilityFireCircle.maxCharges){
        if(game.state.time >= abilityFireCircle.nextRechargeTime){
            abilityFireCircle.currentCharges++;
            abilityFireCircle.nextRechargeTime += abilityFireCircle.baseRechargeTime / abilityFireCircle.rechargeTimeDecreaseFaktor;
        }
    }
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    detectAbilityObjectToCharacterHit(game.state.map, abilityObject, game.state.players);
}

function deleteObjectFireCircle(abilityObject: AbilityObject, game: Game): boolean {
    let abilityFireCircle = abilityObject as AbilityObjectFireCircle;
    return abilityFireCircle.deleteTime <= game.state.time;
}

function createAbiltiyFireCircleUpgradeOptions(): UpgradeOptionAbility[] {
    let upgradeOptions: UpgradeOptionAbility[] = [];
    upgradeOptions.push({
        name: "Damage+10", upgrade: (a: Ability) => {
            let as = a as AbilityFireCircle;
            as.damage += 10;
        },
    });
    upgradeOptions.push({
        name: "Size+", upgrade: (a: Ability) => {
            let as = a as AbilityFireCircle;
            let addSize = Math.max(1, 10 - (as.size - 30)/40);
            as.size += addSize;
        },
    });
    upgradeOptions.push({
        name: "Duration+", upgrade: (a: Ability) => {
            let as = a as AbilityFireCircle;
            as.objectDuration += 250;
        },
    });
    upgradeOptions.push({
        name: "RechargeTime-", upgrade: (a: Ability) => {
            let as = a as AbilityFireCircle;
            as.rechargeTimeDecreaseFaktor += 0.15;
        },
    });

    return upgradeOptions;
}

function castFireCircle(character: Character, ability: Ability, castPosition: Position, game: Game) {
    let abilityFireCircle = ability as AbilityFireCircle;
    if(abilityFireCircle.currentCharges > 0){
        game.state.abilityObjects.push(createObjectFireCircle(
            castPosition.x,
            castPosition.y,
            abilityFireCircle.damage,
            character.faction,
            game.state.time,
            abilityFireCircle.objectDuration,
            abilityFireCircle.size
        ));
        if(abilityFireCircle.currentCharges === abilityFireCircle.maxCharges){
            abilityFireCircle.nextRechargeTime = game.state.time + abilityFireCircle.baseRechargeTime / abilityFireCircle.rechargeTimeDecreaseFaktor;
        }
        abilityFireCircle.currentCharges--;
    }
}

export function createObjectFireCircle(x: number, y: number, damage: number, faction: string, gameTime: number, duration: number, size: number): AbilityObjectFireCircle {
    return {
        type: 'FireCircle',
        x: x,
        y: y,
        size: size,
        color: "red",
        damage: damage,
        faction: faction,
        deleteTime: gameTime + duration,
        paintOrder: "beforeCharacterPaint",
    }
}