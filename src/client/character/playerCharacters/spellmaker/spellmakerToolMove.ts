import { AbilityOwner } from "../../../ability/ability.js";
import { calculateDistance, calculateDistancePointToLine, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker } from "./abilitySpellmaker.js";
import { SPELLMAKER_TOOLS_FUNCTIONS } from "./spellmakerTool.js";

export const SPELLMAKER_TOOL_MOVE = "Move";

export function addSpellmakerToolMove() {
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_MOVE] = {
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
    };
}


function onKeyDown(abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    let closestDistance = 0;
    let closestIndex: number | undefined = undefined;
    for (let fireLineIndex = 0; fireLineIndex < ability.fireLines.length; fireLineIndex++) {
        const fireline = ability.fireLines[fireLineIndex];
        for (let i = 1; i < fireline.positions.length; i++) {
            const tempDistance = calculateDistancePointToLine(castPositionRelativeToCharacter, fireline.positions[i - 1], fireline.positions[i]);
            if (closestIndex == undefined || closestDistance > tempDistance) {
                closestDistance = tempDistance;
                closestIndex = fireLineIndex;
            }
        }
    }
    ability.attachToIndex = closestIndex ?? 0;
    if (ability.fireLines[ability.attachToIndex].moveToPositions.length > 0) {
        ability.fireLines[ability.attachToIndex].moveToPositions = [];
    }
}

function onKeyUp(abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    if (ability.startPosition) {
        const pushIndex = ability.attachToIndex;
        if (ability.fireLines[pushIndex].moveToPositions.length == 0) {
            ability.fireLines[pushIndex].moveToPositions.push(ability.startPosition);
        }
        ability.fireLines[pushIndex].moveToPositions.push(castPositionRelativeToCharacter!);
    }
}

function onTick(abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) {
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) {
        if (ability.startPosition) {
            const end: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            const pushIndex = ability.attachToIndex;
            const startPos = ability.fireLines[pushIndex].moveToPositions.length == 0 ? ability.startPosition : ability.fireLines[pushIndex].moveToPositions[ability.fireLines[pushIndex].moveToPositions.length - 1];
            const distance = calculateDistance(startPos, end);
            if (distance > 40) {
                if (ability.fireLines[pushIndex].moveToPositions.length == 0) {
                    ability.fireLines[pushIndex].moveToPositions.push(ability.startPosition);
                }
                ability.fireLines[pushIndex].moveToPositions.push(end);
            }
        }
    }
}
