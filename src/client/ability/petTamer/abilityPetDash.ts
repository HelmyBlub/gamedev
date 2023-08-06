import { Character } from "../../character/characterModel.js";
import { TamerPetCharacter } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { getNextId } from "../../game.js";
import { IdCounter, Position, Game } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { calculateBounceAngle, calculateMovePosition, isPositionBlocking, moveByDirectionAndDistance } from "../../map/map.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, detectCircleCharacterHit, findAbilityById } from "../ability.js";
import { AbilityUpgradesFunctions, pushAbilityUpgradesOptions } from "../abilityUpgrade.js";
import { ABILITY_PET_DASH_UPGARDE_TERRAIN_BOUNCE, AbilityPetDashUpgradeTerrainBounce, addAbilityPetDashUpgradeTerrainBounce } from "./abilityPetDashUpgradeBounce.js";
import { ABILITY_PET_DASH_UPGARDE_FIRE_LINE, AbilityPetDashUpgradeFireLine, addAbilityPetDashUpgradeFireLine, createPetDashUpgradeFireLine } from "./abilityPetDashUpgradeFireLine.js";
import { abilityPetDashUpgradeRootApplyRoot, addAbilityPetDashUpgradeTerrainRoot } from "./abilityPetDashUpgradeRoot.js";

export type AbilityPetDash = Ability & {
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
export const ABILITY_PET_DASH_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};

export function addAbilityPetDash() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_PET_DASH] = {
        tickAbility: tickAbilityPetDash,
        createAbility: createAbilityPetDash,
        createAbilityBossUpgradeOptions: createAbilityPetDashUpgradeOptions,
        paintAbility: paintAbilityPetDash,
        setAbilityToLevel: setAbilityPetDashToLevel,
        setAbilityToBossLevel: setAbilityPetDashToBossLevel,
        onHit: onHit,
        abilityUpgradeFunctions: ABILITY_PET_DASH_UPGRADE_FUNCTIONS,
        isPassive: true,
    };

    addAbilityPetDashUpgradeTerrainBounce();
    addAbilityPetDashUpgradeFireLine();
    addAbilityPetDashUpgradeTerrainRoot();
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

export function getPetAbilityDashDamage(pet: TamerPetCharacter, ability: AbilityPetDash): number {
    let damage = ability.baseDamage * pet.sizeFactor * pet.moveSpeed;
    const upgradeBounce: AbilityPetDashUpgradeTerrainBounce = ability.upgrades[ABILITY_PET_DASH_UPGARDE_TERRAIN_BOUNCE];
    if (upgradeBounce !== undefined) damage * upgradeBounce.currentDamageFactor;
    return damage;
}

function onHit(ability: Ability, targetCharacter: Character, game: Game){
    const dash = ability as AbilityPetDash;
    abilityPetDashUpgradeRootApplyRoot(dash, targetCharacter, game);
}

function createAbilityPetDashUpgradeOptions(ability: Ability): UpgradeOptionAndProbability[] {
    let upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_PET_DASH_UPGRADE_FUNCTIONS, upgradeOptions, ability);
    return upgradeOptions;
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
    const upgradeBounce: AbilityPetDashUpgradeTerrainBounce = abilityPetDash.upgrades[ABILITY_PET_DASH_UPGARDE_TERRAIN_BOUNCE];
    const upgradeFireLine: AbilityPetDashUpgradeFireLine =  abilityPetDash.upgrades[ABILITY_PET_DASH_UPGARDE_FIRE_LINE];
    if (abilityPetDash.activeUntilTime && abilityPetDash.activeUntilTime > game.state.time) {
        if (upgradeBounce !== undefined) {
            let newPosition = calculateMovePosition(pet, abilityPetDash.direction!, abilityPetDash.baseSpeed, false);
            if (isPositionBlocking(newPosition, game.state.map, game.state.idCounter)) {
                abilityPetDash.activeUntilTime += upgradeBounce.durationUpPerBounce;
                abilityPetDash.direction = calculateBounceAngle(newPosition, abilityPetDash.direction!, game.state.map);
                upgradeBounce.currentDamageFactor += upgradeBounce.damageFactorPerBounce;
            } else {
                pet.x = newPosition.x;
                pet.y = newPosition.y;
            }
        } else {
            moveByDirectionAndDistance(pet, abilityPetDash.direction!, abilityPetDash.baseSpeed, true, game.state.map, game.state.idCounter);
        }

        detectCircleCharacterHit(game.state.map, pet, pet.width / 2 + abilityPetDash.sizeExtension, pet.faction, ability.id, getPetAbilityDashDamage(pet, abilityPetDash), [], game.state.bossStuff.bosses, game, undefined, ability);
    } else if (abilityPetDash.readyTime <= game.state.time) {
        if (abilityOwner.isMoving) {
            if (upgradeBounce) upgradeBounce.currentDamageFactor = 1;
            if (upgradeFireLine) upgradeFireLine.startPosition = {x: pet.x, y: pet.y};
            abilityPetDash.readyTime = game.state.time + abilityPetDash.cooldown;
            abilityPetDash.activeUntilTime = game.state.time + abilityPetDash.duration;
            abilityPetDash.direction = abilityOwner.moveDirection;
        }
    }
    if(upgradeFireLine && upgradeFireLine.startPosition){
        if(abilityPetDash.activeUntilTime! <= game.state.time){
            createPetDashUpgradeFireLine(pet, abilityPetDash, game);
            upgradeFireLine.startPosition = undefined;
        }
    }
}
