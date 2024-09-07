import { findCharacterById } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { PetHappines, TamerPetCharacter, changeTamerPetHappines, petHappinessToDisplayText } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { calculateDirection, calculateDistance, getCameraPosition, getNextId } from "../../game.js";
import { IdCounter, Position, Game, FACTION_PLAYER } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { GAME_IMAGES, getImage } from "../../imageLoad.js";
import { moveByDirectionAndDistance } from "../../map/map.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { ABILITIES_FUNCTIONS, ABILITY_DEFAULT_SMALL_GROUP, Ability, AbilityObject, AbilityOwner, PaintOrderAbility, findAbilityOwnerById, getAbilityNameUiText, paintAbilityUiDefault, paintAbilityUiKeyBind } from "../ability.js";

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
        activeAbilityCast: castLovePet,
        createAbility: createAbilityLovePet,
        paintAbilityObject: paintAbilityObjectLovePet,
        createAbilityMoreInfos: createAbilityMoreInfos,
        paintAbilityUI: paintAbilityLovePetUI,
        tickAbilityObject: tickAbilityObjectLovePet,
        tickBossAI: tickBossAI,
        resetAbility: resetAbility,
        deleteAbilityObject: deleteAbilityObjectLovePet,
    };
}

function createAbilityLovePet(
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
        tradable: true,
        unique: true,
    };
}

function resetAbility(ability: Ability) {
    const feed = ability as AbilityLovePet;
    feed.nextRechargeTime = undefined;
}

function tickBossAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityLovePet = ability as AbilityLovePet;
    if (abilityOwner.pets) {
        for (let pet of abilityOwner.pets) {
            const happines: PetHappines = petHappinessToDisplayText(pet.happines, game.state.time);
            if ((happines === "unhappy" || happines === "very unhappy") && (!abilityLovePet.nextRechargeTime || abilityLovePet.nextRechargeTime + 500 <= game.state.time)) {
                castLovePet(abilityOwner, ability, pet, undefined, true, game);
                break;
            }
        }
    }
}

function deleteAbilityObjectLovePet(abilityObject: AbilityObject, game: Game): boolean {
    const abilityObjectLovePet = abilityObject as AbilityObjectLovePet;
    return abilityObjectLovePet.reachedTarget;
}

function tickAbilityObjectLovePet(abilityObject: AbilityObject, game: Game) {
    const abilityObjectLovePet = abilityObject as AbilityObjectLovePet;
    if (abilityObjectLovePet.reachedTarget) return;
    let target: Character | null = null;
    const owner = findAbilityOwnerById(abilityObject.abilityIdRef!, game);
    if (owner && owner.pets) {
        target = findCharacterById(owner.pets, abilityObjectLovePet.targetCharacterId);
    }

    if (target) {
        const moveDirection = calculateDirection(abilityObject, target);
        moveByDirectionAndDistance(abilityObject, moveDirection, 3, false);
        const distance = calculateDistance(abilityObject, target);
        if (distance < 3) {
            const pet = target as TamerPetCharacter;
            changeTamerPetHappines(pet, abilityObjectLovePet.loveValue, game.state.time, true);
            abilityObjectLovePet.reachedTarget = true;
        }
    }
}

function paintAbilityObjectLovePet(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "afterCharacterPaint") return;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);

    const meatImage = getImage(ABILITY_NAME_LOVE_PET);
    if (meatImage) {
        ctx.drawImage(meatImage, paintPos.x - 20, paintPos.y - 20);
    }
}

function paintAbilityLovePetUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const lovePet = ability as AbilityLovePet;
    let heightFactor = 0;
    if (lovePet.nextRechargeTime !== undefined && game.state.time < lovePet.nextRechargeTime) {
        heightFactor = Math.max((lovePet.nextRechargeTime - game.state.time) / lovePet.baseRechargeTime, 0);
    }
    paintAbilityUiDefault(ctx, ability, drawStartX, drawStartY, size, game, ABILITY_NAME_LOVE_PET, heightFactor);
}

function castLovePet(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, castPositionRelativeToCharacter: Position | undefined, isInputdown: boolean, game: Game) {
    if (!isInputdown || abilityOwner.pets === undefined) return;
    const abilityLovePet = ability as AbilityLovePet;

    if (abilityLovePet.nextRechargeTime === undefined || game.state.time >= abilityLovePet.nextRechargeTime) {
        let distance: number = 40;
        let closestPet: TamerPetCharacter | undefined = undefined;
        for (let pet of abilityOwner.pets!) {
            const tempRangeToClick = calculateDistance(pet, castPosition);
            const tempRangeToOwner = calculateDistance(pet, abilityOwner);
            if (tempRangeToOwner <= abilityLovePet.range && tempRangeToClick < distance) {
                closestPet = pet as TamerPetCharacter;
                distance = tempRangeToClick;
            }
        }
        if (closestPet) {
            abilityLovePet.nextRechargeTime = game.state.time + abilityLovePet.baseRechargeTime;

            const objectLovePet: AbilityObjectLovePet = {
                loveValue: abilityLovePet.loveValue,
                targetCharacterId: closestPet.id,
                reachedTarget: false,
                color: "white",
                damage: 0,
                faction: FACTION_PLAYER,
                type: ABILITY_NAME_LOVE_PET,
                x: abilityOwner.x,
                y: abilityOwner.y,
                abilityIdRef: ability.id,
            }
            game.state.abilityObjects.push(objectLovePet);
        }
    }
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const love = ability as AbilityLovePet;
    const textLines: string[] = getAbilityNameUiText(ability);
    const key = playerInputBindingToDisplayValue(love.playerInputBinding!, game);
    textLines.push(
        `Key: ${key}`,
        `Hover with mouse over pet`,
        `and press key ${key} to love it.`,
        `Range: ${love.range}`,
    );
    return createMoreInfosPart(ctx, textLines, ABILITY_DEFAULT_SMALL_GROUP);
}
