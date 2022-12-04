export type Projectile = {
    x: number,
    y: number,
    size: number,
    color: string,
    moveSpeed: number,
    moveDirection: number,
    isMoving: boolean,
    damage: number,
    faction: string,
}

export function createProjectile(x: number, y: number, moveDirection: number, damage: number, faction: string, moveSpeed: number) {
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
    }
}

export function tickProjectiles(projectiles: Projectile[]) {
    moveProjectilesTick(projectiles);
    removeOutOfBoundsProjectiles(projectiles);
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

function removeOutOfBoundsProjectiles(projectiles: Projectile[]) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        if (projectiles[i].x < 0 || projectiles[i].y < 0
            || projectiles[i].x > 400 || projectiles[i].y > 300) {
            projectiles.splice(i, 1);
        }
    }
}

export function paintProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]) {
    for (let i = 0; i < projectiles.length; i++) {
        paintProjectile(ctx, projectiles[i]);
    }
}

function paintProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile) {
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.size, 0, 2 * Math.PI);
    ctx.fill();
}
