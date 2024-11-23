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
import { Character, createCharacter } from "../../characterModel.js";
import { paintCharacterHpBar } from "../../characterPaint.js";
import { addAbilityCurseDarkness, createObjectCurseDarkness } from "./abilityCurseDarkness.js";
import { AREA_BOSS_FUNCTIONS, AreaBossEnemy, CHARACTER_TYPE_AREA_BOSS, scaleAreaBossHp } from "./areaBoss.js";

export type AreaBossEnemyDarknessSpider = AreaBossEnemy & {
    mapModifierIdRef: number,
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

const IMAGE_SPIDER_COCON = "Spider Cocon";
GAME_IMAGES[IMAGE_SPIDER_COCON] = {
    imagePath: "/images/spiderCocon.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};

const SPIDER_ALL_LEGS_LOST_HP_PER_CENT = 0.2;
const SPIDER_LEG_LENGTH = 80;
const SPIDER_LEG_TO_CLONE_TIMER = 5000;
const SPIDER_LEGS_OFFSETS: Position[] = [
    { x: -SPIDER_LEG_LENGTH, y: -SPIDER_LEG_LENGTH * 3 / 2 }, { x: SPIDER_LEG_LENGTH, y: -SPIDER_LEG_LENGTH * 3 / 2 },
    { x: -SPIDER_LEG_LENGTH * 3 / 2, y: -SPIDER_LEG_LENGTH / 2 }, { x: SPIDER_LEG_LENGTH * 3 / 2, y: -SPIDER_LEG_LENGTH / 2 },
    { x: -SPIDER_LEG_LENGTH * 3 / 2, y: +SPIDER_LEG_LENGTH / 2 }, { x: SPIDER_LEG_LENGTH * 3 / 2, y: +SPIDER_LEG_LENGTH / 2 },
    { x: -SPIDER_LEG_LENGTH, y: +SPIDER_LEG_LENGTH * 3 / 2 }, { x: SPIDER_LEG_LENGTH, y: +SPIDER_LEG_LENGTH * 3 / 2 },
]
export const AREA_BOSS_TYPE_DARKNESS_SPIDER = "DarknessSpider";

export function addAreaBossTypeDarknessSpider() {
    AREA_BOSS_FUNCTIONS[AREA_BOSS_TYPE_DARKNESS_SPIDER] = {
        onDeath: onSpiderKill,
        paint: paintSpider,
        tick: tickSpider,
    };
    addAbilityCurseDarkness();
}

export function createAreaBossDarknessSpiderWithLevel(idCounter: IdCounter, spawn: Position, mapModifierIdRef: number, game: Game): AreaBossEnemyDarknessSpider {
    const scaling = 2;
    const bossSize = 40;
    const color = "black";
    const dummyValue = 1;
    const nonBlockingSpawn = findNearNonBlockingPosition(spawn, game.state.map, game.state.idCounter, game);

    const baseCharacter = createCharacter(getNextId(idCounter), nonBlockingSpawn.x, nonBlockingSpawn.y, bossSize, bossSize, color, dummyValue, dummyValue, FACTION_ENEMY, CHARACTER_TYPE_AREA_BOSS, dummyValue);
    const abilities: Ability[] = [];
    abilities.push(createAbilityMelee(game.state.idCounter));
    baseCharacter.abilities = abilities;
    const spiderLegs = getInitialSpiderLegs(baseCharacter);
    const areaBoss: AreaBossEnemyDarknessSpider = { ...baseCharacter, mapModifierIdRef: mapModifierIdRef, spiderInfo: spiderLegs, areaBossType: AREA_BOSS_TYPE_DARKNESS_SPIDER };
    scaleAreaBossHp(scaling, [areaBoss]);
    return areaBoss;
}

function onSpiderKill(character: Character, game: Game) {
    const spider = character as AreaBossEnemyDarknessSpider;
    for (let leg of spider.spiderInfo.legs) {
        if (leg) {
            spider.hp = 1;
            spider.state = "alive";
            return;
        }
    }
    areaBossOnCharacterKill(character, game);
}

function areaBossOnCharacterKill(character: Character, game: Game) {
    const areaBoss = character as AreaBossEnemyDarknessSpider;
    const curse = createObjectCurseDarkness(areaBoss, game);
    if (curse) game.state.abilityObjects.push(curse);
    removeMapModifier(areaBoss.mapModifierIdRef, game);
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
        }
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(spiderLegStartPaintPos.x, spiderLegStartPaintPos.y);
        if (spiderLegMiddle) ctx.lineTo(spiderLegMiddle.x, spiderLegMiddle.y);
        ctx.lineTo(paintPosLeg.x, paintPosLeg.y);
        ctx.stroke();
        if (leg.breakOfTime) {
            //cocon/clone spawn spot
            let factor = ((game.state.time - leg.breakOfTime) / SPIDER_LEG_TO_CLONE_TIMER);
            let spotSize = Math.round(40 * factor);
            const image = getImage(IMAGE_SPIDER_COCON);
            if (leg.coconPosition && factor > 0.1) {
                const coconPaintPos = getPointPaintPosition(ctx, leg.coconPosition, cameraPosition, game.UI.zoom);
                coconPaintPos.x -= Math.floor(spotSize / 2);
                coconPaintPos.y -= spotSize - 10;
                if (image) {
                    ctx.drawImage(image, 0, 0, 40, 40, coconPaintPos.x, coconPaintPos.y, spotSize, spotSize);
                }
            }
        }
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

function tickSpider(enemy: Character, game: Game) {
    if (enemy.state === "dead") return;
    const spider = enemy as AreaBossEnemyDarknessSpider;
    const modifier = findMapModifierById(spider.mapModifierIdRef, game);
    if (!modifier) return;
    if (canMove(spider)) {
        tickMoveBehavior(spider, modifier, game);
    }
    for (let ability of enemy.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions) {
            if (abilityFunctions.tickAI) abilityFunctions.tickAI(enemy, ability, game);
        }
    }
    checkLegLoss(spider, game);
    tickCharacterDebuffs(enemy, game);
    tickSpiderLegPosition(spider, game);
    checkTurnLegToClone(spider, game);
}

function tickMoveBehavior(spider: AreaBossEnemyDarknessSpider, modifier: GameMapModifier, game: Game) {
    let aiBehaviour: "moveBack" | "scarePlayer" | "attackPlayer" = "moveBack";
    const closestInfo = findNearesPlayerToSpiderInModifiedArea(spider, modifier, game);
    if (closestInfo) {
        const hpPerCent = spider.hp / spider.maxHp;
        if (closestInfo.distanceToModifierMiddle < 2500) {
            aiBehaviour = "attackPlayer";
        } else if (hpPerCent > 0.89) {
            aiBehaviour = "scarePlayer";
        } else {
            aiBehaviour = "attackPlayer";
        }
    }
    let newPos;
    spider.isMoving = true;
    const middle = getShapeMiddle(modifier.area);
    switch (aiBehaviour) {
        case "moveBack":
            spider.moveDirection = calculateDirection(spider, middle!);
            break;
        case "attackPlayer":
            if (closestInfo && closestInfo.distanceCharToSpider > spider.baseMoveSpeed * 2) {
                spider.moveDirection = calculateDirection(spider, closestInfo.playerCharacter);
            }
            break;
        case "scarePlayer":
            if (closestInfo && closestInfo.distanceCharToSpider > 350) {
                spider.moveDirection = calculateDirection(spider, closestInfo.playerCharacter);
            } else if (closestInfo && closestInfo.distanceCharToSpider < 350 - 10) {
                spider.moveDirection = calculateDirection(spider, middle!);
            } else {
                spider.isMoving = false;
            }
            break;
    }
    if (spider.isMoving) {
        newPos = calculateMovePosition(spider, spider.moveDirection, getCharacterMoveSpeed(spider), false);
        spider.x = newPos.x;
        spider.y = newPos.y;
    }
}

function canMove(spider: AreaBossEnemyDarknessSpider): boolean {
    if (spider.hp > spider.maxHp * SPIDER_ALL_LEGS_LOST_HP_PER_CENT) {
        if (spider.hp > spider.maxHp * (SPIDER_ALL_LEGS_LOST_HP_PER_CENT + 0.1) || spider.spiderInfo.phase === 1) {
            return true;
        }
    }
    return false;
}

function findNearesPlayerToSpiderInModifiedArea(areaBoss: AreaBossEnemyDarknessSpider, modifier: GameMapModifier, game: Game): { playerCharacter: Character, distanceToModifierMiddle: number, distanceCharToSpider: number } | undefined {
    const middle = getShapeMiddle(modifier.area);
    if (!middle) return;
    let closestPlayer: Character | undefined;
    let closestPlayerDistance = 0;
    let distanceToModifierMiddle = 0;
    const playerChars = getPlayerCharacters(game.state.players);
    for (let char of playerChars) {
        const isInside = isPositionInsideShape(modifier.area, char, game);
        if (!isInside) continue;
        if (!closestPlayer) {
            closestPlayer = char;
            closestPlayerDistance = calculateDistance(char, areaBoss);
            distanceToModifierMiddle = calculateDistance(char, middle);
        } else {
            const tempDistance = calculateDistance(char, areaBoss);
            if (tempDistance < closestPlayerDistance) {
                closestPlayer = char;
                closestPlayerDistance = tempDistance;
                distanceToModifierMiddle = calculateDistance(char, middle);
            }
        }
    }
    if (closestPlayer) {
        return { playerCharacter: closestPlayer, distanceToModifierMiddle: distanceToModifierMiddle, distanceCharToSpider: closestPlayerDistance };
    }
    return undefined;
}


function checkTurnLegToClone(spider: AreaBossEnemyDarknessSpider, game: Game) {
    for (let i = spider.spiderInfo.legs.length - 1; i >= 0; i--) {
        const leg = spider.spiderInfo.legs[i];
        if (leg !== undefined && leg.breakOfTime !== undefined && leg.breakOfTime + SPIDER_LEG_TO_CLONE_TIMER <= game.state.time) {
            spider.spiderInfo.legs[i] = undefined;
            const randomPlayerChar = getRandomAlivePlayerCharacter(game);
            if (!randomPlayerChar || !leg.coconPosition) continue;
            const cloneLevel = Math.max(game.state.bossStuff.bossLevelCounter, 3) - 2;
            const darkClone = createDarkClone(randomPlayerChar, cloneLevel, game);
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
