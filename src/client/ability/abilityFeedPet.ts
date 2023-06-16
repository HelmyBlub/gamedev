import { TamerPetCharacter } from "../character/playerCharacters/tamerPetCharacter.js";
import { calculateDistance, getNextId } from "../game.js";
import { IdCounter, Position, Game } from "../gameModel.js";
import { playerInputBindingToDisplayValue } from "../playerInput.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, AbilityUpgradeOption } from "./ability.js";

export type AbilityFeedPet = Ability & {
    feedValue: number,
    range: number,
    baseRechargeTime: number,
    nextRechargeTime?: number,
}

export const ABILITY_NAME_FEED_PET = "FeedPet";

export function addFeedPetAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_FEED_PET] = {
        createAbilityUpgradeOptions: createAbilityFeedPetUpgradeOptions,
        activeAbilityCast: castFeedPet,
        createAbility: createAbilityFeedPet,
        paintAbilityUI: paintAbilityFeedPetUI,
        isPassive: false,
        notInheritable: true,
    };
}

export function createAbilityFeedPet(
    idCounter: IdCounter,
    playerInputBinding?: string,
    range: number = 200,
    rechargeTime: number = 1000,
): AbilityFeedPet {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_FEED_PET,
        passive: false,
        playerInputBinding: playerInputBinding,
        baseRechargeTime: rechargeTime,
        range: range,
        upgrades: {},
        feedValue: 250,
    };
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
        for(let pet of abilityOwner.pets!){
            let tempRangeToClick = calculateDistance(pet, castPosition);
            let tempRangeToOwner = calculateDistance(pet, abilityOwner);
            if(tempRangeToOwner <= abilityFeedPet.range && tempRangeToClick < distance){
                closetPet = pet as TamerPetCharacter;
                distance = tempRangeToClick;
            }
        }
        if(closetPet){
            closetPet.foodIntakeLevel.current += abilityFeedPet.feedValue;
            abilityFeedPet.nextRechargeTime = game.state.time + abilityFeedPet.baseRechargeTime;
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
