import { AbilityOwner } from "../../../ability/ability.js";
import { calculateDistance, calculateDistancePointToLine, deepCopy, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, AbilitySpellmakerObject, SPELLMAKER_MAX_CAST_RANGE, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateTool } from "./spellmakerTool.js";
import { createAbilityObjectSpellmakerFireCircle } from "./abilitySpellmakerFireCircle.js";
import { GAME_IMAGES } from "../../../imageLoad.js";

export type CreateToolObjectFireCircleData = SpellmakerCreateToolObjectData & {
    center: Position,
    radius: number,
    damageFactor: number,
    duration: number,
}

export type SpellmakerCreateToolFireCircle = SpellmakerCreateTool & {
    workInProgress?: CreateToolObjectFireCircleData,
}

export const SPELLMAKER_TOOL_FIRECIRCLE = "FireCircle";
const IMAGE_FIRE_CIRCLE = "fireCircleIcon";
GAME_IMAGES[IMAGE_FIRE_CIRCLE] = {
    imagePath: "/images/fireCircleIcon.png",
    spriteRowHeights: [],
    spriteRowWidths: [],
};


export function addSpellmakerToolFireCircle() {
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_FIRECIRCLE] = {
        calculateDistance: calculateDistanceFireCircle,
        calculateManaCost: calculateManaCost,
        createTool: createTool,
        getRelativeSpellmakePosition: getRelativeSpellmakePosition,
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
        paint: paint,
        spellCast: spellCast,
        canHaveMoveAttachment: true,
        description: [
            "Tool: Fire Circle",
            "Mouse Move Vertical: Change Damage",
            "Mouse Move Horizontal: Change Size",
            `can have move attach: Yes`,
            `can have next stage: No`,
        ],
        learnedThroughUpgrade: true,
        doesDamage: true,
    };
}

function createObjectFireLine(center: Position): CreateToolObjectFireCircleData {
    return {
        type: SPELLMAKER_TOOL_FIRECIRCLE,
        center: center,
        radius: 10,
        damageFactor: 1,
        baseDamage: 10,
        nextStage: [],
        duration: 5000,
    }
}

function createTool(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_FIRECIRCLE,
        subType: "default",
        level: 0,
        totalDamage: 0,
        buttonImage: IMAGE_FIRE_CIRCLE,
    };
}

function getRelativeSpellmakePosition(createObject: SpellmakerCreateToolObjectData): Position {
    const object = createObject as CreateToolObjectFireCircleData;
    return { x: object.center.x, y: object.center.y };
}

function calculateDistanceFireCircle(relativePosition: Position, createObject: SpellmakerCreateToolObjectData): number {
    const objectFireCircle = createObject as CreateToolObjectFireCircleData;
    return Math.max(0, calculateDistance(relativePosition, objectFireCircle.center) - objectFireCircle.radius);
}

function calculateManaCost(createObject: SpellmakerCreateToolObjectData): number {
    const fireCircle = createObject as CreateToolObjectFireCircleData;
    const durationFactor = fireCircle.duration / 2500;
    let manaCost = (fireCircle.radius * fireCircle.radius * fireCircle.damageFactor) * durationFactor / 10000;
    return manaCost;
}


function onKeyDown(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    const toolFireLine = tool as SpellmakerCreateToolFireCircle;
    toolFireLine.workInProgress = createObjectFireLine({ x: castPositionRelativeToCharacter.x, y: castPositionRelativeToCharacter.y });
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game): SpellmakerCreateToolObjectData | undefined {
    const toolFireLine = tool as SpellmakerCreateToolFireCircle;
    if (toolFireLine.workInProgress) {
        const fireCircle = toolFireLine.workInProgress as CreateToolObjectFireCircleData;
        fireCircle.radius = Math.max(10, Math.abs(castPositionRelativeToCharacter.x - fireCircle.center.x))
        fireCircle.damageFactor = Math.min(10, (Math.max(1, Math.abs(castPositionRelativeToCharacter.y - fireCircle.center.y) / 10)));
        toolFireLine.workInProgress = undefined;
        return fireCircle;
    }
    return undefined;
}

function onTick(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) {
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) {
        const toolFireCircle = tool as SpellmakerCreateToolFireCircle;
        if (toolFireCircle.workInProgress) {
            const relativePos: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            const explode = toolFireCircle.workInProgress as CreateToolObjectFireCircleData;
            explode.radius = Math.max(10, Math.abs(relativePos.x - explode.center.x))
            explode.damageFactor = Math.min(10, (Math.max(1, Math.abs(relativePos.y - explode.center.y) / 10)));
        }
    }
}

function spellCast(createObject: SpellmakerCreateToolObjectData, baseDamage: number, faction: string, abilityId: number, castPosition: Position, damageFactor: number, manaFactor: number, chargeFactor: number, toolChain: string[], stageId: number, stageIndex: number, game: Game, preStageAbilityObject?: AbilitySpellmakerObject) {
    const fireCircle = createObject as CreateToolObjectFireCircleData;
    const tickInterval = 200;
    const chargedValues = getValuesWithCharge(fireCircle, chargeFactor);
    const tickDamage = baseDamage * damageFactor * tickInterval / 1000 * chargedValues.damageFactor;
    const newToolChain: string[] = [...toolChain];
    let moveAttachment: SpellmakerCreateToolMoveAttachment | undefined = undefined;
    if (fireCircle.moveAttachment) {
        const toolFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[fireCircle.moveAttachment.type];
        if (toolFunctions.getMoveAttachment) {
            moveAttachment = toolFunctions.getMoveAttachment(createObject, preStageAbilityObject, stageId, castPosition, game);
        }
    }
    const center: Position = {
        x: fireCircle.center.x + castPosition.x,
        y: fireCircle.center.y + castPosition.y,
    };

    const objectFireCircle = createAbilityObjectSpellmakerFireCircle(faction, center, moveAttachment, tickDamage, chargedValues.radius, fireCircle.duration, tickInterval, "red", damageFactor, manaFactor, chargeFactor, newToolChain, abilityId, stageId, stageIndex, game);
    if (createObject.debuffAttachment) {
        objectFireCircle.debuffAttachment = deepCopy(createObject.debuffAttachment);
    }

    game.state.abilityObjects.push(objectFireCircle);
}

function paint(ctx: CanvasRenderingContext2D, createdObject: SpellmakerCreateToolObjectData, paintPos: Position, ability: AbilitySpellmaker, chargeFactor: number, game: Game) {
    const fireCircle = createdObject as CreateToolObjectFireCircleData;
    const chargedValues = getValuesWithCharge(fireCircle, chargeFactor);
    ctx.globalAlpha = 0.1 + Math.min(0.7, 0.07 * chargedValues.damageFactor);
    ctx.fillStyle = "orangered";
    ctx.beginPath();
    ctx.arc(fireCircle.center.x + paintPos.x, fireCircle.center.y + paintPos.y, chargedValues.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

function getValuesWithCharge(fireCircle: CreateToolObjectFireCircleData, chargeFactor: number): { radius: number, damageFactor: number } {
    const radiusEx2 = fireCircle.radius * fireCircle.radius;
    const total = chargeFactor * radiusEx2 * fireCircle.damageFactor;
    const newDamageFactor = Math.sqrt((total * fireCircle.damageFactor) / radiusEx2);
    return {
        radius: Math.sqrt(total / newDamageFactor),
        damageFactor: newDamageFactor,
    };
}
