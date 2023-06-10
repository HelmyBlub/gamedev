import { findCharacterById, getPlayerCharacters } from "../character/character.js";
import { calculateDirection, calculateDistance, getNextId } from "../game.js";
import { Position, Game, IdCounter } from "../gameModel.js";
import { getFirstBlockingGameMapTilePositionTouchingLine } from "../map/map.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, AbilityUpgradeOption } from "./ability.js";

type AbilityLeash = Ability & {
    leashMaxLength: number,
    leashBendPoints: Position[],
    leashedToOwnerId?: number,
}

const ABILITY_NAME_LEASH = "Leash";

export function addLeshAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_LEASH] = {
        tickAbility: tickAbilityLeash,
        createAbilityUpgradeOptions: createAbilityLeashUpgradeOptions,
        paintAbility: paintAbilityLeash,
        createAbility: createAbilityLeash,
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

function paintAbilityLeash(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    let abilityLeash = ability as AbilityLeash;
    if (abilityLeash.leashedToOwnerId !== undefined) {
        let centerX = ctx.canvas.width / 2;
        let centerY = ctx.canvas.height / 2;
        let paintX = Math.floor(abilityOwner.x - cameraPosition.x + centerX);
        let paintY = Math.floor(abilityOwner.y - cameraPosition.y + centerY);
        let characters = getPlayerCharacters(game.state.players);
        let connectedOwner: Position | null = findCharacterById(characters, abilityLeash.leashedToOwnerId);
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

function tickAbilityLeash(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilityLeash = ability as AbilityLeash;

    if(abilityLeash.leashedToOwnerId !== undefined){
        let characters = getPlayerCharacters(game.state.players);
        let connectedOwner: Position | null = findCharacterById(characters, abilityLeash.leashedToOwnerId);
        if(!connectedOwner){
            console.log("leash owner not found", ability);
            delete abilityLeash.leashedToOwnerId;
            return;
        } 
        findAndRemoveUnnecessaryLeashBends(abilityOwner, connectedOwner, abilityLeash, game);
        findAndAddNewLeashBends(abilityOwner, connectedOwner, abilityLeash, game);

        let distance = calculateLeashLength(abilityOwner, connectedOwner, abilityLeash);
        if(distance > abilityLeash.leashMaxLength){
            if(distance <= abilityLeash.leashMaxLength * 2){
                let pullSpeed = (distance - abilityLeash.leashMaxLength) / 10;
                let direction: number;
                if(abilityLeash.leashBendPoints.length > 0){
                    direction = calculateDirection(abilityOwner, abilityLeash.leashBendPoints[0]);
                }else{
                    direction = calculateDirection(abilityOwner, connectedOwner);
                }
                abilityOwner.x = abilityOwner.x + Math.cos(direction) * pullSpeed;
                abilityOwner.y = abilityOwner.y + Math.sin(direction) * pullSpeed;
            }else{
                abilityOwner.x = connectedOwner.x;
                abilityOwner.y = connectedOwner.y;
            }
        }
    }
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

function findAndAddNewLeashBends(abilityOwner: Position, connectedOwner: Position, abilityLeash: AbilityLeash, game: Game){
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
    }

    if(abilityLeash.leashBendPoints.length > 0){
        newLeashBendPos = getNewLeashBendPosIfBlocking(abilityOwner, abilityLeash.leashBendPoints[0], abilityLeash, game);
        if(newLeashBendPos){
            abilityLeash.leashBendPoints.unshift(newLeashBendPos);
        }
    }
}

function findAndRemoveUnnecessaryLeashBends(abilityOwner: Position, connectedOwner: Position, abilityLeash: AbilityLeash, game: Game){
    if(abilityLeash.leashBendPoints.length === 0 ) return;
    let distance = calculateDistance(abilityOwner, abilityLeash.leashBendPoints[0]);
    if(distance < 2) {
        const poped = abilityLeash.leashBendPoints.shift();
        console.log("pop by distance leashPoint", poped);
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
            console.log("pop pet leashPoint", poped);
        }

        if(abilityLeash.leashBendPoints.length > 1){
            secondPos = abilityLeash.leashBendPoints[abilityLeash.leashBendPoints.length - 2];
            blockingPos = getFirstBlockingGameMapTilePositionTouchingLine(game.state.map, connectedOwner, secondPos, game);
            if(blockingPos === undefined){
                const poped = abilityLeash.leashBendPoints.pop();
                console.log("pop owner leashPoint", poped);
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

function createAbilityLeashUpgradeOptions(): AbilityUpgradeOption[] {
    let upgradeOptions: AbilityUpgradeOption[] = [];
    upgradeOptions.push({
        name: "LeashLength+10", probabilityFactor: 1, upgrade: (a: Ability) => {
            let al = a as AbilityLeash;
            al.leashMaxLength += 10;
        }
    });

    return upgradeOptions;
}