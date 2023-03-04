import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js";
import { Projectile, createProjectile, tickProjectile, deleteProjectile } from "./projectile.js";
import { RandomSeed, nextRandom } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, UpgradeOptionAbility } from "./ability.js";

const ABILITY_NAME = "Shoot";
export type AbilityShoot = Ability & {
    baseFrequency: number,
    frequencyIncrease: number,
    damage: number,
    nextShotTime: number,
    pierceCount: number,
    multiShot: number,
    timeToLive: number,
}

export function addShootAbility(){
    ABILITIES_FUNCTIONS[ABILITY_NAME] = {
        tickAbility: tickAbilityShoot,
        createAbiltiyUpgradeOptions: createAbiltiyShootUpgradeOptions,
        tickAbilityObject: tickProjectile,
        deleteAbilityObject: deleteProjectile,
        onHitAndReturnIfContinue: onShootHitAndReturnIfContinue,
        setAbilityToLevel: setAbilityShootToLevel,
        createAbility: createAbilityShoot,
        isPassive: true,
    };
}

export function createAbilityShoot(
    baseFrequency: number = 500,
    frequencyIncrease: number = 1,
    damage: number = 10,
    pierceCount: number = 0,
    multiShot: number = 0,
    timeToLive: number = 1000
): AbilityShoot {
    return {
        name: ABILITY_NAME,
        baseFrequency: baseFrequency,
        frequencyIncrease: frequencyIncrease,
        damage: damage,
        nextShotTime: -1,
        pierceCount: pierceCount,
        multiShot: multiShot,
        timeToLive: timeToLive,
        passive: true,
    };
}

function setAbilityShootToLevel(ability: Ability, level: number){
    let abilityShoot = ability as AbilityShoot;
    abilityShoot.damage = level * 10;
    abilityShoot.frequencyIncrease = 0.2 * level;
    abilityShoot.multiShot = level;
    abilityShoot.pierceCount = level;
}

function tickAbilityShoot(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilityShoot = ability as AbilityShoot;
    if(abilityShoot.nextShotTime === -1) abilityShoot.nextShotTime = game.state.time;
    while (abilityShoot.nextShotTime <= game.state.time) {
        shoot(abilityOwner, abilityShoot, game.state.abilityObjects, game.state.time, game.state.randomSeed);
        abilityShoot.nextShotTime += abilityShoot.baseFrequency / abilityShoot.frequencyIncrease;
    }
}

function onShootHitAndReturnIfContinue(abilityObject: AbilityObject){
    let projectile = abilityObject as Projectile;
    projectile.pierceCount--;
    return projectile.pierceCount >= 0;
}

function createAbiltiyShootUpgradeOptions(): UpgradeOptionAbility[]{
    let upgradeOptions: UpgradeOptionAbility[] = [];
    upgradeOptions.push({
        name: "Damage+10", upgrade: (a: Ability) => {
            let as = a as AbilityShoot;
            as.damage += 10;
        },
    });
    upgradeOptions.push({
        name: "shootSpeed Up", upgrade: (a: Ability) => {
            let as = a as AbilityShoot;
            as.frequencyIncrease += 0.2;
        }
    });
    upgradeOptions.push({
        name: "Piercing+1", upgrade: (a: Ability) => {
            let as = a as AbilityShoot;
            as.pierceCount += 1;
        }
    });
    upgradeOptions.push({
        name: "MultiShot+1", upgrade: (a: Ability) => {
            let as = a as AbilityShoot;
            as.multiShot += 1;
        }
    });

    return upgradeOptions;
}

function shoot(abilityOwner: AbilityOwner, ability: AbilityShoot, abilityObjects: AbilityObject[], gameTime: number, randomSeed: RandomSeed) {
    for (let i = 0; i <= ability.multiShot; i++) {
        let shotSpread: number = (nextRandom(randomSeed) - 0.5) / 10 * ability.multiShot;
        let anyOwner: any = abilityOwner;

        let moveSpeed = 2;
        if(anyOwner.moveSpeed !== undefined){
            moveSpeed = anyOwner.moveSpeed + 2;
        }
        let direction = 0;
        if(anyOwner.moveDirection !== undefined){
            direction = anyOwner.moveDirection;
        }else{
            direction = nextRandom(randomSeed) * Math.PI * 2;
        }
        abilityObjects.push(createProjectile(
            abilityOwner.x,
            abilityOwner.y,
            direction + shotSpread,
            ability.damage,
            abilityOwner.faction,
            moveSpeed,
            gameTime,
            ability.pierceCount,
            ability.timeToLive,
            ABILITY_NAME,
        ));
    }
}
