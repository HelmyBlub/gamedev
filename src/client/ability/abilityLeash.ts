import { findCharacterById, getPlayerCharacters, setCharacterPosition } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { calculateDirection, calculateDistance, getNextId } from "../game.js";
import { Position, Game, IdCounter, FACTION_PLAYER } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
import { GameMap, getFirstBlockingGameMapTilePositionTouchingLine } from "../map/map.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner } from "./ability.js";

export type AbilityLeash = Ability & {
    leashMaxLength: number,
    leashBendPoints: Position[],
    leashedToOwnerId?: number,
}

export const ABILITY_NAME_LEASH = "Leash";

export function addAbilityLesh() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_LEASH] = {
        createAbility: createAbilityLeash,
        paintAbility: paintAbilityLeash,
        setAbilityToBossLevel: setAbilityToBossLevel,
        tickAbility: tickAbilityLeash,
        resetAbility: reset,
    };
}

export function createAbilityLeash(
    idCounter: IdCounter,
    playerInputBinding?: string,
    leashMaxLength: number = 150,
    leashedToOwnerId: number | undefined = undefined,
): AbilityLeash {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_LEASH,
        leashMaxLength: leashMaxLength,
        leashedToOwnerId: leashedToOwnerId,
        passive: true,
        leashBendPoints: [],
        upgrades: {},
    };
}

function reset(ability: Ability) {
    const abilityLeash = ability as AbilityLeash;
    abilityLeash.leashBendPoints = [];
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const abilityLeash = ability as AbilityLeash;
    abilityLeash.leashMaxLength = 80 + level * 10;
}

function paintAbilityLeash(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abilityLeash = ability as AbilityLeash;
    if (abilityLeash.leashedToOwnerId !== undefined) {
        let paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
        const connectedOwner: Position | null = findLeashOwner(abilityOwner, abilityLeash, game);
        if (!connectedOwner) {
            return;
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = "black";

        ctx.beginPath();
        ctx.moveTo(paintPos.x, paintPos.y);
        for (let pos of abilityLeash.leashBendPoints) {
            paintPos = getPointPaintPosition(ctx, pos, cameraPosition);
            ctx.lineTo(paintPos.x, paintPos.y);
        }
        paintPos = getPointPaintPosition(ctx, connectedOwner, cameraPosition);
        ctx.lineTo(paintPos.x, paintPos.y);
        ctx.stroke();
    }

}

function findLeashOwner(abilityOwner: AbilityOwner, ability: AbilityLeash, game: Game): Character | null {
    let characters: Character[];
    if (ability.leashedToOwnerId === undefined) return null;
    if (abilityOwner.faction === FACTION_PLAYER) {
        characters = getPlayerCharacters(game.state.players);
        for (let char of game.state.pastPlayerCharacters.characters) {
            if (char) characters.push(char);
        }
        return findCharacterById(characters, ability.leashedToOwnerId);
    } else {
        characters = game.state.bossStuff.bosses;
        let character = findCharacterById(characters, ability.leashedToOwnerId);
        if (character) return character;
        for (let i = 0; i < game.state.map.activeChunkKeys.length; i++) {
            const chunk = game.state.map.chunks[game.state.map.activeChunkKeys[i]];
            character = findCharacterById(chunk.characters, ability.leashedToOwnerId);
            if (character) return character;
        }
    }
    return null;
}

function tickAbilityLeash(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilityLeash = ability as AbilityLeash;

    if (abilityLeash.leashedToOwnerId !== undefined) {
        let connectedOwner: Character | null = findLeashOwner(abilityOwner, abilityLeash, game);
        if (!connectedOwner) {
            // can happen if in one tick map character connectedOwner of a pet moves back outside of active chunks
            return;
        }
        findAndRemoveUnnecessaryLeashBends(abilityOwner, connectedOwner, abilityLeash, game);
        const success = findAndAddNewLeashBends(abilityOwner, connectedOwner, abilityLeash, game);
        if (!success) {
            teleportAndClearLeashBends(connectedOwner, abilityOwner, abilityLeash, game.state.map);
        }

        let leashLength = calculateLeashLength(abilityOwner, connectedOwner, abilityLeash);
        if (leashLength > abilityLeash.leashMaxLength) {
            let pullForce = (leashLength - abilityLeash.leashMaxLength) / 10;
            if (pullForce > 100) {
                teleportAndClearLeashBends(connectedOwner, abilityOwner, abilityLeash, game.state.map);
            } else {
                let pullPosition: Position;
                if (abilityLeash.leashBendPoints.length > 0) {
                    pullPosition = abilityLeash.leashBendPoints[0];
                } else {
                    pullPosition = connectedOwner;
                }
                let weightFactor = connectedOwner.weight / abilityOwner.weight!;
                if (weightFactor > 1) {
                    weightFactor = 1;
                }
                if (!abilityOwner.isUnMoveAble) {
                    pullCharacterTowardsPosition(pullForce * weightFactor, abilityOwner as Character, pullPosition, game.state.map);
                }

                if (abilityLeash.leashBendPoints.length > 0) {
                    pullPosition = abilityLeash.leashBendPoints[abilityLeash.leashBendPoints.length - 1];
                } else {
                    pullPosition = abilityOwner;
                }

                const connectBonus = 2;
                weightFactor = abilityOwner.weight! / connectedOwner.weight / connectBonus;
                if (weightFactor > 1) {
                    weightFactor = 1;
                }
                if (!connectedOwner.isUnMoveAble) {
                    pullCharacterTowardsPosition(pullForce * weightFactor, connectedOwner as Character, pullPosition, game.state.map);
                }
            }
        }
    }
}

function teleportAndClearLeashBends(connectedOwner: Character, abilityOwner: AbilityOwner, ability: AbilityLeash, map: GameMap) {
    setCharacterPosition(abilityOwner as Character, connectedOwner, map);
    ability.leashBendPoints = [];
}

function pullCharacterTowardsPosition(pullForce: number, character: Character, pullPosition: Position, map: GameMap) {
    const direction = calculateDirection(character, pullPosition);
    const newPos = {
        x: character.x + Math.cos(direction) * pullForce,
        y: character.y + Math.sin(direction) * pullForce,
    }
    setCharacterPosition(character, newPos, map);
}

function getNewLeashBendPosIfBlocking(startPosition: Position, endPosition: Position, abilityLeash: AbilityLeash, game: Game): Position | undefined {
    const map = game.state.map;
    let blockingPos = getFirstBlockingGameMapTilePositionTouchingLine(game.state.map, startPosition, endPosition, game);
    if (blockingPos) {
        let moduloX = blockingPos.x % map.tileSize;
        if (moduloX < 0) moduloX = moduloX + map.tileSize;
        if (moduloX > map.tileSize / 2) {
            blockingPos.x = Math.ceil(blockingPos.x + map.tileSize - moduloX + 0.1);
        } else {
            blockingPos.x = Math.floor(blockingPos.x - moduloX - 0.1);
        }

        let moduloY = blockingPos.y % map.tileSize;
        if (moduloY < 0) moduloY = moduloY + map.tileSize;
        if (moduloY > map.tileSize / 2) {
            blockingPos.y = Math.ceil(blockingPos.y + map.tileSize - moduloY + 0.1);
        } else {
            blockingPos.y = Math.floor(blockingPos.y - moduloY - 0.1);
        }
        return blockingPos;
    }

    return undefined;
}

function findAndAddNewLeashBends(abilityOwner: Position, connectedOwner: Position, abilityLeash: AbilityLeash, game: Game): boolean {
    const map = game.state.map;
    let firstPoint: Position;
    if (abilityLeash.leashBendPoints.length === 0) {
        firstPoint = abilityOwner;
    } else {
        firstPoint = abilityLeash.leashBendPoints[abilityLeash.leashBendPoints.length - 1];
    }
    let newLeashBendPos = getNewLeashBendPosIfBlocking(connectedOwner, firstPoint, abilityLeash, game);
    if (newLeashBendPos) {
        abilityLeash.leashBendPoints.push(newLeashBendPos);
        let blockingPos = getFirstBlockingGameMapTilePositionTouchingLine(map, connectedOwner, newLeashBendPos, game);
        if (blockingPos) {
            return false;
        } else {
            const endPoint = abilityLeash.leashBendPoints.length > 1 ? abilityLeash.leashBendPoints[abilityLeash.leashBendPoints.length - 2] : abilityOwner;
            blockingPos = getFirstBlockingGameMapTilePositionTouchingLine(map, endPoint, newLeashBendPos, game);
            if (blockingPos) {
                return false;
            }
        }
    }

    if (abilityLeash.leashBendPoints.length > 0) {
        newLeashBendPos = getNewLeashBendPosIfBlocking(abilityOwner, abilityLeash.leashBendPoints[0], abilityLeash, game);
        if (newLeashBendPos) {
            abilityLeash.leashBendPoints.unshift(newLeashBendPos);
        }
    }
    return true;
}

function findAndRemoveUnnecessaryLeashBends(abilityOwner: Position, connectedOwner: Position, abilityLeash: AbilityLeash, game: Game) {
    if (abilityLeash.leashBendPoints.length === 0) return;
    let distance = calculateDistance(abilityOwner, abilityLeash.leashBendPoints[0]);
    if (distance < 2) {
        const poped = abilityLeash.leashBendPoints.shift();
    } else {
        let secondPos: Position;
        if (abilityLeash.leashBendPoints.length > 1) {
            secondPos = abilityLeash.leashBendPoints[1];
        } else {
            secondPos = connectedOwner;
        }
        let blockingPos = getFirstBlockingGameMapTilePositionTouchingLine(game.state.map, abilityOwner, secondPos, game);
        if (blockingPos === undefined) {
            const poped = abilityLeash.leashBendPoints.shift();
        }

        if (abilityLeash.leashBendPoints.length > 1) {
            secondPos = abilityLeash.leashBendPoints[abilityLeash.leashBendPoints.length - 2];
            blockingPos = getFirstBlockingGameMapTilePositionTouchingLine(game.state.map, connectedOwner, secondPos, game);
            if (blockingPos === undefined) {
                const poped = abilityLeash.leashBendPoints.pop();
            }
        }
    }
}

function calculateLeashLength(abilityOwner: Position, connectedOwner: Position, abilityLeash: AbilityLeash) {
    let currentPoint = abilityOwner;
    const lastPoint = connectedOwner;
    let distance = 0;
    for (let i = 0; i < abilityLeash.leashBendPoints.length + 1; i++) {
        if (abilityLeash.leashBendPoints.length === i) {
            distance += calculateDistance(currentPoint, lastPoint);
        } else {
            distance += calculateDistance(currentPoint, abilityLeash.leashBendPoints[i]);
            currentPoint = abilityLeash.leashBendPoints[i];
        }
    }
    return distance;
}
