import { getNextId } from "../game.js";
import { IdCounter, Game, Position } from "../gameModel.js";
import { PlayerAbilityActionData, playerInputBindingToDisplayValue } from "../input/playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../moreInfo.js";
import { ABILITIES_FUNCTIONS, Ability, ABILITY_DEFAULT_SMALL_GROUP, AbilityOwner, getAbilityNameUiText, paintAbilityUiDefault } from "./ability.js";
import { ABILITY_NAME_TOWER, AbilityTower } from "./abilityTower.js";
import { IMAGE_NAME_RELOAD } from "./snipe/abilitySnipe.js";

export type AbilityTowerRotate = Ability & {
    clockwise: boolean,
}

export const ABILITY_NAME_TOWER_ROTATE = "Tower Rotate";
export function addAbilityTowerRotate() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_TOWER_ROTATE] = {
        activeAbilityCast: castRotate,
        createAbility: createAbilityTowerRotate,
        createAbilityMoreInfos: createAbilityMoreInfos,
        paintAbilityUI: paintAbilityUI,
        positionNotRquired: true,
    };
}
export function createAbilityTowerRotate(idCounter: IdCounter, playerInputBinding?: string, clockwise: boolean = true): AbilityTowerRotate {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_TOWER_ROTATE,
        playerInputBinding: playerInputBinding,
        passive: false,
        upgrades: {},
        tradable: true,
        clockwise: clockwise,
    }
}

function paintAbilityUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const rotate = ability as AbilityTowerRotate;
    paintAbilityUiDefault(ctx, ability, drawStartX, drawStartY, size, game, IMAGE_NAME_RELOAD, undefined, undefined, !rotate.clockwise);

}

function castRotate(abilityOwner: AbilityOwner, ability: Ability, data: PlayerAbilityActionData, game: Game) {
    if (!data.isKeydown) return;
    if (!abilityOwner.abilities) return;
    const rotate = ability as AbilityTowerRotate;
    for (let abilityIter of abilityOwner.abilities) {
        if (abilityIter.name === ABILITY_NAME_TOWER) {
            const tower = abilityIter as AbilityTower;
            if (tower.rotateClockwise === rotate.clockwise) {
                tower.rotateClockwise = undefined;
            } else {
                tower.rotateClockwise = rotate.clockwise;
            }
        }
    }
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilitySpeedBoost = ability as AbilityTowerRotate;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilitySpeedBoost.playerInputBinding!, game)}`,
    );

    return createMoreInfosPart(ctx, textLines, ABILITY_DEFAULT_SMALL_GROUP);
}