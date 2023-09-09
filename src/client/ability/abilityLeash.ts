import { findCharacterById, getPlayerCharacters } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { calculateDirection, calculateDistance, getNextId } from "../game.js";
import { Position, Game, IdCounter, FACTION_PLAYER } from "../gameModel.js";
import { getFirstBlockingGameMapTilePositionTouchingLine } from "../map/map.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner } from "./ability.js";

export type AbilityLeash = Ability & {
    leashMaxLength: number,
    leashBendPoints: Position[],
    leashedToOwnerId?: number,
}

export const ABILITY_NAME_LEASH = "Leash";

export function addAbilityLesh() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_LEASH] = {
        tickAbility: tickAbilityLeash,
        paintAbility: paintAbilityLeash,
        createAbility: createAbilityLeash,
        setAbilityToBossLevel: setAbilityToBossLevel,
        notInheritable: true,
        isPassive: true,
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

function setAbilityToBossLevel(ability: Ability, level: number){
    let abilityLeash = ability as AbilityLeash;
    abilityLeash.leashMaxLength = 80 + level * 10;
}

function paintAbilityLeash(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    let abilityLeash = ability as AbilityLeash;
    if (abilityLeash.leashedToOwnerId !== undefined) {
        let centerX = ctx.canvas.width / 2;
        let centerY = ctx.canvas.height / 2;
        let paintX = Math.floor(abilityOwner.x - cameraPosition.x + centerX);
        let paintY = Math.floor(abilityOwner.y - cameraPosition.y + centerY);
        let connectedOwner: Position | null = findLeashOwner(abilityOwner, abilityLeash, game);;
        if(!connectedOwner){
            return;
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = "black";
        
        ctx.beginPath();
        paintX = Math.floor(abilityOwner.x - cameraPosition.x + centerX);
        paintY = Math.floor(abilityOwner.y - cameraPosition.y + centerY);
        ctx.moveTo(paintX, paintY);
        for(let pos of abilityLeash.leashBendPoints){
            paintX = Math.floor(pos.x - cameraPosition.x + centerX);
            paintY = Math.floor(pos.y - cameraPosition.y + centerY);
            ctx.lineTo(paintX, paintY);    
        }
        paintX = Math.floor(connectedOwner.x - cameraPosition.x + centerX);
        paintY = Math.floor(connectedOwner.y - cameraPosition.y + centerY);
        ctx.lineTo(paintX, paintY);
        ctx.stroke();
    }

}

function findLeashOwner(abilityOwner: AbilityOwner, ability: AbilityLeash, game: Game): Character | null{
    let characters: Character[];
    if(ability.leashedToOwnerId === undefined) return null;
    if(abilityOwner.faction === FACTION_PLAYER){
        characters = getPlayerCharacters(game.state.players);
    }else{
        characters = game.state.bossStuff.bosses;
    }
    return findCharacterById(characters, ability.leashedToOwnerId);

}

function tickAbilityLeash(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilityLeash = ability as AbilityLeash;

    if(abilityLeash.leashedToOwnerId !== undefined){
        let connectedOwner: Character | null = findLeashOwner(abilityOwner, abilityLeash, game);
        if(!connectedOwner){
            console.log("leash owner not found", ability);
            delete abilityLeash.leashedToOwnerId;
            return;
        } 
        findAndRemoveUnnecessaryLeashBends(abilityOwner, connectedOwner, abilityLeash, game);
        const success = findAndAddNewLeashBends(abilityOwner, connectedOwner, abilityLeash, game);
        if(!success){
            teleportAndClearLeashBends(connectedOwner, abilityOwner, abilityLeash);
        }

        let leashLength = calculateLeashLength(abilityOwner, connectedOwner, abilityLeash);
        if(leashLength > abilityLeash.leashMaxLength){
            let pullForce = (leashLength - abilityLeash.leashMaxLength) / 10;
            if(pullForce > 100){
                abilityOwner.x = connectedOwner.x;
                abilityOwner.y = connectedOwner.y;
                abilityLeash.leashBendPoints = [];
            }else{
                let pullPosition: Position;
                if(abilityLeash.leashBendPoints.length > 0){
                    pullPosition =  abilityLeash.leashBendPoints[0];
                }else{
                    pullPosition =  connectedOwner;
                }
                let weightFactor =  connectedOwner.weight / abilityOwner.weight!;
                if(weightFactor > 1){
                    weightFactor = 1;
                }
                pullCharacterTowardsPosition(pullForce * weightFactor, abilityOwner, pullPosition);
    
                if(abilityLeash.leashBendPoints.length > 0){
                    pullPosition =  abilityLeash.leashBendPoints[abilityLeash.leashBendPoints.length-1];
                }else{
                    pullPosition =  abilityOwner;
                }

                const connectBonus = 2;
                weightFactor = abilityOwner.weight! / connectedOwner.weight / connectBonus;
                if(weightFactor > 1){
                    weightFactor = 1;
                }
                pullCharacterTowardsPosition(pullForce * weightFactor, connectedOwner, pullPosition);
            }
        }
    }
}

function teleportAndClearLeashBends(connectedOwner: Character, abilityOwner: AbilityOwner, ability: AbilityLeash){
    abilityOwner.x = connectedOwner.x;
    abilityOwner.y = connectedOwner.y;
    ability.leashBendPoints = [];
}

function pullCharacterTowardsPosition(pullForce: number, character: Position, pullPosition: Position){
    const direction = calculateDirection(character, pullPosition);
    character.x = character.x + Math.cos(direction) * pullForce;
    character.y = character.y + Math.sin(direction) * pullForce;
}

function getNewLeashBendPosIfBlocking(startPosition: Position, endPosition: Position, abilityLeash: AbilityLeash, game: Game): Position | undefined{
    const map = game.state.map;
    let blockingPos = getFirstBlockingGameMapTilePositionTouchingLine(game.state.map, startPosition, endPosition, game);
    if(blockingPos){
        let moduloX = blockingPos.x % map.tileSize;
        if(moduloX < 0) moduloX = moduloX + map.tileSize;
        if(moduloX > map.tileSize / 2){
            blockingPos.x = Math.ceil(blockingPos.x + map.tileSize - moduloX + 0.1);
        }else{
            blockingPos.x = Math.floor(blockingPos.x - moduloX - 0.1);
        }

        let moduloY = blockingPos.y % map.tileSize;
        if(moduloY < 0) moduloY = moduloY + map.tileSize;
        if(moduloY > map.tileSize / 2){
            blockingPos.y = Math.ceil(blockingPos.y + map.tileSize - moduloY + 0.1);
        }else{
            blockingPos.y = Math.floor(blockingPos.y - moduloY - 0.1);
        }
        return blockingPos;
    }

    return undefined;
}

function findAndAddNewLeashBends(abilityOwner: Position, connectedOwner: Position, abilityLeash: AbilityLeash, game: Game): boolean{
    const map = game.state.map;
    let firstPoint: Position;
    if(abilityLeash.leashBendPoints.length === 0){
        firstPoint = abilityOwner;
    }else{
        firstPoint = abilityLeash.leashBendPoints[abilityLeash.leashBendPoints.length - 1];
    }
    let newLeashBendPos = getNewLeashBendPosIfBlocking(connectedOwner, firstPoint, abilityLeash, game);
    if(newLeashBendPos){
        abilityLeash.leashBendPoints.push(newLeashBendPos);
        let blockingPos = getFirstBlockingGameMapTilePositionTouchingLine(map, connectedOwner, newLeashBendPos, game);
        if(blockingPos){
            console.log("blocking pos after adding bendPos!");
            return false;
        }else{
            const endPoint = abilityLeash.leashBendPoints.length > 1 ? abilityLeash.leashBendPoints[abilityLeash.leashBendPoints.length - 2] : abilityOwner;
            blockingPos = getFirstBlockingGameMapTilePositionTouchingLine(map, endPoint, newLeashBendPos, game);
            if(blockingPos){
                console.log("blocking pos 2 after adding bendPos!");
                return false;
            }
        }
    }

    if(abilityLeash.leashBendPoints.length > 0){
        newLeashBendPos = getNewLeashBendPosIfBlocking(abilityOwner, abilityLeash.leashBendPoints[0], abilityLeash, game);
        if(newLeashBendPos){
            abilityLeash.leashBendPoints.unshift(newLeashBendPos);
        }
    }
    return true;
}

function findAndRemoveUnnecessaryLeashBends(abilityOwner: Position, connectedOwner: Position, abilityLeash: AbilityLeash, game: Game){
    if(abilityLeash.leashBendPoints.length === 0 ) return;
    let distance = calculateDistance(abilityOwner, abilityLeash.leashBendPoints[0]);
    if(distance < 2) {
        const poped = abilityLeash.leashBendPoints.shift();
    }else{
        let secondPos: Position;
        if(abilityLeash.leashBendPoints.length > 1){
            secondPos = abilityLeash.leashBendPoints[1];
        }else{
            secondPos = connectedOwner;
        }
        let blockingPos = getFirstBlockingGameMapTilePositionTouchingLine(game.state.map, abilityOwner, secondPos, game);
        if(blockingPos === undefined){
            const poped = abilityLeash.leashBendPoints.shift();
        }

        if(abilityLeash.leashBendPoints.length > 1){
            secondPos = abilityLeash.leashBendPoints[abilityLeash.leashBendPoints.length - 2];
            blockingPos = getFirstBlockingGameMapTilePositionTouchingLine(game.state.map, connectedOwner, secondPos, game);
            if(blockingPos === undefined){
                const poped = abilityLeash.leashBendPoints.pop();
            }
        }
    }
}

function calculateLeashLength(abilityOwner: Position, connectedOwner: Position, abilityLeash: AbilityLeash){
    let currentPoint = abilityOwner;
    const lastPoint = connectedOwner;
    let distance = 0;
    for(let i = 0; i < abilityLeash.leashBendPoints.length + 1; i++){
        if(abilityLeash.leashBendPoints.length === i){
            distance += calculateDistance(currentPoint, lastPoint);
        }else{
            distance += calculateDistance(currentPoint, abilityLeash.leashBendPoints[i]);
            currentPoint = abilityLeash.leashBendPoints[i];
        }
    }
    return distance;
}
