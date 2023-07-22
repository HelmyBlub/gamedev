import { TamerPetCharacter } from "../../character/playerCharacters/tamerPetCharacter.js";
import { getNextId } from "../../game.js";
import { IdCounter, Position, Game } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { moveByDirectionAndDistance } from "../../map/map.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, detectCircleCharacterHit } from "../ability.js";

type AbilityPetDash = Ability & {
    baseDamage: number,
    baseSpeed: number,
    duration: number,
    direction?: number,
    cooldown: number,
    readyTime?: number,
    sizeExtension: number,
    activeUntilTime?: number,
}

export const ABILITY_NAME_PET_DASH = "Dash";

export function addAbilityPetDash() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_PET_DASH] = {
        tickAbility: tickAbilityPetDash,
        createAbility: createAbilityPetDash,
        paintAbility: paintAbilityPetDash,
        setAbilityToLevel: setAbilityPetDashToLevel,
        setAbilityToBossLevel: setAbilityPetDashToBossLevel,
        isPassive: true,
    };
}

export function createAbilityPetDash(
    idCounter: IdCounter,
    playerInputBinding?: string,
): AbilityPetDash {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_PET_DASH,
        baseDamage: 100,
        baseSpeed: 4,
        cooldown: 1000,
        duration: 500,
        sizeExtension: 10,
        passive: true,
        upgrades: {},
    };
}

function setAbilityPetDashToLevel(ability: Ability, level: number) {
    let abilityPetDash = ability as AbilityPetDash;
    abilityPetDash.baseDamage = level * 100;
}

function setAbilityPetDashToBossLevel(ability: Ability, level: number) {
    let abilityPetDash = ability as AbilityPetDash;
    abilityPetDash.baseDamage = level * 25;
}

function paintAbilityPetDash(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    let abilityPetDash = ability as AbilityPetDash;
    if (abilityPetDash.activeUntilTime === undefined || abilityPetDash.activeUntilTime <= game.state.time) return;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    const lineLength = abilityPetDash.baseSpeed * 6;
    const lineDirection = abilityPetDash.direction! + Math.PI;
    const startPaintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
    const lineSpacer = 4;
    let tempPos = { x: startPaintPos.x, y: startPaintPos.y };
    moveByDirectionAndDistance(tempPos, lineDirection, abilityOwner.width! / 2, false);
    paintSpeedLine(ctx, tempPos, lineDirection, lineLength);
    moveByDirectionAndDistance(tempPos, lineDirection + Math.PI / 2, lineSpacer, false);
    paintSpeedLine(ctx, tempPos, lineDirection, lineLength);
    moveByDirectionAndDistance(tempPos, lineDirection - Math.PI / 2, lineSpacer * 2, false);
    paintSpeedLine(ctx, tempPos, lineDirection, lineLength);
}

function paintSpeedLine(ctx: CanvasRenderingContext2D, startPos: Position, direction: number, length: number) {
    let tempPos = { x: startPos.x, y: startPos.y };
    ctx.beginPath();
    ctx.moveTo(tempPos.x, tempPos.y);
    moveByDirectionAndDistance(tempPos, direction, length, false);
    ctx.lineTo(tempPos.x, tempPos.y);
    ctx.stroke();
}

function tickAbilityPetDash(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilityPetDash = ability as AbilityPetDash;
    let pet = abilityOwner as TamerPetCharacter;
    if (abilityPetDash.readyTime === undefined) abilityPetDash.readyTime = game.state.time + abilityPetDash.cooldown;
    if (abilityPetDash.activeUntilTime && abilityPetDash.activeUntilTime > game.state.time) {
        moveByDirectionAndDistance(pet, abilityPetDash.direction!, abilityPetDash.baseSpeed, true, game.state.map, game.state.idCounter);
        detectCircleCharacterHit(game.state.map, pet, pet.width / 2 + abilityPetDash.sizeExtension, pet.faction, ability.id, getDamage(pet, abilityPetDash), [], game.state.bossStuff.bosses, game);
    } else if (abilityPetDash.readyTime <= game.state.time) {
        if (abilityOwner.isMoving) {
            abilityPetDash.readyTime = game.state.time + abilityPetDash.cooldown;
            abilityPetDash.activeUntilTime = game.state.time + abilityPetDash.duration;
            abilityPetDash.direction = abilityOwner.moveDirection;
        }
    }
}

function getDamage(pet: TamerPetCharacter, ability: AbilityPetDash): number {
    return ability.baseDamage * pet.sizeFactor * pet.moveSpeed;
}
