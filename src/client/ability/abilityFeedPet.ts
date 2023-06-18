import { findCharacterById } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { TamerPetCharacter, tamerPetFeed } from "../character/playerCharacters/tamerPetCharacter.js";
import { calculateDirection, calculateDistance, getCameraPosition, getNextId } from "../game.js";
import { IdCounter, Position, Game } from "../gameModel.js";
import { GAME_IMAGES, getImage, loadImage } from "../imageLoad.js";
import { moveByDirectionAndDistance } from "../map/map.js";
import { playerInputBindingToDisplayValue } from "../playerInput.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, AbilityUpgradeOption, PaintOrderAbility } from "./ability.js";

export type AbilityFeedPet = Ability & {
    feedValue: number,
    range: number,
    baseRechargeTime: number,
    nextRechargeTime?: number,
}

export type AbilityObjectFeedPet = AbilityObject & {
    feedValue: number,
    targetCharacterId: number,
    reachedTarget: boolean,
}

export const ABILITY_NAME_FEED_PET = "FeedPet";
GAME_IMAGES[ABILITY_NAME_FEED_PET] = {
    imagePath: "/images/meat.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};

export function addFeedPetAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_FEED_PET] = {
        createAbilityUpgradeOptions: createAbilityFeedPetUpgradeOptions,
        activeAbilityCast: castFeedPet,
        createAbility: createAbilityFeedPet,
        paintAbilityUI: paintAbilityFeedPetUI,
        paintAbilityObject: paintAbilityObjectFeedPet,
        tickAbilityObject: tickAbilityObjectFeedPet,
        deleteAbilityObject: deleteAbilityObjectFeedPet,
        isPassive: false,
        notInheritable: true,
    };
}

export function createAbilityFeedPet(
    idCounter: IdCounter,
    playerInputBinding?: string,
    range: number = 200,
    rechargeTime: number = 500,
): AbilityFeedPet {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_FEED_PET,
        passive: false,
        playerInputBinding: playerInputBinding,
        baseRechargeTime: rechargeTime,
        range: range,
        upgrades: {},
        feedValue: 30,
    };
}

function deleteAbilityObjectFeedPet(abilityObject: AbilityObject, game: Game): boolean {
    const abilityObjectFeedPet = abilityObject as AbilityObjectFeedPet;
    return abilityObjectFeedPet.reachedTarget;
}

function tickAbilityObjectFeedPet(abilityObject: AbilityObject, game: Game) {
    const abilityObjectFeedPet = abilityObject as AbilityObjectFeedPet;
    if (abilityObjectFeedPet.reachedTarget) return;
    let target: Character | null = null;
    for (let player of game.state.players) {
        if (player.character.pets) {
            target = findCharacterById(player.character.pets, abilityObjectFeedPet.targetCharacterId);
            if (target !== null) break;
        }
    }

    if (target) {
        const moveDirection = calculateDirection(abilityObject, target);
        moveByDirectionAndDistance(abilityObject, moveDirection, 3, false);
        const distance = calculateDistance(abilityObject, target);
        if (distance < 3) {
            let pet = target as TamerPetCharacter;
            tamerPetFeed(pet, abilityObjectFeedPet.feedValue);
            abilityObjectFeedPet.reachedTarget = true;
        }
    }
}

function paintAbilityObjectFeedPet(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "afterCharacterPaint") return;
    let cameraPosition = getCameraPosition(game);
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let paintX = Math.floor(abilityObject.x - cameraPosition.x + centerX);
    let paintY = Math.floor(abilityObject.y - cameraPosition.y + centerY);

    let meatImage = getImage(ABILITY_NAME_FEED_PET);
    if (meatImage) {
        ctx.drawImage(meatImage, paintX - 20, paintY - 20);
    }
}

function paintAbilityFeedPetUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    let feedPet = ability as AbilityFeedPet;
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

    if (feedPet.nextRechargeTime !== undefined && game.state.time < feedPet.nextRechargeTime) {
        ctx.fillStyle = "gray";
        const heightFactor = Math.max((feedPet.nextRechargeTime - game.state.time) / feedPet.baseRechargeTime, 0);
        ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize * heightFactor);
    }

    let meatImage = getImage(ABILITY_NAME_FEED_PET);
    if (meatImage) {
        ctx.drawImage(meatImage, drawStartX, drawStartY);
    }

    if (feedPet.playerInputBinding) {
        let keyBind = playerInputBindingToDisplayValue(feedPet.playerInputBinding, game);
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(keyBind, drawStartX + 1, drawStartY + 8);
    }
}

function castFeedPet(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isInputdown: boolean, game: Game) {
    if (!isInputdown || abilityOwner.pets === undefined) return;
    const abilityFeedPet = ability as AbilityFeedPet;

    if (abilityFeedPet.nextRechargeTime === undefined || game.state.time >= abilityFeedPet.nextRechargeTime) {
        let distance: number = 40;
        let closetPet: TamerPetCharacter | undefined = undefined;
        for (let pet of abilityOwner.pets!) {
            let tempRangeToClick = calculateDistance(pet, castPosition);
            let tempRangeToOwner = calculateDistance(pet, abilityOwner);
            if (tempRangeToOwner <= abilityFeedPet.range && tempRangeToClick < distance) {
                closetPet = pet as TamerPetCharacter;
                distance = tempRangeToClick;
            }
        }
        if (closetPet) {
            abilityFeedPet.nextRechargeTime = game.state.time + abilityFeedPet.baseRechargeTime;

            let objectFeedPet: AbilityObjectFeedPet = {
                feedValue: abilityFeedPet.feedValue,
                targetCharacterId: closetPet.id,
                reachedTarget: false,
                color: "white",
                damage: 0,
                faction: "player",
                size: 40,
                type: ABILITY_NAME_FEED_PET,
                x: abilityOwner.x,
                y: abilityOwner.y,
                abilityRefId: ability.id,
            }
            game.state.abilityObjects.push(objectFeedPet);
        }

    }


}

function createAbilityFeedPetUpgradeOptions(ability: Ability): AbilityUpgradeOption[] {
    let upgradeOptions: AbilityUpgradeOption[] = [];
    upgradeOptions.push({
        name: "Feed pet +10", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilityFeedPet;
            as.feedValue += 10;
        }
    });

    return upgradeOptions;
}
