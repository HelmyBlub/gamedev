import { findCharacterById } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { PetHunger, TamerPetCharacter, petFoodIntakeToDisplayText, tamerPetFeed } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { calculateDirection, calculateDistance, getCameraPosition, getNextId } from "../../game.js";
import { IdCounter, Position, Game, FACTION_PLAYER } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { GAME_IMAGES, getImage } from "../../imageLoad.js";
import { moveByDirectionAndDistance } from "../../map/map.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { ABILITIES_FUNCTIONS, ABILITY_DEFAULT_SMALL_GROUP, Ability, AbilityObject, AbilityOwner, PaintOrderAbility, findAbilityOwnerById, getAbilityNameUiText } from "../ability.js";

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

export function addAbilityFeedPet() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_FEED_PET] = {
        activeAbilityCast: castFeedPet,
        createAbility: createAbilityFeedPet,
        createAbilityMoreInfos: createAbilityMoreInfos,
        deleteAbilityObject: deleteAbilityObjectFeedPet,
        paintAbilityObject: paintAbilityObjectFeedPet,
        paintAbilityUI: paintAbilityFeedPetUI,
        tickAbilityObject: tickAbilityObjectFeedPet,
        tickBossAI: tickBossAI,
        resetAbility: resetAbility,
    };
}

function createAbilityFeedPet(
    idCounter: IdCounter,
    playerInputBinding?: string,
    range: number = 200,
    rechargeTime: number = 100,
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
        tradable: true,
        unique: true,
    };
}

function resetAbility(ability: Ability) {
    const feed = ability as AbilityFeedPet;
    feed.nextRechargeTime = undefined;
}

function deleteAbilityObjectFeedPet(abilityObject: AbilityObject, game: Game): boolean {
    const abilityObjectFeedPet = abilityObject as AbilityObjectFeedPet;
    return abilityObjectFeedPet.reachedTarget;
}

function tickBossAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityFeedPet = ability as AbilityFeedPet;
    if (abilityOwner.pets) {
        for (let pet of abilityOwner.pets) {
            const hunger: PetHunger = petFoodIntakeToDisplayText(pet.foodIntakeLevel);
            if (hunger === "hungry" && (!abilityFeedPet.nextRechargeTime || abilityFeedPet.nextRechargeTime + 500 <= game.state.time)) {
                castFeedPet(abilityOwner, ability, pet, undefined, true, game);
                break;
            }
        }
    }
}

function tickAbilityObjectFeedPet(abilityObject: AbilityObject, game: Game) {
    const abilityObjectFeedPet = abilityObject as AbilityObjectFeedPet;
    if (abilityObjectFeedPet.reachedTarget) return;
    let target: Character | null = null;
    const owner = findAbilityOwnerById(abilityObject.abilityIdRef!, game);
    if (owner && owner.pets) {
        target = findCharacterById(owner.pets, abilityObjectFeedPet.targetCharacterId);
    }

    if (target) {
        const moveDirection = calculateDirection(abilityObject, target);
        moveByDirectionAndDistance(abilityObject, moveDirection, 3, false);
        const distance = calculateDistance(abilityObject, target);
        if (distance < 3) {
            const pet = target as TamerPetCharacter;
            tamerPetFeed(pet, abilityObjectFeedPet.feedValue, game.state.time);
            abilityObjectFeedPet.reachedTarget = true;
        }
    }
}

function paintAbilityObjectFeedPet(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "afterCharacterPaint") return;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition);
    const meatImage = getImage(ABILITY_NAME_FEED_PET);
    if (meatImage) {
        ctx.drawImage(meatImage, paintPos.x - 20, paintPos.y - 20);
    }
}

function paintAbilityFeedPetUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const feedPet = ability as AbilityFeedPet;
    const fontSize = 12;
    const rectSize = size;

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

    const meatImage = getImage(ABILITY_NAME_FEED_PET);
    if (meatImage) {
        ctx.drawImage(meatImage, drawStartX, drawStartY);
    }

    if (feedPet.playerInputBinding) {
        const keyBind = playerInputBindingToDisplayValue(feedPet.playerInputBinding, game);
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(keyBind, drawStartX + 1, drawStartY + 8);
    }
}

function castFeedPet(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, castPositionRelativeToCharacter: Position | undefined, isInputdown: boolean, game: Game) {
    if (!isInputdown || abilityOwner.pets === undefined) return;
    const abilityFeedPet = ability as AbilityFeedPet;

    if (abilityFeedPet.nextRechargeTime === undefined || game.state.time >= abilityFeedPet.nextRechargeTime) {
        let distance: number = 40;
        let closetPet: TamerPetCharacter | undefined = undefined;
        for (let pet of abilityOwner.pets!) {
            const tempRangeToClick = calculateDistance(pet, castPosition);
            const tempRangeToOwner = calculateDistance(pet, abilityOwner);
            if (tempRangeToOwner <= abilityFeedPet.range && tempRangeToClick < distance) {
                closetPet = pet as TamerPetCharacter;
                distance = tempRangeToClick;
            }
        }
        if (closetPet) {
            abilityFeedPet.nextRechargeTime = game.state.time + abilityFeedPet.baseRechargeTime;

            const objectFeedPet: AbilityObjectFeedPet = {
                feedValue: abilityFeedPet.feedValue,
                targetCharacterId: closetPet.id,
                reachedTarget: false,
                color: "white",
                damage: 0,
                faction: FACTION_PLAYER,
                type: ABILITY_NAME_FEED_PET,
                x: abilityOwner.x,
                y: abilityOwner.y,
                abilityIdRef: ability.id,
            }
            game.state.abilityObjects.push(objectFeedPet);
        }
    }
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const feed = ability as AbilityFeedPet;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(feed.playerInputBinding!, game)}`,
        "Feed targeted pet.",
        `Range: ${feed.range}`,
    );
    return createMoreInfosPart(ctx, textLines, ABILITY_DEFAULT_SMALL_GROUP);
}