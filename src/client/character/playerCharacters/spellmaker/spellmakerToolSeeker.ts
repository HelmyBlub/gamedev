import { AbilityObject, AbilityOwner } from "../../../ability/ability.js";
import { calculateDirection, calculateDistance, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SpellmakerCreateTool } from "./spellmakerTool.js";
import { calculateMovePosition, moveByDirectionAndDistance } from "../../../map/map.js";
import { determineCharactersInDistance, determineClosestCharacter } from "../../character.js";
import { nextRandom } from "../../../randomNumberGenerator.js";
import { Character } from "../../characterModel.js";
import { createMoreInfosPart } from "../../../moreInfo.js";

export type SpellmakerCreateToolMoveAttachmentSeeker = SpellmakerCreateToolMoveAttachment & {
    direction: number,
    speed: number,
    startPos: Position,
    nextTargetAquireTickTime: number,
    currentTargetPos?: Position,
}

export type SpellmakerCreateToolSeeker = SpellmakerCreateTool & {
    workInProgress?: SpellmakerCreateToolMoveAttachmentSeeker,
}

export const SPELLMAKER_TOOL_SEEKER = "Seeker";
const SPEED = 2;
const TICK_INTERVAL = 100;
const SEEK_RANGE = 300;

export function addSpellmakerToolSeeker() {
    SPELLMAKER_MOVE_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_SEEKER] = {
        createTool: createTool,
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
        paint: paint,
        getMoveAttachment: getMoveAttachment,
        getMoveAttachmentNextMoveByAmount: getMoveAttachmentNextMoveByAmount,
        description: [
            "Move Tool: Seeker",
            "Attaches to close object",
            "Automatically seeks and moves towards enemy",
        ],
        learnedThroughUpgrade: true,
    };
}


function onKeyDown(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    const moveTool = tool as SpellmakerCreateToolSeeker;
    moveTool.workInProgress = {
        type: SPELLMAKER_TOOL_SEEKER,
        speed: SPEED,
        direction: 0,
        startPos: { x: castPositionRelativeToCharacter.x, y: castPositionRelativeToCharacter.y },
        nextTargetAquireTickTime: 0,
    }
}

function createTool(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_SEEKER,
        subType: "move",
        description: createMoreInfosPart(ctx, SPELLMAKER_MOVE_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_SEEKER].description),
        level: 0,
        totalDamage: 0,
    };
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game): SpellmakerCreateToolMoveAttachment | undefined {
    const moveTool = tool as SpellmakerCreateToolSeeker;
    if (moveTool.workInProgress) {
        const seeker = moveTool.workInProgress;
        seeker.direction = calculateDirection(seeker.startPos, castPositionRelativeToCharacter);
        seeker.speed = calculateDistance(seeker.startPos, castPositionRelativeToCharacter);
        moveTool.workInProgress = undefined;
        return seeker;
    }
    return undefined;
}

function onTick(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) {
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) {
        const moveTool = tool as SpellmakerCreateToolSeeker;
        if (moveTool.workInProgress) {
            const seeker = moveTool.workInProgress;
            const relativPos: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            seeker.direction = calculateDirection(seeker.startPos, relativPos);
            seeker.speed = calculateDistance(seeker.startPos, relativPos);
        }
    }
}

function paint(ctx: CanvasRenderingContext2D, moveAttachment: SpellmakerCreateToolMoveAttachment, ownerPaintPos: Position, ability: AbilitySpellmaker, game: Game) {
    const seeker = moveAttachment as SpellmakerCreateToolMoveAttachmentSeeker;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const moveBy = calculateMovePosition({ x: 0, y: 0 }, seeker.direction, seeker.speed, false);
    ctx.moveTo(ownerPaintPos.x + seeker.startPos.x, ownerPaintPos.y + seeker.startPos.y);
    ctx.lineTo(ownerPaintPos.x + seeker.startPos.x + moveBy.x, ownerPaintPos.y + seeker.startPos.y + moveBy.y);
    ctx.stroke();
}

function getMoveAttachment(createObject: SpellmakerCreateToolObjectData, castPosition: Position, game: Game): SpellmakerCreateToolMoveAttachment {
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
