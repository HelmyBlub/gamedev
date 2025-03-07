import { Game, Position } from "../../../gameModel.js";
import { Character, CHARACTER_TYPE_FUNCTIONS } from "../../characterModel.js";
import { paintCharacterAbilties } from "../../characterPaint.js";
import { addAreaBossTypeLighntingCloudMachine } from "./areaBossCloudMachine.js";
import { addAreaBossTypeDarknessSpider } from "./areaBossDarknessSpider.js";
import { addAreaBossTypePoisonPlant } from "./areaBossPoisonPlant.js";
import { addAreaBossTypeSnowman } from "./areaBossSnowman.js";

export type AreaBossEnemy = Character & {
    mapModifierIdRef: number,
    areaBossType: string,
}

export const CHARACTER_TYPE_AREA_BOSS = "AreaBoss";
export const AREA_BOSS_FUNCTIONS: {
    [key: string]: {
        tick: (areaBoss: AreaBossEnemy, game: Game) => void,
        onDeath: (areaBoss: AreaBossEnemy, game: Game) => void,
        paint: (ctx: CanvasRenderingContext2D, areaBoss: AreaBossEnemy, cameraPosition: Position, game: Game) => void,
        reset?: (areaBoss: AreaBossEnemy) => void,
        scaleWithBossLevel?: (areaBoss: AreaBossEnemy, level: number) => void,
    }
} = {};

export function addAreaBossType() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_AREA_BOSS] = {
        onCharacterKill: onDeath,
        paintCharacterType: paint,
        tickFunction: tick,
    };
    addAreaBossTypeDarknessSpider();
    addAreaBossTypeLighntingCloudMachine();
    addAreaBossTypeSnowman();
    addAreaBossTypePoisonPlant();
}

export function scaleAreaBossHp(level: number, bosses: Character[]) {
    const levelModifier = Math.max(3, level);
    for (let boss of bosses) {
        if (boss.type === CHARACTER_TYPE_AREA_BOSS) {
            const areaBoss = boss as AreaBossEnemy;
            const areaBossFunctions = AREA_BOSS_FUNCTIONS[areaBoss.areaBossType];
            if (areaBossFunctions.scaleWithBossLevel) {
                areaBossFunctions.scaleWithBossLevel(areaBoss, level);
            } else {
                areaBossScaleHp(areaBoss, level);
            }
        }
    }
}

export function areaBossScaleHp(areaBoss: AreaBossEnemy, level: number) {
    const levelModifier = Math.max(3, level);
    const currentHpPerCent = areaBoss.hp / areaBoss.maxHp;
    areaBoss.maxHp = 1000 * Math.pow(levelModifier, 4);
    areaBoss.hp = areaBoss.maxHp * currentHpPerCent;
    areaBoss.baseMoveSpeed = Math.min(6, 1.25 + levelModifier * 0.25);
    areaBoss.experienceWorth = Math.pow(levelModifier, 3) * 500;
}

function tick(character: Character, game: Game) {
    const areaBoss = character as AreaBossEnemy;
    const functions = AREA_BOSS_FUNCTIONS[areaBoss.areaBossType];
    functions.tick(areaBoss, game);
}

function paint(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    const areaBoss = character as AreaBossEnemy;
    const functions = AREA_BOSS_FUNCTIONS[areaBoss.areaBossType];
    functions.paint(ctx, areaBoss, cameraPosition, game);
    paintCharacterAbilties(ctx, character, cameraPosition, game);
}

function onDeath(character: Character, game: Game) {
    const areaBoss = character as AreaBossEnemy;
    const functions = AREA_BOSS_FUNCTIONS[areaBoss.areaBossType];
    functions.onDeath(areaBoss, game);
}

