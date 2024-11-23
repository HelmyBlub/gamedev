import { ABILITIES_FUNCTIONS, Ability } from "../../../ability/ability.js";
import { createAbilityMelee } from "../../../ability/abilityMelee.js";
import { createDarkClone } from "../../../curse/curseDarkness.js";
import { tickCharacterDebuffs } from "../../../debuff/debuff.js";
import { calculateDirection, calculateDistance, getNextId } from "../../../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { GAME_IMAGES, getImage } from "../../../imageLoad.js";
import { calculateMovePosition, findNearNonBlockingPosition, GameMap, isPositionBlocking, moveByDirectionAndDistance } from "../../../map/map.js";
import { findMapModifierById, GameMapModifier, removeMapModifier } from "../../../map/modifiers/mapModifier.js";
import { getShapeMiddle, isPositionInsideShape } from "../../../map/modifiers/mapModifierShapes.js";
import { nextRandom } from "../../../randomNumberGenerator.js";
import { getPlayerCharacters, getCharacterMoveSpeed, resetCharacter } from "../../character.js";
import { Character, CHARACTER_TYPE_FUNCTIONS, createCharacter } from "../../characterModel.js";
import { paintCharacterHpBar } from "../../characterPaint.js";
import { PathingCache } from "../../pathing.js";
import { addAbilityCurseDarkness, createObjectCurseDarkness } from "./abilityCurseDarkness.js";
import { createObjectCurseLightning } from "./abilityCurseLightning.js";
import { AreaBossEnemy, CHARACTER_TYPE_AREA_BOSS, scaleAreaBossHp } from "./areaBoss.js";

export type AreaBossEnemyLightningCloudMachine = AreaBossEnemy & {
};

export const AREA_BOSS_TYPE_LIGHTNING_CLOUD_MACHINE = "CloudMachine";

export function addAreaBossTypeLighntingCloudMachine() {
    CHARACTER_TYPE_FUNCTIONS[AREA_BOSS_TYPE_LIGHTNING_CLOUD_MACHINE] = {
        onCharacterKill: onDeath,
        paintCharacterType: paint,
        tickFunction: tick,
    };
}


export function createAreaBossLighntingCloudMachine(idCounter: IdCounter, spawn: Position, mapModifierIdRef: number, game: Game): AreaBossEnemyLightningCloudMachine {
    const scaling = 2;
    const bossSize = 40;
    const color = "black";
    const dummyValue = 1;
    const nonBlockingSpawn = findNearNonBlockingPosition(spawn, game.state.map, game.state.idCounter, game);

    const baseCharacter = createCharacter(getNextId(idCounter), nonBlockingSpawn.x, nonBlockingSpawn.y, bossSize, bossSize, color, dummyValue, dummyValue, FACTION_ENEMY, CHARACTER_TYPE_AREA_BOSS, dummyValue);
    const abilities: Ability[] = [];
    abilities.push(createAbilityMelee(game.state.idCounter));
    baseCharacter.abilities = abilities;
    const areaBoss: AreaBossEnemyLightningCloudMachine = { ...baseCharacter, mapModifierIdRef: mapModifierIdRef, areaBossType: AREA_BOSS_TYPE_LIGHTNING_CLOUD_MACHINE };
    scaleAreaBossHp(scaling, [areaBoss]);
    return areaBoss;
}

function onDeath(character: Character, game: Game) {
    const areaBoss = character as AreaBossEnemyLightningCloudMachine;
    const curse = createObjectCurseLightning(areaBoss, game);
    if (curse) game.state.abilityObjects.push(curse);
    removeMapModifier(areaBoss.mapModifierIdRef, game);
}

function paint(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    if (character.state === "dead") return;
    const areaBoss = character as AreaBossEnemyLightningCloudMachine;
    const areaBossPaintPos = getPointPaintPosition(ctx, character, cameraPosition, game.UI.zoom);
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(areaBossPaintPos.x, areaBossPaintPos.y, character.width / 2, 0, Math.PI * 2);
    ctx.fill();

    const hpBarPos = {
        x: Math.floor(areaBossPaintPos.x - character.width / 2),
        y: Math.floor(areaBossPaintPos.y - character.height / 2)
    };
    paintCharacterHpBar(ctx, character, hpBarPos);
}

function tick(enemy: Character, game: Game, pathingCache: PathingCache | null) {
    if (enemy.state === "dead") return;
    const spider = enemy as AreaBossEnemyLightningCloudMachine;
    const modifier = findMapModifierById(spider.mapModifierIdRef, game);
    if (!modifier) return;

    for (let ability of enemy.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions) {
            if (abilityFunctions.tickAI) abilityFunctions.tickAI(enemy, ability, game);
        }
    }
    tickCharacterDebuffs(enemy, game);
}
