import { ABILITIES_FUNCTIONS, Ability } from "../../../ability/ability.js";
import { tickCharacterDebuffs } from "../../../debuff/debuff.js";
import { calculateDirection, calculateDistance, getNextId } from "../../../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { calculateMovePosition, findNearNonBlockingPosition } from "../../../map/map.js";
import { getPlayerCharacters, determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, moveCharacterTick } from "../../character.js";
import { Character, CHARACTER_TYPE_FUNCTIONS, createCharacter } from "../../characterModel.js";
import { paintCharacterHpBar, paintCharacterWithAbilitiesDefault } from "../../characterPaint.js";
import { PathingCache } from "../../pathing.js";
import { AreaBossEnemyCharacter, areaBossOnCharacterKill, resetAreaBossIfOutsideModifierArea } from "./areaBossEnemy.js";

type AreaBossEnemyDarknessSpider = AreaBossEnemyCharacter & {
    legs: SpiderLegs,
};

type SpiderLegs = {
    positions: Position[],
    length: number,
    phase: number,
    phaseChangeTime?: number,
    changeInterval: number,
}
const SPIDER_LEGS_OFFSETS: Position[] = [
    { x: -30, y: -30 }, { x: 30, y: -30 },
    { x: -30, y: -10 }, { x: 30, y: -10 },
    { x: -30, y: +10 }, { x: 30, y: +10 },
    { x: -30, y: +30 }, { x: 30, y: +30 },
]
export const CHARACTER_TYPE_AREA_BOSS_DARKNESS_SPIDER = "DarknessSpider";

export function addAreaBossTypeDarknessSpider() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_AREA_BOSS_DARKNESS_SPIDER] = {
        onCharacterKill: areaBossOnCharacterKill,
        paintCharacterType: paintSpider,
        tickFunction: tickAreaBossEnemyCharacter,
    };
    //addAbilityCurseDarkness(); //TODO
}


export function createAreaBossDarknessSpiderWithLevel(idCounter: IdCounter, spawn: Position, mapModifierIdRef: number, game: Game): AreaBossEnemyCharacter {
    const scaling = 2;
    const bossSize = 40;
    const color = "black";
    const moveSpeed = Math.min(6, 1.5 + scaling * 0.5);
    const hp = 1000 * Math.pow(scaling, 4);
    const experienceWorth = Math.pow(scaling, 3) * 500;
    const nonBlockingSpawn = findNearNonBlockingPosition(spawn, game.state.map, game.state.idCounter, game);

    const baseCharacter = createCharacter(getNextId(idCounter), nonBlockingSpawn.x, nonBlockingSpawn.y, bossSize, bossSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_AREA_BOSS_DARKNESS_SPIDER, experienceWorth);
    const abilities: Ability[] = [];
    baseCharacter.abilities = abilities;
    const spiderLegs = getInitialSpiderLegs(baseCharacter);
    const areaBoss: AreaBossEnemyDarknessSpider = { ...baseCharacter, mapModifierIdRef: mapModifierIdRef, legs: spiderLegs };
    return areaBoss;
}

function paintSpider(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    if (character.state === "dead") return;
    const spider = character as AreaBossEnemyDarknessSpider;
    const paintPos = getPointPaintPosition(ctx, character, cameraPosition, game.UI.zoom);
    //    paintCharacterWithAbilitiesDefault(ctx, character, cameraPosition, game);
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    //middle
    ctx.beginPath();
    ctx.arc(paintPos.x, paintPos.y, character.width / 2, 0, Math.PI * 2);
    ctx.fill();
    //legs
    for (let i = 0; i < 8; i++) {
        const legPosition = spider.legs.positions[i];
        const paintPosLeg = getPointPaintPosition(ctx, legPosition, cameraPosition, game.UI.zoom);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(paintPos.x, paintPos.y);
        ctx.lineTo(paintPosLeg.x, paintPosLeg.y);
        ctx.stroke();
    }

    const hpBarPos = {
        x: Math.floor(paintPos.x - character.width / 2),
        y: Math.floor(paintPos.y - character.height / 2)
    };

    paintCharacterHpBar(ctx, character, hpBarPos);
}

function getInitialSpiderLegs(bodyCenter: Position): SpiderLegs {
    const legs: SpiderLegs = {
        changeInterval: 300,
        length: 40,
        phase: 0,
        positions: [],
    };
    for (let i = 0; i < 8; i++) {
        legs.positions.push({ x: 0, y: 0 });
    }
    resetLegPosition(legs, bodyCenter);
    return legs;
}

function resetLegPosition(spiderLegs: SpiderLegs, bodyCenter: Position) {
    for (let i = 0; i < 8; i++) {
        spiderLegs.positions[i].x = bodyCenter.x + SPIDER_LEGS_OFFSETS[i].x;
        spiderLegs.positions[i].y = bodyCenter.y + SPIDER_LEGS_OFFSETS[i].y;
    }
}

function tickAreaBossEnemyCharacter(enemy: Character, game: Game, pathingCache: PathingCache | null) {
    if (enemy.state === "dead") return;
    const spider = enemy as AreaBossEnemyDarknessSpider;
    resetAreaBossIfOutsideModifierArea(spider, game);
    const playerCharacters = getPlayerCharacters(game.state.players);
    let closest = determineClosestCharacter(enemy, playerCharacters);
    if (closest.minDistance > 1200) {
        return;
    }
    calculateAndSetMoveDirectionToPositionWithPathing(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time, game);
    moveCharacterTick(enemy, game.state.map, game.state.idCounter, game);
    tickSpiderLegPosition(spider, game);

    for (let ability of enemy.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions) {
            if (abilityFunctions.tickAI) abilityFunctions.tickAI(enemy, ability, game);
        }
    }
    tickCharacterDebuffs(enemy, game);
}

function tickSpiderLegPosition(spider: AreaBossEnemyDarknessSpider, game: Game) {
    const phaseIndexes = [];
    if (spider.legs.phase === 0) phaseIndexes.push(0, 3, 4, 7); else phaseIndexes.push(1, 2, 5, 6);
    if (spider.legs.phaseChangeTime === undefined
        || spider.legs.phaseChangeTime <= game.state.time
    ) {
        spider.legs.phase = (spider.legs.phase + 1) % 2;
        spider.legs.phaseChangeTime = game.state.time + spider.legs.changeInterval;
    }

    for (let index of phaseIndexes) {
        const targetPosition = {
            x: spider.x + SPIDER_LEGS_OFFSETS[index].x,
            y: spider.y + SPIDER_LEGS_OFFSETS[index].y
        };
        const spiderLeg = spider.legs.positions[index];
        const distance = calculateDistance(spiderLeg, targetPosition);
        if (distance < spider.baseMoveSpeed * 2) {
            spider.legs.positions[index] = targetPosition;
        } else {
            const direction = calculateDirection(spiderLeg, targetPosition);
            spider.legs.positions[index] = calculateMovePosition(spiderLeg, direction, spider.baseMoveSpeed * 2, false);
        }
    }
}
