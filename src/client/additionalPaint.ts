import { getCameraPosition } from "./game.js";
import { Game, Position } from "./gameModel.js";
import { getPointPaintPosition } from "./gamePaint.js";
import { calculateMovePosition } from "./map/map.js";

export type AdditionalPaints = {
    particles: ParticleEffect[],
}

type ParticleEffect = {
    moveDirection: number,
    moveMaxDistance: number,
    spawnPosition: Position,
    color: string,
    spawnTimer: number,
    duration: number,
    radius: number,
}

export function addParticleEffect(spawnPosition: Position, color: string, duration: number, radius: number, game: Game) {
    if (!game.additionalPaints) game.additionalPaints = createDefaultAdditionalPaints();
    const particle: ParticleEffect = {
        spawnPosition: { x: spawnPosition.x, y: spawnPosition.y, },
        color: color,
        duration: duration,
        spawnTimer: game.state.time,
        radius: radius,
        moveDirection: Math.random() * Math.PI / 2 - Math.PI * 3 / 4,
        moveMaxDistance: 40,
    }
    game.additionalPaints.particles.push(particle);
}

export function paintAdditionalPaints(ctx: CanvasRenderingContext2D, cameraPosition: Position, game: Game) {
    const paints = game.additionalPaints;
    if (!paints) return;
    for (let i = paints.particles.length - 1; i >= 0; i--) {
        const particle = paints.particles[i];
        if (particle.spawnTimer + particle.duration < game.state.time) {
            paints.particles.splice(i, 1);
            continue;
        }
        paintParticle(ctx, particle, cameraPosition, game);
    }
}

function paintParticle(ctx: CanvasRenderingContext2D, particle: ParticleEffect, cameraPosition: Position, game: Game) {
    ctx.fillStyle = particle.color;
    const spawnPaintPos = getPointPaintPosition(ctx, particle.spawnPosition, cameraPosition, game.UI.zoom, true);
    const factor = (game.state.time - particle.spawnTimer) / particle.duration;
    const paintPos = calculateMovePosition(spawnPaintPos, particle.moveDirection, particle.moveMaxDistance * factor, false);

    const alpha = Math.max(1 - factor, 0.1);
    ctx.globalAlpha *= alpha;
    ctx.beginPath();
    ctx.arc(paintPos.x, paintPos.y, particle.radius * factor, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha /= alpha;
}

function createDefaultAdditionalPaints(): AdditionalPaints {
    return {
        particles: [],
    }
}
