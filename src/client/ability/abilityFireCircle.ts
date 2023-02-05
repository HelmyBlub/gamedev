import { Character } from "../character/characterModel.js";
import { Game, Position } from "../gameModel.js";
import { Projectile, createProjectile } from "../projectile.js";
import { RandomSeed, nextRandom } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, UpgradeOptionAbility } from "./ability.js";

const ABILITY_NAME = "FireCircle";
export type AbilityFireCircle = Ability & {    
    duration: number,
    damage: number,
    radius: number,
    baseRechargeTime: number,
    rechargeTimeDecreaseFaktor: number,
    maxCharges: number,
    currentCharges: number,
    nextRechargeTime: number,
}

export function addFireCircleAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME] = {
        tickAbility: tickAbilityFireCircle,
        createAbiltiyUpgradeOptions: createAbiltiyFireCircleUpgradeOptions,
        activeAbilityCast: castFireCircle,
    };
}

export function createAbilityFireCircle(
    duration: number = 2000,
    damage: number = 10,
    radius: number = 30,
    rechargeTime: number = 1000,
    maxCharges: number = 3
): AbilityFireCircle {
    if (ABILITIES_FUNCTIONS[ABILITY_NAME] === undefined) addFireCircleAbility();
    return {
        name: ABILITY_NAME,
        duration: duration,
        damage: damage,
        radius: radius,
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

function createAbiltiyFireCircleUpgradeOptions(): UpgradeOptionAbility[] {
    let upgradeOptions: UpgradeOptionAbility[] = [];
    upgradeOptions.push({
        name: "Damage+10", upgrade: (a: Ability) => {
            let as = a as AbilityFireCircle;
            as.damage += 10;
        },
    });
    upgradeOptions.push({
        name: "Radius+", upgrade: (a: Ability) => {
            let as = a as AbilityFireCircle;
            as.radius += 10;
        },
    });
    upgradeOptions.push({
        name: "Duration+", upgrade: (a: Ability) => {
            let as = a as AbilityFireCircle;
            as.duration += 1000;
        },
    });
    upgradeOptions.push({
        name: "RechargeTime-", upgrade: (a: Ability) => {
            let as = a as AbilityFireCircle;
            as.rechargeTimeDecreaseFaktor += 0.25;
        },
    });

    return upgradeOptions;
}

function castFireCircle(character: Character, ability: Ability, castPosition: Position, game: Game) {
    let abilityFireCircle = ability as AbilityFireCircle;
    if(abilityFireCircle.currentCharges > 0){
        game.state.projectiles.push(createProjectile(
            castPosition.x,
            castPosition.y,
            0,
            abilityFireCircle.damage,
            character.faction,
            0,
            game.state.time,
            10000,
            abilityFireCircle.duration
        ));
        if(abilityFireCircle.currentCharges === abilityFireCircle.maxCharges){
            abilityFireCircle.nextRechargeTime = game.state.time + abilityFireCircle.baseRechargeTime / abilityFireCircle.rechargeTimeDecreaseFaktor;
        }
        abilityFireCircle.currentCharges--;
    }
}
