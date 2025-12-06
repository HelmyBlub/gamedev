import { TAMER_PET_CHARACTER, TamerPetCharacter } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { calculateDistance, getNextId } from "../../game.js";
import { IdCounter, Position, Game } from "../../gameModel.js";
import { PlayerAbilityActionData, playerInputBindingToDisplayValue } from "../../input/playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { ABILITIES_FUNCTIONS, ABILITY_DEFAULT_SMALL_GROUP, Ability, AbilityOwner, DefaultAbilityCastData, getAbilityNameUiText, paintAbilityUiDefault, paintAbilityUiKeyBind } from "../ability.js";
import { ABILITY_NAME_LEASH, AbilityLeash } from "../abilityLeash.js";
import { GAME_IMAGES } from "../../imageLoad.js";

export type AbilityUnleashPet = Ability & {
    range: number,
    baseRechargeTime: number,
    nextRechargeTime?: number,
}

export const ABILITY_NAME_UNLEASH_PET = "Unleash Pet";
export const IMAGE_NAME_LEASH = "leash";
GAME_IMAGES[IMAGE_NAME_LEASH] = {
    imagePath: "/images/leash.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};

export function addAbilityUnleashPet() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_UNLEASH_PET] = {
        activeAbilityCast: castUnLeashPet,
        createAbility: createAbilityUnleashPet,
        paintAbilityUI: paintAbilityUI,
        createAbilityMoreInfos: createAbilityMoreInfos,
        resetAbility: resetAbility,
    };
}

function createAbilityUnleashPet(
    idCounter: IdCounter,
    playerInputBinding?: string,
    range: number = 400,
    rechargeTime: number = 100,
): AbilityUnleashPet {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_UNLEASH_PET,
        passive: false,
        playerInputBinding: playerInputBinding,
        baseRechargeTime: rechargeTime,
        range: range,
        upgrades: {},
        tradable: true,
        unique: true,
    };
}

function resetAbility(ability: Ability) {
    const unleash = ability as AbilityUnleashPet;
    unleash.nextRechargeTime = undefined;
}

function paintAbilityUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const unleashPet = ability as AbilityUnleashPet;
    let heightFactor = 0;
    if (unleashPet.nextRechargeTime !== undefined && game.state.time < unleashPet.nextRechargeTime) {
        heightFactor = Math.max((unleashPet.nextRechargeTime - game.state.time) / unleashPet.baseRechargeTime, 0);
    }
    paintAbilityUiDefault(ctx, ability, drawStartX, drawStartY, size, game, IMAGE_NAME_LEASH, heightFactor);
}

function castUnLeashPet(abilityOwner: AbilityOwner, ability: Ability, data: PlayerAbilityActionData, game: Game) {
    if (!data.isKeydown || abilityOwner.pets === undefined) return;
    const abilityUnleash = ability as AbilityUnleashPet;

    if (abilityUnleash.nextRechargeTime === undefined || game.state.time >= abilityUnleash.nextRechargeTime) {
        const castPosition = (data as DefaultAbilityCastData).castPosition!;
        let distance: number = 40;
        let closestPet: TamerPetCharacter | undefined = undefined;
        for (let pet of abilityOwner.pets!) {
            if (pet.type !== TAMER_PET_CHARACTER) continue;
            const tempRangeToClick = calculateDistance(pet, castPosition);
            const tempRangeToOwner = calculateDistance(pet, abilityOwner);
            if (tempRangeToOwner <= abilityUnleash.range && tempRangeToClick < distance) {
                closestPet = pet as TamerPetCharacter;
                distance = tempRangeToClick;
            }
        }
        if (closestPet) {
            abilityUnleash.nextRechargeTime = game.state.time + abilityUnleash.baseRechargeTime;
            const petLeash: AbilityLeash = closestPet.abilities.find((a) => a.name === ABILITY_NAME_LEASH) as AbilityLeash;
            if (!petLeash) return;
            petLeash.leashedToOwnerId = petLeash.leashedToOwnerId ? undefined : abilityOwner.id;
        }
    }
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const leash = ability as AbilityUnleashPet;
    const textLines: string[] = getAbilityNameUiText(ability);
    const key = playerInputBindingToDisplayValue(leash.playerInputBinding!, game);
    textLines.push(
        `Key: ${key}`,
        `Hover with mouse over pet and`,
        `press key ${key} to Leash or unleash it.`,
        `Range: ${leash.range}`,
    );
    return createMoreInfosPart(ctx, textLines, ABILITY_DEFAULT_SMALL_GROUP);
}