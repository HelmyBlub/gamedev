import { findCharacterById, getPlayerCharacters } from "../character/character.js";
import { calculateDirection, calculateDistance, getNextId } from "../game.js";
import { Position, Game, IdCounter } from "../gameModel.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, AbilityUpgradeOption } from "./ability.js";

type AbilityLeash = Ability & {
    leashMaxLength: number,
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
            console.log("leash owner does not found", ability);
            delete abilityLeash.leashedToOwnerId;
            return;
        } 
        let distance = calculateDistance(abilityOwner, connectedOwner);
        if(distance > abilityLeash.leashMaxLength){
            if(distance <= abilityLeash.leashMaxLength * 2){
                let pullSpeed = (distance - abilityLeash.leashMaxLength) / 10;
                let direction = calculateDirection(abilityOwner, connectedOwner);
                abilityOwner.x = abilityOwner.x + Math.cos(direction) * pullSpeed;
                abilityOwner.y = abilityOwner.y + Math.sin(direction) * pullSpeed;
            }else{
                abilityOwner.x = connectedOwner.x;
                abilityOwner.y = connectedOwner.y;
            }
        }
    }
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