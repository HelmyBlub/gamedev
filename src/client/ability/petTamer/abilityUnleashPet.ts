import { TamerPetCharacter } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { calculateDistance, getNextId } from "../../game.js";
import { IdCounter, Position, Game } from "../../gameModel.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { ABILITIES_FUNCTIONS, ABILITY_DEFAULT_SMALL_GROUP, Ability, AbilityOwner, getAbilityNameUiText, paintAbilityUiKeyBind } from "../ability.js";
import { ABILITY_NAME_LEASH, AbilityLeash } from "../abilityLeash.js";

export type AbilityUnleashPet = Ability & {
    range: number,
    baseRechargeTime: number,
    nextRechargeTime?: number,
}

export const ABILITY_NAME_UNLEASH_PET = "Unleash Pet";

export function addAbilityUnleashPet() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_UNLEASH_PET] = {
        activeAbilityCast: castFeedPet,
        createAbility: createAbilityUnleashPet,
        paintAbilityUI: paintAbilityUI,
        createAbilityMoreInfos: createAbilityMoreInfos,
        resetAbility: resetAbility,
    };
}

function createAbilityUnleashPet(
    idCounter: IdCounter,
    playerInputBinding?: string,
    range: number = 200,
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

    if (unleashPet.nextRechargeTime !== undefined && game.state.time < unleashPet.nextRechargeTime) {
        ctx.fillStyle = "gray";
        const heightFactor = Math.max((unleashPet.nextRechargeTime - game.state.time) / unleashPet.baseRechargeTime, 0);
        ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize * heightFactor);
    }

    if (unleashPet.playerInputBinding) {
        paintAbilityUiKeyBind(ctx, unleashPet.playerInputBinding, drawStartX, drawStartY, game);
    }
}

function castFeedPet(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, castPositionRelativeToCharacter: Position | undefined, isInputdown: boolean, game: Game) {
    if (!isInputdown || abilityOwner.pets === undefined) return;
    const abilityFeedPet = ability as AbilityUnleashPet;

    if (abilityFeedPet.nextRechargeTime === undefined || game.state.time >= abilityFeedPet.nextRechargeTime) {
        let distance: number = 40;
        let closestPet: TamerPetCharacter | undefined = undefined;
        for (let pet of abilityOwner.pets!) {
            const tempRangeToClick = calculateDistance(pet, castPosition);
            const tempRangeToOwner = calculateDistance(pet, abilityOwner);
            if (tempRangeToOwner <= abilityFeedPet.range && tempRangeToClick < distance) {
                closestPet = pet as TamerPetCharacter;
                distance = tempRangeToClick;
            }
        }
        if (closestPet) {
            abilityFeedPet.nextRechargeTime = game.state.time + abilityFeedPet.baseRechargeTime;
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