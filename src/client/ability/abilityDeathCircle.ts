import { getPlayerCharacters, characterTakeDamage } from "../character/character.js";
import { GAME_MODE_WAVE_DEFENSE } from "../character/enemy/enemyWave.js";
import { calculateDistance, getCameraPosition, getNextId } from "../game.js";
import { FACTION_ENEMY, Game, IdCounter } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
import { GameMap } from "../map/map.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, PaintOrderAbility, AbilityObjectCircle } from "./ability.js";

export type AbilityDeathCircle = Ability & {
    damage: number,
    radius: number,
    growSpeed: number,
}

export type AbilityObjectDeathCircle = AbilityObjectCircle & {
    growSpeed: number,
    tickInterval: number,
    nextTickTime?: number,
    reversed?: boolean,
}

const ABILITY_NAME_DEATH_CIRCLE = "DeathCircle";
export function addAbilityDeathCircle() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_DEATH_CIRCLE] = {
        tickAbility: tickAbilityDeathCircle,
        tickAbilityObject: tickAbilityObjectDeathCircle,
        deleteAbilityObject: deleteObjectDeathCircle,
        createAbility: createAbilityDeathCircle,
        paintAbilityObject: paintAbilityObjectDeathCircle,
    };
}

export function createAbilityDeathCircle(idCounter: IdCounter): AbilityDeathCircle {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_DEATH_CIRCLE,
        damage: 10,
        passive: true,
        growSpeed: 1,
        radius: 0,
        upgrades: {},
    }
}

export function createObjectDeathCircle(reversed: boolean, map: GameMap): AbilityObjectDeathCircle {
    const mapCenter = (map.tileSize * map.chunkLength) / 2;
    return {
        type: ABILITY_NAME_DEATH_CIRCLE,
        radius: reversed ? 1500 : 0,
        color: "black",
        damage: 0.1,
        faction: FACTION_ENEMY,
        growSpeed: 0.25,
        x: mapCenter,
        y: mapCenter,
        tickInterval: 250,
        reversed: reversed,
    }
}

function deleteObjectDeathCircle(abilityObject: AbilityObject, game: Game): boolean {
    if (game.state.bossStuff.kingFightStartedTime !== undefined || game.state.bossStuff.areaSpawnFightStartedTime !== undefined) return true;
    return false;
}

function tickAbilityDeathCircle(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
}

function tickAbilityObjectDeathCircle(abilityObject: AbilityObject, game: Game) {
    const abilityObjectDeathCircle = abilityObject as AbilityObjectDeathCircle;
    if (!abilityObjectDeathCircle.reversed) {
        abilityObjectDeathCircle.radius += abilityObjectDeathCircle.growSpeed;
    } else {
        if (abilityObjectDeathCircle.radius > 800) abilityObjectDeathCircle.radius -= abilityObjectDeathCircle.growSpeed * 4;
    }
    if (abilityObjectDeathCircle.nextTickTime === undefined) abilityObjectDeathCircle.nextTickTime = game.state.time + abilityObjectDeathCircle.tickInterval;
    if (abilityObjectDeathCircle.nextTickTime > game.state.time) return;

    abilityObjectDeathCircle.nextTickTime += abilityObjectDeathCircle.tickInterval;
    abilityObjectDeathCircle.damage = Math.max(1, abilityObjectDeathCircle.radius / 200);

    const playerCharacters = getPlayerCharacters(game.state.players);
    for (let playerCharacter of playerCharacters) {
        const distance = calculateDistance(playerCharacter, abilityObject);
        if (abilityObjectDeathCircle.reversed) {
            if (distance > abilityObjectDeathCircle.radius) {
                characterTakeDamage(playerCharacter, abilityObject.damage, game, undefined, abilityObject.type);
            }
        } else {
            if (distance < abilityObjectDeathCircle.radius) {
                characterTakeDamage(playerCharacter, abilityObject.damage, game, undefined, abilityObject.type);
            }
        }
    }
}

function paintAbilityObjectDeathCircle(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder === "beforeCharacterPaint") {
        const abilityObjectDeathCircle = abilityObject as AbilityObjectDeathCircle;
        const cameraPosition = getCameraPosition(game);
        const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);

        ctx.fillStyle = abilityObject.color;
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        if (abilityObjectDeathCircle.reversed) {
            ctx.moveTo(0, 0);
            ctx.lineTo(ctx.canvas.width / game.UI.zoom.factor, 0);
            ctx.lineTo(ctx.canvas.width / game.UI.zoom.factor, ctx.canvas.height / game.UI.zoom.factor);
            ctx.lineTo(0, ctx.canvas.height / game.UI.zoom.factor);
            ctx.lineTo(0, 0);
            ctx.arc(
                paintPos.x,
                paintPos.y,
                abilityObjectDeathCircle.radius, 0, 2 * Math.PI,
                true,
            );

        } else {
            ctx.arc(
                paintPos.x,
                paintPos.y,
                abilityObjectDeathCircle.radius, 0, 2 * Math.PI,
            );
        }
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}