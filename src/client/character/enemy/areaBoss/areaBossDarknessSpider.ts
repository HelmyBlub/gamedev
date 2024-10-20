import { ABILITIES_FUNCTIONS, Ability } from "../../../ability/ability.js";
import { tickCharacterDebuffs } from "../../../debuff/debuff.js";
import { calculateDirection, calculateDistance, getNextId } from "../../../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { calculateMovePosition, findNearNonBlockingPosition, moveByDirectionAndDistance } from "../../../map/map.js";
import { getPlayerCharacters, determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, moveCharacterTick, getCharacterMoveSpeed } from "../../character.js";
import { Character, CHARACTER_TYPE_FUNCTIONS, createCharacter } from "../../characterModel.js";
import { paintCharacterHpBar, paintCharacterWithAbilitiesDefault } from "../../characterPaint.js";
import { PathingCache } from "../../pathing.js";
import { AreaBossEnemyCharacter, areaBossOnCharacterKill, resetAreaBossIfOutsideModifierArea } from "./areaBossEnemy.js";

type AreaBossEnemyDarknessSpider = AreaBossEnemyCharacter & {
    spiderInfo: Spider,
};

type Spider = {
    legs: SpiderLeg[],
    phase: number,
    phaseChangeTime?: number,
    changeInterval: number,
}
type SpiderLeg = {
    position: Position,
    breakOfPosition?: Position,
    breakOfTime?: number,
}

const SPIDER_LEG_LENGTH = 80;
const SPIDER_LEGS_OFFSETS: Position[] = [
    { x: -SPIDER_LEG_LENGTH, y: -SPIDER_LEG_LENGTH * 3 / 2 }, { x: SPIDER_LEG_LENGTH, y: -SPIDER_LEG_LENGTH * 3 / 2 },
    { x: -SPIDER_LEG_LENGTH * 3 / 2, y: -SPIDER_LEG_LENGTH / 2 }, { x: SPIDER_LEG_LENGTH * 3 / 2, y: -SPIDER_LEG_LENGTH / 2 },
    { x: -SPIDER_LEG_LENGTH * 3 / 2, y: +SPIDER_LEG_LENGTH / 2 }, { x: SPIDER_LEG_LENGTH * 3 / 2, y: +SPIDER_LEG_LENGTH / 2 },
    { x: -SPIDER_LEG_LENGTH, y: +SPIDER_LEG_LENGTH * 3 / 2 }, { x: SPIDER_LEG_LENGTH, y: +SPIDER_LEG_LENGTH * 3 / 2 },
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
    const areaBoss: AreaBossEnemyDarknessSpider = { ...baseCharacter, mapModifierIdRef: mapModifierIdRef, spiderInfo: spiderLegs };
    return areaBoss;
}

function paintSpider(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    if (character.state === "dead") return;
    const spider = character as AreaBossEnemyDarknessSpider;
    const spiderPaintPos = getPointPaintPosition(ctx, character, cameraPosition, game.UI.zoom);
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    //middle
    ctx.beginPath();
    ctx.arc(spiderPaintPos.x, spiderPaintPos.y, character.width / 2, 0, Math.PI * 2);
    ctx.fill();
    //legs
    for (let i = 0; i < 8; i++) {
        let spiderLegStartPaintPos: Position;
        const leg = spider.spiderInfo.legs[i];
        if (leg.breakOfPosition) {
            spiderLegStartPaintPos = getPointPaintPosition(ctx, leg.breakOfPosition, cameraPosition, game.UI.zoom);
        } else {
            spiderLegStartPaintPos = spiderPaintPos;
        }
        const legPosition = leg.position;
        const paintPosLeg = getPointPaintPosition(ctx, legPosition, cameraPosition, game.UI.zoom);
        const pointB = getPointB(spiderLegStartPaintPos, paintPosLeg);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(spiderLegStartPaintPos.x, spiderLegStartPaintPos.y);
        if (pointB) ctx.lineTo(pointB.x, pointB.y);
        ctx.lineTo(paintPosLeg.x, paintPosLeg.y);
        ctx.stroke();
    }

    const hpBarPos = {
        x: Math.floor(spiderPaintPos.x - character.width / 2),
        y: Math.floor(spiderPaintPos.y - character.height / 2)
    };

    paintCharacterHpBar(ctx, character, hpBarPos);
}

function getPointB(pointA: Position, pointC: Position) {
    const totalLegLength = SPIDER_LEG_LENGTH * 2;
    const length = calculateDistance(pointA, pointC);
    const missingLength = totalLegLength - length;
    if (missingLength <= 0) return;
    const pointB: Position = {
        x: Math.floor(pointC.x - (pointC.x - pointA.x) / 2),
        y: Math.floor(pointC.y - (pointC.y - pointA.y) / 2 - missingLength),
    };
    return pointB;
}

function getInitialSpiderLegs(bodyCenter: Position): Spider {
    const legs: Spider = {
        changeInterval: 300,
        phase: 0,
        legs: [],
    };
    for (let i = 0; i < 8; i++) {
        legs.legs.push({ position: { x: 0, y: 0 } });
    }
    resetLegPosition(legs, bodyCenter);
    return legs;
}

function resetLegPosition(spiderLegs: Spider, bodyCenter: Position) {
    for (let i = 0; i < 8; i++) {
        spiderLegs.legs[i].position.x = bodyCenter.x + SPIDER_LEGS_OFFSETS[i].x;
        spiderLegs.legs[i].position.y = bodyCenter.y + SPIDER_LEGS_OFFSETS[i].y;
    }
}

function tickAreaBossEnemyCharacter(enemy: Character, game: Game, pathingCache: PathingCache | null) {
    if (enemy.state === "dead") return;
    const spider = enemy as AreaBossEnemyDarknessSpider;
    resetAreaBossIfOutsideModifierArea(spider, game);
    checkLegLoss(spider, game);
    const playerCharacters = getPlayerCharacters(game.state.players);
    let closest = determineClosestCharacter(enemy, playerCharacters);
    if (closest.minDistanceCharacter) {
        if (closest.minDistance > 1200) {
            return;
        }
        if (closest.minDistance > spider.baseMoveSpeed * 2) {
            enemy.moveDirection = calculateDirection(enemy, closest.minDistanceCharacter);
            const newPos = calculateMovePosition(enemy, enemy.moveDirection, getCharacterMoveSpeed(enemy), false);
            enemy.x = newPos.x;
            enemy.y = newPos.y;
        }
    }
    tickSpiderLegPosition(spider, game);

    for (let ability of enemy.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions) {
            if (abilityFunctions.tickAI) abilityFunctions.tickAI(enemy, ability, game);
        }
    }
    tickCharacterDebuffs(enemy, game);
}

function checkLegLoss(spider: AreaBossEnemyDarknessSpider, game: Game) {
    const allLegsLostOnPerCent = 0.2;
    if (spider.maxHp - spider.hp < 1) return;
    const countLostLegs = spider.spiderInfo.legs.reduce((count, leg) => leg.breakOfPosition !== undefined ? count += 1 : count, 0);
    const hpPerCent = spider.hp / spider.maxHp;
    const spiderLegCount = 8;
    const legsLeftCounter = Math.max(Math.ceil((hpPerCent - allLegsLostOnPerCent) / (1 - allLegsLostOnPerCent) * 8), 0);
    const legsShouldBeLostCounter = spiderLegCount - legsLeftCounter;
    if (countLostLegs >= legsShouldBeLostCounter) return;
    for (let i = countLostLegs; i < legsShouldBeLostCounter; i++) {
        spider.spiderInfo.legs[i].breakOfPosition = { x: spider.x, y: spider.y };
        spider.spiderInfo.legs[i].breakOfTime = game.state.time;
    }
}

function tickSpiderLegPosition(spider: AreaBossEnemyDarknessSpider, game: Game) {
    const phaseIndexes = [];
    if (spider.spiderInfo.phase === 0) phaseIndexes.push(0, 3, 4, 7); else phaseIndexes.push(1, 2, 5, 6);
    if (spider.spiderInfo.phaseChangeTime === undefined
        || spider.spiderInfo.phaseChangeTime <= game.state.time
    ) {
        spider.spiderInfo.phase = (spider.spiderInfo.phase + 1) % 2;
        spider.spiderInfo.phaseChangeTime = game.state.time + spider.spiderInfo.changeInterval;
    }

    for (let index of phaseIndexes) {
        const spiderLeg = spider.spiderInfo.legs[index];
        if (spiderLeg.breakOfPosition) continue;
        const targetPosition = {
            x: spider.x + SPIDER_LEGS_OFFSETS[index].x,
            y: spider.y + SPIDER_LEGS_OFFSETS[index].y
        };
        const spiderLegPos = spiderLeg.position;
        const distance = calculateDistance(spiderLegPos, targetPosition);
        if (distance < spider.baseMoveSpeed * 2) {
            spider.spiderInfo.legs[index].position = targetPosition;
        } else {
            const direction = calculateDirection(spiderLegPos, targetPosition);
            spider.spiderInfo.legs[index].position = calculateMovePosition(spiderLegPos, direction, spider.baseMoveSpeed * 2, false);
        }
    }
}
