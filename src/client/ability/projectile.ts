import { AbilityObject, detectAbilityObjectToCharacterHit } from "./ability.js";
import { Game, Position } from "../gameModel.js";

export type Projectile = AbilityObject & {
    moveSpeed: number,
    moveDirection: number,
    isMoving: boolean,
    deleteTime: number,
    pierceCount: number,
}

export function createProjectile(x: number, y: number, moveDirection: number, damage: number, faction: string, moveSpeed: number, gameTime: number, pierceCount: number, timeToLive: number, type: string): Projectile {
    return {
        type: type,
        x: x,
        y: y,
        size: 4,
        color: "white",
        moveSpeed: moveSpeed,
        moveDirection: moveDirection,
        isMoving: true,
        damage: damage,
        faction: faction,
        deleteTime: gameTime + timeToLive,
        pierceCount: pierceCount,
        paintOrder: "afterCharacterPaint",
    }
}

export function tickProjectile(abilityObject: AbilityObject, game: Game) {
    let projectile = abilityObject as Projectile;
    moveProjectileTick(projectile);
    detectAbilityObjectToCharacterHit(game.state.map, abilityObject, game.state.players);
}

function moveProjectileTick(projectile: Projectile) {
    if (projectile.isMoving) {
        projectile.x += Math.cos(projectile.moveDirection) * projectile.moveSpeed;
        projectile.y += Math.sin(projectile.moveDirection) * projectile.moveSpeed;
    }
}

export function deleteProjectile(abilityObject: AbilityObject, game: Game): boolean {
    let projectile = abilityObject as Projectile;
    return projectile.deleteTime <= game.state.time || projectile.pierceCount < 0;
}