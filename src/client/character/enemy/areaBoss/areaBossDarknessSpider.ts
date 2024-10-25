import { ABILITIES_FUNCTIONS, Ability } from "../../../ability/ability.js";
import { createAbilityMelee } from "../../../ability/abilityMelee.js";
import { createDarkClone } from "../../../curse/curseDarkness.js";
import { tickCharacterDebuffs } from "../../../debuff/debuff.js";
import { calculateDirection, calculateDistance, getNextId } from "../../../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { calculateMovePosition, findNearNonBlockingPosition, isPositionBlocking, moveByDirectionAndDistance } from "../../../map/map.js";
import { nextRandom } from "../../../randomNumberGenerator.js";
import { getPlayerCharacters, determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, moveCharacterTick, getCharacterMoveSpeed, resetCharacter } from "../../character.js";
import { Character, CHARACTER_TYPE_FUNCTIONS, createCharacter } from "../../characterModel.js";
import { paintCharacterHpBar, paintCharacterWithAbilitiesDefault } from "../../characterPaint.js";
import { PathingCache } from "../../pathing.js";
import { AreaBossEnemyCharacter, areaBossOnCharacterKill, resetAreaBossIfOutsideModifierArea } from "./areaBossEnemy.js";

type AreaBossEnemyDarknessSpider = AreaBossEnemyCharacter & {
    spiderInfo: Spider,
};

type Spider = {
    legs: (SpiderLeg | undefined)[],
    phase: number,
    phaseChangeTime?: number,
    changeInterval: number,
}
type SpiderLeg = {
    position: Position,
    breakOfPosition?: Position,
    legMiddlePosition?: Position,
    coconPosition?: Position,
    breakOfTime?: number,
}

const SPIDER_ALL_LEGS_LOST_HP_PER_CENT = 0.2;
const SPIDER_LEG_LENGTH = 80;
const SPIDER_LEG_TO_CLONE_TIMER = 5000;
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
        tickFunction: tickSpider,
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
    abilities.push(createAbilityMelee(game.state.idCounter));
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
        if (leg === undefined) continue;
        if (leg.breakOfPosition) {
            spiderLegStartPaintPos = getPointPaintPosition(ctx, leg.breakOfPosition, cameraPosition, game.UI.zoom);
        } else {
            spiderLegStartPaintPos = spiderPaintPos;
        }
        const legPosition = leg.position;
        const paintPosLeg = getPointPaintPosition(ctx, legPosition, cameraPosition, game.UI.zoom);
        let spiderLegMiddle: Position | undefined;
        if (leg.legMiddlePosition) {
            spiderLegMiddle = getPointPaintPosition(ctx, leg.legMiddlePosition, cameraPosition, game.UI.zoom);
        } else {
            spiderLegMiddle = getSpiderLegMiddle(spiderLegStartPaintPos, paintPosLeg);
        }
        if (leg.breakOfTime && !game.state.paused) {
            //shake dead leg
            paintPosLeg.x += Math.round(Math.random() * 10 - 5);
            paintPosLeg.y += Math.round(Math.random() * 10 - 5);
            if (spiderLegMiddle) {
                spiderLegMiddle.x += Math.round(Math.random() * 2 - 1);
                spiderLegMiddle.y += Math.round(Math.random() * 2 - 1);
            }
            spiderLegStartPaintPos.x += Math.round(Math.random() * 10 - 5);
            spiderLegStartPaintPos.y += Math.round(Math.random() * 10 - 5);
            //cocon/clone spawn spot
            let factor = ((game.state.time - leg.breakOfTime) / SPIDER_LEG_TO_CLONE_TIMER);
            let spotRadius = 20 * factor;
            if (leg.coconPosition && factor > 0.1) {
                const coconPaintPos = getPointPaintPosition(ctx, leg.coconPosition, cameraPosition, game.UI.zoom);
                ctx.beginPath();
                ctx.arc(coconPaintPos.x, coconPaintPos.y, spotRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(spiderLegStartPaintPos.x, spiderLegStartPaintPos.y);
        if (spiderLegMiddle) ctx.lineTo(spiderLegMiddle.x, spiderLegMiddle.y);
        ctx.lineTo(paintPosLeg.x, paintPosLeg.y);
        ctx.stroke();
    }

    const hpBarPos = {
        x: Math.floor(spiderPaintPos.x - character.width / 2),
        y: Math.floor(spiderPaintPos.y - character.height / 2)
    };

    paintCharacterHpBar(ctx, character, hpBarPos);
}

function getSpiderLegMiddle(pointA: Position, pointC: Position) {
    const totalLegLength = SPIDER_LEG_LENGTH * 2;
    const length = calculateDistance(pointA, pointC);
    const missingLength = totalLegLength - length;
    if (missingLength <= 0) return;
    const legMiddle: Position = {
        x: Math.floor(pointC.x - (pointC.x - pointA.x) / 2),
        y: Math.floor(pointC.y - (pointC.y - pointA.y) / 2 - missingLength),
    };
    return legMiddle;
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
        const leg = spiderLegs.legs[i];
        if (leg === undefined || leg.breakOfPosition) continue;
        leg.position.x = bodyCenter.x + SPIDER_LEGS_OFFSETS[i].x;
        leg.position.y = bodyCenter.y + SPIDER_LEGS_OFFSETS[i].y;
    }
}

function tickSpider(enemy: Character, game: Game, pathingCache: PathingCache | null) {
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
            if (spider.hp > spider.maxHp * SPIDER_ALL_LEGS_LOST_HP_PER_CENT) {
                if (spider.hp > spider.maxHp * (SPIDER_ALL_LEGS_LOST_HP_PER_CENT + 0.1) || spider.spiderInfo.phase === 1) {
                    enemy.moveDirection = calculateDirection(enemy, closest.minDistanceCharacter);
                    const newPos = calculateMovePosition(enemy, enemy.moveDirection, getCharacterMoveSpeed(enemy), false);
                    enemy.x = newPos.x;
                    enemy.y = newPos.y;
                }
            } else {
                //roll moving?
            }
        }
    }
    tickSpiderLegPosition(spider, game);
    checkTurnLegToClone(spider, game);

    for (let ability of enemy.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions) {
            if (abilityFunctions.tickAI) abilityFunctions.tickAI(enemy, ability, game);
        }
    }
    tickCharacterDebuffs(enemy, game);
}

function checkTurnLegToClone(spider: AreaBossEnemyDarknessSpider, game: Game) {
    for (let i = spider.spiderInfo.legs.length - 1; i >= 0; i--) {
        const leg = spider.spiderInfo.legs[i];
        if (leg !== undefined && leg.breakOfTime !== undefined && leg.breakOfTime + SPIDER_LEG_TO_CLONE_TIMER <= game.state.time) {
            spider.spiderInfo.legs[i] = undefined;
            const randomPlayerChar = getRandomAlivePlayerCharacter(game);
            if (!randomPlayerChar || !leg.coconPosition) continue;
            const darkClone = createDarkClone(randomPlayerChar, game.state.bossStuff.bossLevelCounter, game);
            darkClone.x = leg.coconPosition.x;
            darkClone.y = leg.coconPosition.y;
            resetCharacter(darkClone, game);
            game.state.bossStuff.bosses.push(darkClone);
        }
    }
}

function getRandomAlivePlayerCharacter(game: Game): Character | undefined {
    const playerCharacters = getPlayerCharacters(game.state.players);
    let randomIndexOffset = Math.floor(nextRandom(game.state.randomSeed) * playerCharacters.length);
    for (let i = 0; i < playerCharacters.length; i++) {
        const randomIndex = (i + randomIndexOffset) % playerCharacters.length;
        const randomChar = playerCharacters[randomIndex];
        if (randomChar.state === "alive") {
            return randomChar;
        }
    }
    return undefined;
}


function checkLegLoss(spider: AreaBossEnemyDarknessSpider, game: Game) {
    if (spider.maxHp - spider.hp < 1) return;
    let countLostLegs = 0;
    for (let i = 0; i < 8; i++) {
        const leg = spider.spiderInfo.legs[i];
        if (leg === undefined || leg.breakOfPosition) countLostLegs++;
    }
    const hpPerCent = spider.hp / spider.maxHp;
    const spiderLegCount = 8;
    const legsLeftCounter = Math.max(Math.ceil((hpPerCent - SPIDER_ALL_LEGS_LOST_HP_PER_CENT) / (1 - SPIDER_ALL_LEGS_LOST_HP_PER_CENT) * 8), 0);
    const legsShouldBeLostCounter = spiderLegCount - legsLeftCounter;
    if (countLostLegs >= legsShouldBeLostCounter) return;
    for (let i = countLostLegs; i < legsShouldBeLostCounter; i++) {
        const leg = spider.spiderInfo.legs[i];
        if (!leg) continue;
        leg.breakOfPosition = { x: spider.x, y: spider.y };
        leg.legMiddlePosition = getSpiderLegMiddle(leg.position, leg.breakOfPosition);
        if (!leg.legMiddlePosition) {
            leg.legMiddlePosition = {
                x: leg.position.x + (leg.breakOfPosition.x - leg.position.x) / 2,
                y: leg.position.y + (leg.breakOfPosition.y - leg.position.y) / 2,
            }
        }
        leg.breakOfTime = game.state.time;
        const isMiddleBlocking = isPositionBlocking(leg.legMiddlePosition, game.state.map, game.state.idCounter, game);
        if (isMiddleBlocking) {
            leg.coconPosition = findNearNonBlockingPosition(leg.legMiddlePosition, game.state.map, game.state.idCounter, game);
        } else {
            leg.coconPosition = { x: leg.legMiddlePosition.x, y: leg.legMiddlePosition.y };
        }
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
        if (spiderLeg === undefined || spiderLeg.breakOfPosition) continue;
        const targetPosition = {
            x: spider.x + SPIDER_LEGS_OFFSETS[index].x,
            y: spider.y + SPIDER_LEGS_OFFSETS[index].y
        };
        const spiderLegPos = spiderLeg.position;
        const distance = calculateDistance(spiderLegPos, targetPosition);
        if (distance < spider.baseMoveSpeed * 2) {
            spiderLeg.position = targetPosition;
        } else {
            const direction = calculateDirection(spiderLegPos, targetPosition);
            spiderLeg.position = calculateMovePosition(spiderLegPos, direction, spider.baseMoveSpeed * 2, false);
        }
    }

    //fallen off legs
    for (let leg of spider.spiderInfo.legs) {
        if (!leg || !leg.breakOfPosition) continue;
        const moveFactor = ((game.state.time - leg.breakOfTime!) / SPIDER_LEG_TO_CLONE_TIMER) / 50;
        const distanceMiddle = calculateDistance(leg.coconPosition!, leg.legMiddlePosition!);
        if (distanceMiddle > 5) {
            const direction = calculateDirection(leg.legMiddlePosition!, leg.coconPosition!)
            moveByDirectionAndDistance(leg.legMiddlePosition!, direction, distanceMiddle * moveFactor * 20, false);
        }
        const distancePos = calculateDistance(leg.coconPosition!, leg.position);
        if (distancePos > 5) {
            const direction = calculateDirection(leg.position, leg.coconPosition!)
            moveByDirectionAndDistance(leg.position, direction, distancePos * moveFactor, false);
        }
        const distanceBreakOffPos = calculateDistance(leg.coconPosition!, leg.breakOfPosition);
        if (distanceBreakOffPos > 5) {
            const direction = calculateDirection(leg.breakOfPosition, leg.coconPosition!)
            moveByDirectionAndDistance(leg.breakOfPosition, direction, distanceBreakOffPos * moveFactor, false);
        }
    }
}
