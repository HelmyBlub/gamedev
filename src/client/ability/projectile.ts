import { AbilityObject, AbilityObjectCircle, detectAbilityObjectCircleToCharacterHit } from "./ability.js";
import { Game } from "../gameModel.js";

export type Projectile = AbilityObjectCircle & {
    moveSpeed: number,
    moveDirection: number,
    isMoving: boolean,
    deleteTime: number,
    pierceCount: number,
    damageTickInterval: number,
    nextDamageTickTime?: number,
}

export function createProjectile(x: number, y: number, moveDirection: number, damage: number, faction: string, moveSpeed: number, gameTime: number, pierceCount: number, timeToLive: number, type: string, abilityIdRef: number | undefined = undefined, radius: number = 2): Projectile {
    return {
        type: type,
        x: x,
        y: y,
        radius: radius,
        color: "white",
        moveSpeed: moveSpeed,
        moveDirection: moveDirection,
        isMoving: true,
        damage: damage,
        faction: faction,
        deleteTime: gameTime + timeToLive,
        pierceCount: pierceCount,
        damageTickInterval: 100,
        abilityIdRef: abilityIdRef,
    }
}

export function tickProjectile(abilityObject: AbilityObject, game: Game) {
    const projectile = abilityObject as Projectile;
    moveProjectileTick(projectile);
    if (projectile.nextDamageTickTime === undefined) projectile.nextDamageTickTime = game.state.time;
    if (projectile.nextDamageTickTime <= game.state.time) {
        detectAbilityObjectCircleToCharacterHit(game.state.map, projectile, game);
        projectile.nextDamageTickTime += projectile.damageTickInterval;
        if (projectile.nextDamageTickTime <= game.state.time) {
            projectile.nextDamageTickTime = game.state.time + projectile.damageTickInterval;
        }
    }
}

export function deleteProjectile(abilityObject: AbilityObject, game: Game): boolean {
    const projectile = abilityObject as Projectile;
    return projectile.deleteTime <= game.state.time || projectile.pierceCount < 0;
}

function moveProjectileTick(projectile: Projectile) {
    if (projectile.isMoving) {
        projectile.x += Math.cos(projectile.moveDirection) * projectile.moveSpeed;
        projectile.y += Math.sin(projectile.moveDirection) * projectile.moveSpeed;
    }
}
