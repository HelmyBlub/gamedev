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
    moveSpeed: number,
    bulletSize: number,
    shootRandom?: boolean,
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
        setAbilityToBossLevel: setAbilityShootToBossLevel,
        isPassive: true,
        canBeUsedByBosses: true,
    };
}

export function createAbilityShoot(
    baseFrequency: number = 500,
    frequencyIncrease: number = 1,
    damage: number = 10,
    pierceCount: number = 0,
    multiShot: number = 0,
    timeToLive: number = 1000,
    moveSpeed: number = 2,
    bulletSize: number = 5,
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
        moveSpeed: moveSpeed,
        bulletSize: bulletSize,
    };
}

function setAbilityShootToLevel(ability: Ability, level: number){
    let abilityShoot = ability as AbilityShoot;
    abilityShoot.damage = level * 20;
    abilityShoot.frequencyIncrease = 1 + 0.2 * level;
    abilityShoot.multiShot = level - 1;
    abilityShoot.pierceCount = level - 1;
    abilityShoot.moveSpeed = 2 + level * 0.2;
    abilityShoot.bulletSize = 5 + level;
}

function setAbilityShootToBossLevel(ability: Ability, level: number){
    let abilityShoot = ability as AbilityShoot;
    abilityShoot.damage = level * 10;
    abilityShoot.frequencyIncrease = 1 + 0.2 * level;
    abilityShoot.multiShot = level - 1;
    abilityShoot.pierceCount = 0;
    abilityShoot.moveSpeed = 1;
    abilityShoot.timeToLive = 3000;
    abilityShoot.baseFrequency = 1000;
    abilityShoot.bulletSize = 5 + 5 * level;
    abilityShoot.shootRandom = true;
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
        name: "Damage+10", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilityShoot;
            as.damage += 10;
        },
    });
    upgradeOptions.push({
        name: "shootSpeed Up", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilityShoot;
            as.frequencyIncrease += 0.2;
        }
    });
    upgradeOptions.push({
        name: "Piercing+1", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilityShoot;
            as.pierceCount += 1;
        }
    });
    upgradeOptions.push({
        name: "MultiShot+1", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilityShoot;
            as.multiShot += 1;
        }
    });

    return upgradeOptions;
}

function shoot(abilityOwner: AbilityOwner, ability: AbilityShoot, abilityObjects: AbilityObject[], gameTime: number, randomSeed: RandomSeed) {
    for (let i = 0; i <= ability.multiShot; i++) {
        let shotSpread: number = (nextRandom(randomSeed) - 0.5) / 10 * ability.multiShot;

        let moveSpeed = ability.moveSpeed;
        if(abilityOwner.moveSpeed !== undefined){
            moveSpeed = abilityOwner.moveSpeed + 2;
        }
        let direction = 0;
        if(!ability.shootRandom && abilityOwner.moveDirection !== undefined){
            direction = abilityOwner.moveDirection;
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
            ability.bulletSize
        ));
    }
}
