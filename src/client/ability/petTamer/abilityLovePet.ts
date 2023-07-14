import { findCharacterById } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { TamerPetCharacter, changeTamerPetHappines } from "../../character/playerCharacters/tamerPetCharacter.js";
import { calculateDirection, calculateDistance, getCameraPosition, getNextId } from "../../game.js";
import { IdCounter, Position, Game } from "../../gameModel.js";
import { GAME_IMAGES, getImage, loadImage } from "../../imageLoad.js";
import { moveByDirectionAndDistance } from "../../map/map.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, AbilityUpgradeOption, PaintOrderAbility } from "../ability.js";

export type AbilityLovePet = Ability & {
    loveValue: number,
    range: number,
    baseRechargeTime: number,
    nextRechargeTime?: number,
}

export type AbilityObjectLovePet = AbilityObject & {
    loveValue: number,
    targetCharacterId: number,
    reachedTarget: boolean,
}

export const ABILITY_NAME_LOVE_PET = "LovePet";
GAME_IMAGES[ABILITY_NAME_LOVE_PET] = {
    imagePath: "/images/heart.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};

export function addAbilityLovePet() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_LOVE_PET] = {
        createAbilityUpgradeOptions: createAbilityLovePetUpgradeOptions,
        activeAbilityCast: castLovePet,
        createAbility: createAbilityLovePet,
        paintAbilityUI: paintAbilityLovePetUI,
        paintAbilityObject: paintAbilityObjectLovePet,
        tickAbilityObject: tickAbilityObjectLovePet,
        deleteAbilityObject: deleteAbilityObjectLovePet,
        isPassive: false,
        notInheritable: true,
    };
}

export function createAbilityLovePet(
    idCounter: IdCounter,
    playerInputBinding?: string,
    range: number = 200,
    rechargeTime: number = 100,
): AbilityLovePet {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_LOVE_PET,
        passive: false,
        playerInputBinding: playerInputBinding,
        baseRechargeTime: rechargeTime,
        range: range,
        upgrades: {},
        loveValue: 30,
    };
}

function deleteAbilityObjectLovePet(abilityObject: AbilityObject, game: Game): boolean {
    const abilityObjectLovePet = abilityObject as AbilityObjectLovePet;
    return abilityObjectLovePet.reachedTarget;
}

function tickAbilityObjectLovePet(abilityObject: AbilityObject, game: Game) {
    const abilityObjectLovePet = abilityObject as AbilityObjectLovePet;
    if (abilityObjectLovePet.reachedTarget) return;
    let target: Character | null = null;
    for (let player of game.state.players) {
        if (player.character.pets) {
            target = findCharacterById(player.character.pets, abilityObjectLovePet.targetCharacterId);
            if (target !== null) break;
        }
    }

    if (target) {
        const moveDirection = calculateDirection(abilityObject, target);
        moveByDirectionAndDistance(abilityObject, moveDirection, 3, false);
        const distance = calculateDistance(abilityObject, target);
        if (distance < 3) {
            let pet = target as TamerPetCharacter;
            changeTamerPetHappines(pet, abilityObjectLovePet.loveValue, game.state.time, true);
            abilityObjectLovePet.reachedTarget = true;
        }
    }
}

function paintAbilityObjectLovePet(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "afterCharacterPaint") return;
    let cameraPosition = getCameraPosition(game);
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let paintX = Math.floor(abilityObject.x - cameraPosition.x + centerX);
    let paintY = Math.floor(abilityObject.y - cameraPosition.y + centerY);

    let meatImage = getImage(ABILITY_NAME_LOVE_PET);
    if (meatImage) {
        ctx.drawImage(meatImage, paintX - 20, paintY - 20);
    }
}

function paintAbilityLovePetUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    let lovePet = ability as AbilityLovePet;
    let fontSize = 12;
    let rectSize = size;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.font = fontSize + "px Arial";

    if (lovePet.nextRechargeTime !== undefined && game.state.time < lovePet.nextRechargeTime) {
        ctx.fillStyle = "gray";
        const heightFactor = Math.max((lovePet.nextRechargeTime - game.state.time) / lovePet.baseRechargeTime, 0);
        ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize * heightFactor);
    }

    let meatImage = getImage(ABILITY_NAME_LOVE_PET);
    if (meatImage) {
        ctx.drawImage(meatImage, drawStartX, drawStartY);
    }

    if (lovePet.playerInputBinding) {
        let keyBind = playerInputBindingToDisplayValue(lovePet.playerInputBinding, game);
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(keyBind, drawStartX + 1, drawStartY + 8);
    }
}

function castLovePet(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isInputdown: boolean, game: Game) {
    if (!isInputdown || abilityOwner.pets === undefined) return;
    const abilityLovePet = ability as AbilityLovePet;

    if (abilityLovePet.nextRechargeTime === undefined || game.state.time >= abilityLovePet.nextRechargeTime) {
        let distance: number = 40;
        let closetPet: TamerPetCharacter | undefined = undefined;
        for (let pet of abilityOwner.pets!) {
            let tempRangeToClick = calculateDistance(pet, castPosition);
            let tempRangeToOwner = calculateDistance(pet, abilityOwner);
            if (tempRangeToOwner <= abilityLovePet.range && tempRangeToClick < distance) {
                closetPet = pet as TamerPetCharacter;
                distance = tempRangeToClick;
            }
        }
        if (closetPet) {
            abilityLovePet.nextRechargeTime = game.state.time + abilityLovePet.baseRechargeTime;

            let objectLovePet: AbilityObjectLovePet = {
                loveValue: abilityLovePet.loveValue,
                targetCharacterId: closetPet.id,
                reachedTarget: false,
                color: "white",
                damage: 0,
                faction: "player",
                type: ABILITY_NAME_LOVE_PET,
                x: abilityOwner.x,
                y: abilityOwner.y,
                abilityRefId: ability.id,
            }
            game.state.abilityObjects.push(objectLovePet);
        }

    }


}

function createAbilityLovePetUpgradeOptions(ability: Ability): AbilityUpgradeOption[] {
    let upgradeOptions: AbilityUpgradeOption[] = [];
    upgradeOptions.push({
        name: "Love pet +10", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilityLovePet;
            as.loveValue += 10;
        }
    });

    return upgradeOptions;
}
