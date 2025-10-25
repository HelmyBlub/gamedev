import { AbilityObject, AbilityOwner } from "../../../ability/ability.js";
import { calculateDirection, calculateDistance, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateTool } from "./spellmakerTool.js";
import { calculateMovePosition, moveByDirectionAndDistance } from "../../../map/map.js";
import { determineCharactersInDistance, determineClosestCharacter } from "../../character.js";
import { nextRandom } from "../../../randomNumberGenerator.js";
import { Character } from "../../characterModel.js";

export type SpellmakerCreateToolMoveAttachmentSeeker = SpellmakerCreateToolMoveAttachment & {
    direction: number,
    speed: number,
    startPos: Position,
    nextTargetAquireTickTime: number,
    currentTargetPos?: Position,
}

export type SpellmakerCreateToolSeeker = SpellmakerCreateTool & {
    startPosition?: Position,
    attachToIndex?: number,
}

export const SPELLMAKER_TOOL_SEEKER = "Seeker";
const SPEED = 2;
const TICK_INTERVAL = 100;
const SEEK_RANGE = 300;

export function addSpellmakerToolSeeker() {
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_SEEKER] = {
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
        paint: paint,
        getMoveAttachment: getMoveAttachment,
        getMoveAttachmentNextMoveByAmount: getMoveAttachmentNextMoveByAmount,
    };
}


function onKeyDown(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    const moveTool = tool as SpellmakerCreateToolSeeker;
    let closestDistance = 0;
    let closestIndex: number | undefined = undefined;
    for (let objectIndex = 0; objectIndex < ability.createdObjects.length; objectIndex++) {
        const object = ability.createdObjects[objectIndex];
        const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[object.type];
        if (toolFunctions.canHaveMoveAttachment && toolFunctions.calculateDistance) {
            const tempDistance = toolFunctions.calculateDistance(castPositionRelativeToCharacter, object);
            if (closestIndex === undefined || tempDistance < closestDistance) {
                closestDistance = tempDistance;
                closestIndex = objectIndex;
            }
        }
    }
    if (closestIndex != undefined && closestDistance < 20) {
        moveTool.attachToIndex = closestIndex;
        moveTool.startPosition = castPositionRelativeToCharacter;
        const createdObject = ability.createdObjects[moveTool.attachToIndex];
        const moveAttach: SpellmakerCreateToolMoveAttachmentSeeker = {
            type: SPELLMAKER_TOOL_SEEKER,
            speed: SPEED,
            direction: 0,
            startPos: moveTool.startPosition,
            nextTargetAquireTickTime: 0,
        }
        createdObject.moveAttachment = moveAttach;
    } else {
        moveTool.attachToIndex = undefined;
        moveTool.startPosition = undefined;
    }
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    const moveTool = tool as SpellmakerCreateToolSeeker;
    if (moveTool.attachToIndex != undefined && moveTool.startPosition) {
        const createdObject = ability.createdObjects[moveTool.attachToIndex];
        const seeker = createdObject.moveAttachment as SpellmakerCreateToolMoveAttachmentSeeker;
        seeker.direction = calculateDirection(seeker.startPos, castPositionRelativeToCharacter);
        seeker.speed = calculateDistance(seeker.startPos, castPositionRelativeToCharacter);
    }
    moveTool.startPosition = undefined;
    moveTool.attachToIndex = undefined
}

function onTick(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) {
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) {
        const moveTool = tool as SpellmakerCreateToolSeeker;
        if (moveTool.attachToIndex != undefined && moveTool.startPosition) {
            const createdObject = ability.createdObjects[moveTool.attachToIndex];
            const seeker = createdObject.moveAttachment as SpellmakerCreateToolMoveAttachmentSeeker;
            const relativPos: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            seeker.direction = calculateDirection(seeker.startPos, relativPos);
            seeker.speed = calculateDistance(seeker.startPos, relativPos);
        }
    }
}

function paint(ctx: CanvasRenderingContext2D, createObject: SpellmakerCreateToolObjectData, ownerPaintPos: Position, ability: AbilitySpellmaker, game: Game) {
    const seeker = createObject.moveAttachment as SpellmakerCreateToolMoveAttachmentSeeker;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const moveBy = calculateMovePosition({ x: 0, y: 0 }, seeker.direction, seeker.speed, false);
    ctx.moveTo(ownerPaintPos.x + seeker.startPos.x, ownerPaintPos.y + seeker.startPos.y);
    ctx.lineTo(ownerPaintPos.x + seeker.startPos.x + moveBy.x, ownerPaintPos.y + seeker.startPos.y + moveBy.y);
    ctx.stroke();
}

function getMoveAttachment(createObject: SpellmakerCreateToolObjectData, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPosition: Position, game: Game): SpellmakerCreateToolMoveAttachment {
    const seeker = createObject.moveAttachment as SpellmakerCreateToolMoveAttachmentSeeker;
    const moveAttach: SpellmakerCreateToolMoveAttachmentSeeker = {
        type: SPELLMAKER_TOOL_SEEKER,
        direction: seeker.direction,
        speed: seeker.speed / 10,
        startPos: { x: 0, y: 0 },
        nextTargetAquireTickTime: 0,
    };
    return moveAttach;
}

function getMoveAttachmentNextMoveByAmount(moveAttach: SpellmakerCreateToolMoveAttachment, abilityObject: AbilityObject, game: Game): Position {
    const seeker = moveAttach as SpellmakerCreateToolMoveAttachmentSeeker;
    if (seeker.nextTargetAquireTickTime < game.state.time) {
        seeker.nextTargetAquireTickTime = game.state.time + TICK_INTERVAL;
        let target: Character | undefined = undefined;
        let targets = determineCharactersInDistance(abilityObject, undefined, [], game.state.bossStuff.bosses, SEEK_RANGE * 2, abilityObject.faction, true);
        if (targets.length <= 0) {
            targets = determineCharactersInDistance(abilityObject, game.state.map, [], undefined, SEEK_RANGE, abilityObject.faction, true);
        }
        if (targets.length > 0) {
            const randomTargetIndex = Math.floor(nextRandom(game.state.randomSeed) * targets.length);
            target = targets[randomTargetIndex];
            const closest = determineClosestCharacter(abilityObject, targets, false)
            if (closest.minDistanceCharacter) {
                seeker.currentTargetPos = { x: closest.minDistanceCharacter.x, y: closest.minDistanceCharacter.y };
            } else {
                seeker.currentTargetPos = undefined;
            }
        } else {
            seeker.currentTargetPos = undefined;
        }
    }
    if (seeker.currentTargetPos) {
        const nextPosition: Position = { x: abilityObject.x, y: abilityObject.y };
        moveByDirectionAndDistance(nextPosition, seeker.direction, seeker.speed, false);
        const modify = calculateMovePosition({ x: 0, y: 0 }, calculateDirection(abilityObject, seeker.currentTargetPos), 0.25, false);
        nextPosition.x += modify.x;
        nextPosition.y += modify.y;
        seeker.direction = calculateDirection(abilityObject, nextPosition);
        seeker.speed = calculateDistance(abilityObject, nextPosition);
    }
    if (seeker.speed > 4) seeker.speed = 4;
    return calculateMovePosition({ x: 0, y: 0 }, seeker.direction, seeker.speed, false);
}
