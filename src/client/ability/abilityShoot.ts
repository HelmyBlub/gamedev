import { FACTION_PLAYER, Game, IdCounter } from "../gameModel.js";
import { Projectile, createProjectile, tickProjectile, deleteProjectile } from "./projectile.js";
import { RandomSeed, nextRandom } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner } from "./ability.js";
import { getNextId } from "../game.js";

export const ABILITY_NAME_SHOOT = "Shoot";
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

export function addAbilityShoot() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SHOOT] = {
        tickAbility: tickAbilityShoot,
        tickAbilityObject: tickProjectile,
        deleteAbilityObject: deleteProjectile,
        onObjectHit: onShootHit,
        canObjectHitMore: canShootHitMore,
        setAbilityToLevel: setAbilityShootToLevel,
        createAbility: createAbilityShoot,
        setAbilityToBossLevel: setAbilityShootToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        canBeUsedByBosses: true,
    };
}

export function createAbilityShoot(
    idCounter: IdCounter,
    playerInputBinding?: string,
    baseFrequency: number = 500,
    frequencyIncrease: number = 1,
    damage: number = 50,
    pierceCount: number = 0,
    multiShot: number = 0,
    timeToLive: number = 1000,
    moveSpeed: number = 2,
    bulletSize: number = 5,
): AbilityShoot {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_SHOOT,
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
        upgrades: {},
    };
}

function setAbilityShootToLevel(ability: Ability, level: number) {
    const abilityShoot = ability as AbilityShoot;
    abilityShoot.damage = level * 100;
    abilityShoot.frequencyIncrease = 1 + 0.2 * level;
    abilityShoot.multiShot = Math.floor(level) - 1;
    abilityShoot.pierceCount = level - 1;
    abilityShoot.moveSpeed = 2 + level * 0.2;
    abilityShoot.bulletSize = 5 + level;
    if (abilityShoot.frequencyIncrease > 3) {
        const over = abilityShoot.frequencyIncrease - 3;
        abilityShoot.frequencyIncrease = 3;
        abilityShoot.damage *= 1 + over;
    }
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityShoot = ability as AbilityShoot;
    abilityShoot.damage = level * 4 * damageFactor;
    abilityShoot.frequencyIncrease = 1 + 0.04 * level;
    abilityShoot.multiShot = Math.min(Math.floor((level - 1) / 5), 7);
    abilityShoot.pierceCount = 0;
    abilityShoot.moveSpeed = Math.min(2.5 + level * 0.02, 4);
    abilityShoot.timeToLive = 2000;
    abilityShoot.baseFrequency = 1500;
    abilityShoot.bulletSize = Math.min(7 + 0.4 * level, 10);
    abilityShoot.shootRandom = true;
}

function setAbilityShootToBossLevel(ability: Ability, level: number) {
    const abilityShoot = ability as AbilityShoot;
    abilityShoot.damage = level * 50;
    abilityShoot.frequencyIncrease = 1 + 0.2 * level;
    abilityShoot.multiShot = Math.min(level - 1, 7);
    abilityShoot.pierceCount = 0;
    abilityShoot.moveSpeed = Math.min(2.5 + level * 0.2, 4);
    abilityShoot.timeToLive = 3000;
    abilityShoot.baseFrequency = 1000;
    abilityShoot.bulletSize = Math.min(7 + 1 * level, 13);
    abilityShoot.shootRandom = true;
}

function tickAbilityShoot(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityShoot = ability as AbilityShoot;
    if (abilityShoot.nextShotTime === -1) abilityShoot.nextShotTime = game.state.time;
    while (abilityShoot.nextShotTime <= game.state.time) {
        shoot(abilityOwner, abilityShoot, game.state.abilityObjects, game.state.time, game.state.randomSeed);
        abilityShoot.nextShotTime += abilityShoot.baseFrequency / abilityShoot.frequencyIncrease;
        if (abilityShoot.nextShotTime <= game.state.time) {
            abilityShoot.nextShotTime = game.state.time + abilityShoot.baseFrequency / abilityShoot.frequencyIncrease;
        }
    }
}

function onShootHit(abilityObject: AbilityObject) {
    const projectile = abilityObject as Projectile;
    projectile.pierceCount--;
}

function canShootHitMore(abilityObject: AbilityObject) {
    const projectile = abilityObject as Projectile;
    return projectile.pierceCount >= 0;
}

function shoot(abilityOwner: AbilityOwner, ability: AbilityShoot, abilityObjects: AbilityObject[], gameTime: number, randomSeed: RandomSeed) {
    for (let i = 0; i <= ability.multiShot; i++) {
        const shotSpread: number = (nextRandom(randomSeed) - 0.5) / 10 * ability.multiShot;

        let moveSpeed = ability.moveSpeed;
        if (abilityOwner.baseMoveSpeed !== undefined && abilityOwner.faction === FACTION_PLAYER) {
            moveSpeed = abilityOwner.baseMoveSpeed + 2;
        }
        let direction = 0;
        if (!ability.shootRandom && abilityOwner.moveDirection !== undefined) {
            direction = abilityOwner.moveDirection;
        } else {
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
            ABILITY_NAME_SHOOT,
            ability.id,
            ability.bulletSize
        ));
    }
}
