import { getCharacterMoveSpeed } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { TamerPetCharacter, petHappinessToDisplayText } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { AbilityDamageBreakdown } from "../../combatlog.js";
import { DEBUFF_NAME_DAMAGE_TAKEN } from "../../debuff/debuffDamageTaken.js";
import { getNextId } from "../../game.js";
import { IdCounter, Position, Game } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { calculateBounceAngle, calculateMovePosition, isPositionBlocking, moveByDirectionAndDistance } from "../../map/map.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, detectCircleCharacterHit } from "../ability.js";
import { AbilityUpgradesFunctions, pushAbilityUpgradesOptions } from "../abilityUpgrade.js";
import { ABILITY_PET_DASH_UPGRADE_INCREASE_DAMAGE_TAKEN, AbilityPetDashUpgradeIncreaseDamageTaken, abilityPetDashUpgradeDamageTakenApplyDebuff, addAbilityPetDashUpgradeIncreaseDamageTaken } from "./abilityPetDashIncreaseDamageTaken.js";
import { ABILITY_PET_DASH_UPGRADE_TERRAIN_BOUNCE, AbilityPetDashUpgradeTerrainBounce } from "./abilityPetDashUpgradeBounce.js";
import { ABILITY_PET_DASH_UPGRADE_FIRE_LINE, AbilityPetDashUpgradeFireLine, addAbilityPetDashUpgradeFireLine, createPetDashUpgradeFireLine } from "./abilityPetDashUpgradeFireLine.js";
import { abilityPetDashUpgradeRootApplyRoot, addAbilityPetDashUpgradeRoot } from "./abilityPetDashUpgradeRoot.js";

export type AbilityPetDash = Ability & {
    baseDamage: number,
    baseSpeed: number,
    duration: number,
    direction?: number,
    cooldown: number,
    readyTime?: number,
    sizeExtension: number,
    activeUntilTime?: number,
    tickInterval: number,
    nextTickTime?: number,
}

export const ABILITY_NAME_PET_DASH = "Dash";
export const ABILITY_PET_DASH_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};

export function addAbilityPetDash() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_PET_DASH] = {
        createAbility: createAbilityPetDash,
        createAbilityBossUpgradeOptions: createAbilityPetDashUpgradeOptions,
        createDamageBreakDown: createDamageBreakDown,
        getMoreInfosText: getLongDescription,
        onHit: onHit,
        paintAbility: paintAbilityPetDash,
        resetAbility: resetAbility,
        setAbilityToLevel: setAbilityPetDashToLevel,
        setAbilityToBossLevel: setAbilityPetDashToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbilityPetDash,
        abilityUpgradeFunctions: ABILITY_PET_DASH_UPGRADE_FUNCTIONS,
    };

    addAbilityPetDashUpgradeFireLine();
    addAbilityPetDashUpgradeRoot();
    addAbilityPetDashUpgradeIncreaseDamageTaken();
}

export function getPetAbilityDashDamage(pet: TamerPetCharacter, ability: AbilityPetDash): number {
    const damage = ability.baseDamage * pet.sizeFactor * getCharacterMoveSpeed(pet);
    const upgradeBounce: AbilityPetDashUpgradeTerrainBounce = ability.upgrades[ABILITY_PET_DASH_UPGRADE_TERRAIN_BOUNCE];
    if (upgradeBounce !== undefined) damage * upgradeBounce.currentDamageFactor;
    return damage;
}

function createAbilityPetDash(
    idCounter: IdCounter,
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
        tickInterval: 100,
        upgrades: {},
    };
}

function resetAbility(ability: Ability) {
    const dash = ability as AbilityPetDash;
    dash.activeUntilTime = undefined;
    dash.nextTickTime = undefined;
    dash.readyTime = undefined;
}

function getLongDescription(): string[] {
    return [
        `Ability: ${ABILITY_NAME_PET_DASH}`,
        `Dashes forward a short distance.`,
        `Does damage to every enemy it hits.`,
    ];
}

function createDamageBreakDown(damage: number, ability: Ability, abilityObject: AbilityObject | undefined, damageAbilityName: string, game: Game): AbilityDamageBreakdown[] {
    const damageBreakDown: AbilityDamageBreakdown[] = [];
    if (abilityObject) {
        damageBreakDown.push({
            damage: damage,
            name: abilityObject.type,
        });
    } else {
        if (damageAbilityName === DEBUFF_NAME_DAMAGE_TAKEN) {
            const damageTakenUpgrade = ability.upgrades[ABILITY_PET_DASH_UPGRADE_INCREASE_DAMAGE_TAKEN] as AbilityPetDashUpgradeIncreaseDamageTaken;
            if (damageTakenUpgrade) {
                damageBreakDown.push({
                    damage: damage * (damageTakenUpgrade.increaseFactor - 1),
                    name: ABILITY_PET_DASH_UPGRADE_INCREASE_DAMAGE_TAKEN,
                });
            }
        } else {
            damageBreakDown.push({
                damage: damage,
                name: ability.name,
            });
        }
    }
    return damageBreakDown;
}

function onHit(ability: Ability, targetCharacter: Character, game: Game) {
    const dash = ability as AbilityPetDash;
    abilityPetDashUpgradeRootApplyRoot(dash, targetCharacter, game);
    abilityPetDashUpgradeDamageTakenApplyDebuff(dash, targetCharacter, game);
}

function createAbilityPetDashUpgradeOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_PET_DASH_UPGRADE_FUNCTIONS, upgradeOptions, ability, character, game);
    return upgradeOptions;
}

function setAbilityPetDashToLevel(ability: Ability, level: number) {
    const abilityPetDash = ability as AbilityPetDash;
    abilityPetDash.baseDamage = level * 100;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityPetDash = ability as AbilityPetDash;
    abilityPetDash.baseDamage = level / 2 * damageFactor;
    abilityPetDash.cooldown = 3000 - level * 25;
}

function setAbilityPetDashToBossLevel(ability: Ability, level: number) {
    const abilityPetDash = ability as AbilityPetDash;
    abilityPetDash.baseDamage = level * 4;
    abilityPetDash.cooldown = 3000 - level * 150;
}

function paintAbilityPetDash(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abilityPetDash = ability as AbilityPetDash;
    if (abilityPetDash.activeUntilTime === undefined || abilityPetDash.activeUntilTime <= game.state.time) return;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    const lineLength = abilityPetDash.baseSpeed * 6;
    const lineDirection = abilityPetDash.direction! + Math.PI;
    const startPaintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition, game.UI.zoom);
    const lineSpacer = 4;
    const tempPos = { x: startPaintPos.x, y: startPaintPos.y };
    moveByDirectionAndDistance(tempPos, lineDirection, abilityOwner.width! / 2, false);
    paintSpeedLine(ctx, tempPos, lineDirection, lineLength);
    moveByDirectionAndDistance(tempPos, lineDirection + Math.PI / 2, lineSpacer, false);
    paintSpeedLine(ctx, tempPos, lineDirection, lineLength);
    moveByDirectionAndDistance(tempPos, lineDirection - Math.PI / 2, lineSpacer * 2, false);
    paintSpeedLine(ctx, tempPos, lineDirection, lineLength);
}

function paintSpeedLine(ctx: CanvasRenderingContext2D, startPos: Position, direction: number, length: number) {
    const tempPos = { x: startPos.x, y: startPos.y };
    ctx.beginPath();
    ctx.moveTo(tempPos.x, tempPos.y);
    moveByDirectionAndDistance(tempPos, direction, length, false);
    ctx.lineTo(tempPos.x, tempPos.y);
    ctx.stroke();
}

function tickAbilityPetDash(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    if (ability.disabled) return;
    const abilityPetDash = ability as AbilityPetDash;
    const pet = abilityOwner as TamerPetCharacter;
    if (abilityPetDash.readyTime === undefined) abilityPetDash.readyTime = game.state.time + abilityPetDash.cooldown;
    const upgradeBounce: AbilityPetDashUpgradeTerrainBounce = abilityPetDash.upgrades[ABILITY_PET_DASH_UPGRADE_TERRAIN_BOUNCE];
    const upgradeFireLine: AbilityPetDashUpgradeFireLine = abilityPetDash.upgrades[ABILITY_PET_DASH_UPGRADE_FIRE_LINE];
    if (abilityPetDash.activeUntilTime && abilityPetDash.activeUntilTime > game.state.time) {
        if (upgradeBounce !== undefined) {
            const newPosition = calculateMovePosition(pet, abilityPetDash.direction!, abilityPetDash.baseSpeed, false);
            if (isPositionBlocking(newPosition, game.state.map, game.state.idCounter, game)) {
                abilityPetDash.activeUntilTime += upgradeBounce.durationUpPerBounce;
                abilityPetDash.direction = calculateBounceAngle(pet, abilityPetDash.direction!, game);
                upgradeBounce.currentDamageFactor += upgradeBounce.damageFactorPerBounce;
            } else {
                pet.x = newPosition.x;
                pet.y = newPosition.y;
            }
        } else {
            moveByDirectionAndDistance(pet, abilityPetDash.direction!, abilityPetDash.baseSpeed, true, game.state.map, game.state.idCounter, game);
        }
        if (abilityPetDash.nextTickTime && abilityPetDash.nextTickTime <= game.state.time) {
            abilityPetDash.nextTickTime += abilityPetDash.tickInterval;
            detectCircleCharacterHit(game.state.map, pet, pet.width / 2 + abilityPetDash.sizeExtension, pet.faction, ability.id, getPetAbilityDashDamage(pet, abilityPetDash), game, undefined, ability);
        }
    } else if (abilityPetDash.readyTime <= game.state.time) {
        if (petHappinessToDisplayText(pet.happines, game.state.time) === "very unhappy") {
            return;
        }
        if (abilityOwner.isMoving) {
            if (upgradeBounce) upgradeBounce.currentDamageFactor = 1;
            if (upgradeFireLine) upgradeFireLine.startPosition = { x: pet.x, y: pet.y };
            abilityPetDash.readyTime = game.state.time + abilityPetDash.cooldown;
            abilityPetDash.activeUntilTime = game.state.time + abilityPetDash.duration;
            abilityPetDash.nextTickTime = game.state.time;
            abilityPetDash.direction = abilityOwner.moveDirection;
        }
    }
    if (upgradeFireLine && upgradeFireLine.startPosition) {
        if (abilityPetDash.activeUntilTime! <= game.state.time) {
            createPetDashUpgradeFireLine(pet, abilityPetDash, game);
            delete upgradeFireLine.startPosition;
        }
    }
}
