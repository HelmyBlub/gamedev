import { Position } from "./game";

export type Projectile = Position & {
    size: number,
    color: string,
    moveSpeed: number,
    moveDirection: number,
    isMoving: boolean,
    damage: number,
    faction: string,
    deleteTime: number,
    pierceCount: number,
}

export function createProjectile(x: number, y: number, moveDirection: number, damage: number, faction: string, moveSpeed: number, gameTime: number, pierceCount: number, timeToLive: number) {
    return {
        x: x,
        y: y,
        size: 2,
        color: "white",
        moveSpeed: moveSpeed,
        moveDirection: moveDirection,
        isMoving: true,
        damage: damage,
        faction: faction,
        deleteTime: gameTime + timeToLive,
        pierceCount: pierceCount,
    }
}

export function tickProjectiles(projectiles: Projectile[], gameTime: number) {
    moveProjectilesTick(projectiles);
    removeProjectiles(projectiles, gameTime);
}

function moveProjectileTick(projectile: Projectile) {
    if (projectile.isMoving) {
        projectile.x += Math.cos(projectile.moveDirection) * projectile.moveSpeed;
        projectile.y += Math.sin(projectile.moveDirection) * projectile.moveSpeed;
    }
}

function moveProjectilesTick(projectiles: Projectile[]) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        moveProjectileTick(projectiles[i]);
    }
}

function removeProjectiles(projectiles: Projectile[], gameTime: number) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        if (projectiles[i].deleteTime <= gameTime || projectiles[i].pierceCount < 0) {
            projectiles.splice(i, 1);
        }
    }
}

export function paintProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[], cameraPosition: Position) {
    for (let i = 0; i < projectiles.length; i++) {
        paintProjectile(ctx, projectiles[i], cameraPosition);
    }
}

function paintProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile, cameraPosition: Position) {
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;

    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(
        projectile.x - cameraPosition.x + centerX,
        projectile.y - cameraPosition.y + centerY,
        projectile.size, 0, 2 * Math.PI
    );
    ctx.fill();
}
