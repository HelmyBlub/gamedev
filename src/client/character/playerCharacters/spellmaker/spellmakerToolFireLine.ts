import { AbilityOwner } from "../../../ability/ability.js";
import { calculateDistance, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, abilitySpellmakerCalculateManaCost } from "./abilitySpellmaker.js";
import { SPELLMAKER_TOOLS_FUNCTIONS } from "./spellmakerTool.js";

export const SPELLMAKER_TOOL_FIRELINE = "FireLine";

export function addSpellmakerToolFireline() {
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_FIRELINE] = {
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
    };
}


function onKeyDown(abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    ability.attachToIndex = ability.fireLines.length - 1;
}

function onKeyUp(abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    if (ability.startPosition) {
        const pushIndex = ability.attachToIndex;
        if (ability.fireLines[pushIndex].positions.length == 0) {
            ability.fireLines[pushIndex].positions.push(ability.startPosition);
        }
        ability.fireLines[pushIndex].positions.push(castPositionRelativeToCharacter!);
        abilitySpellmakerCalculateManaCost(ability);
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
            const startPos = ability.fireLines[pushIndex].positions.length == 0 ? ability.startPosition : ability.fireLines[pushIndex].positions[ability.fireLines[pushIndex].positions.length - 1];
            const distance = calculateDistance(startPos, end);
            if (distance > 40) {
                if (ability.fireLines[pushIndex].positions.length == 0) {
                    ability.fireLines[pushIndex].positions.push(ability.startPosition);
                }
                ability.fireLines[pushIndex].positions.push(end);
                abilitySpellmakerCalculateManaCost(ability);
            }
        }
    }
}

