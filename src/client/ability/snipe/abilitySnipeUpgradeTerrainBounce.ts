import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { calcNewPositionMovedInDirection, calculateDistance } from "../../game.js";
import { Position, Game } from "../../gameModel.js";
import { calculateBounceAngle, getFirstBlockingGameMapTilePositionTouchingLine } from "../../map/map.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilityObjectSnipe, AbilitySnipe, createAbilityObjectSnipe, getOptionsSnipeUpgrade } from "./abilitySnipe.js";
import { ABILITY_SNIPE_UPGRADE_AFTER_IMAGE } from "./abilitySnipeUpgradeAfterImage.js";
import { ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT } from "./abilitySnipeUpgradeBackwardsShot.js";
import { ABILITY_SNIPE_UPGRADE_MORE_RIFLES } from "./abilitySnipeUpgradeMoreRifle.js";

export const ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE = "Terrain Bounce";
const DAMAGE_UP_BOUNCE = 0.5;

export type AbilityUpgradeTerrainBounce = AbilityUpgrade & {
    damageUpPerBounceFactor: number,
    upgradeSynergy: boolean,
    active: boolean
}

export function addAbilitySnipeUpgradeTerrainBounce() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE] = {
        addSynergyUpgradeOption: addSynergyUpgradeOption,
        getStatsDisplayText: getAbilityUpgradeTerrainBounceUiText,
        getLongExplainText: getAbilityUpgradeTerrainBounceUiTextLong,
        getOptions: getOptionsTerrainBounce,
        executeOption: executeOptionTerrainBounce,
    }
}

export function createAndPushAbilityObjectSnipeTerrainBounceInit(startPosition: Position, direction: number, abilitySnipe: AbilitySnipe, faction: string, canSplitOnHit: boolean | undefined, range: number, bounceCounter: number, triggeredByPlayer: boolean, game: Game) {
    const endPosistion = calcNewPositionMovedInDirection(startPosition, direction, range);
    const blockingPosistion = getFirstBlockingGameMapTilePositionTouchingLine(game.state.map, startPosition, endPosistion, game);
    createAndPush(
        startPosition,
        blockingPosistion,
        range,
        abilitySnipe.id,
        abilitySnipe,
        faction,
        direction,
        canSplitOnHit,
        bounceCounter,
        undefined,
        triggeredByPlayer,
        game
    );
}

export function createAndPushAbilityObjectSnipeTerrainBounceBounce(abilityObjectSnipe: AbilityObjectSnipe, abilitySnipe: AbilitySnipe, game: Game) {
    if (abilityObjectSnipe.remainingRange === undefined) return;
    if (abilityObjectSnipe.bounceCounter && abilityObjectSnipe.bounceCounter > 100) return;

    const newStartPosition = calcNewPositionMovedInDirection(abilityObjectSnipe, abilityObjectSnipe.direction, abilityObjectSnipe.range);
    const newBounceDirection = calculateBounceAngle(abilityObjectSnipe, abilityObjectSnipe.direction, game);
    const newEndPosistion = calcNewPositionMovedInDirection(newStartPosition, newBounceDirection, abilityObjectSnipe.remainingRange);
    const nextBlockingPosistion = getFirstBlockingGameMapTilePositionTouchingLine(game.state.map, newStartPosition, newEndPosistion, game);
    createAndPush(
        newStartPosition,
        nextBlockingPosistion,
        abilityObjectSnipe.remainingRange,
        abilityObjectSnipe.abilityIdRef!,
        abilitySnipe,
        abilityObjectSnipe.faction,
        newBounceDirection,
        abilityObjectSnipe.canSplitOnHit,
        abilityObjectSnipe.bounceCounter ? abilityObjectSnipe.bounceCounter + 1 : 1,
        abilityObjectSnipe.hitSomething,
        abilityObjectSnipe.triggeredByPlayer,
        game
    );
}

export function getAbilityUpgradeTerrainBounceDamageFactor(abilitySnipe: AbilitySnipe, bounceCounter: number): number {
    const terrainBounce: AbilityUpgradeTerrainBounce | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE];
    if (!terrainBounce) return 1;
    return 1 + bounceCounter * terrainBounce.damageUpPerBounceFactor;
}

function getOptionsTerrainBounce(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getOptionsSnipeUpgrade(ability, ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE);
    return options;
}

function executeOptionTerrainBounce(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilitySnipe;
    let up: AbilityUpgradeTerrainBounce;
    if (option.additionalInfo === "Synergy") {
        up = as.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE];
        up.upgradeSynergy = true;
    } else {
        if (as.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE] === undefined) {
            up = {
                level: 0,
                active: true,
                damageUpPerBounceFactor: 0,
                upgradeSynergy: false,

            }
            as.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE] = up;
        } else {
            up = as.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE];
        }
        up.level++;
        up.damageUpPerBounceFactor += DAMAGE_UP_BOUNCE;
    }
}

function getAbilityUpgradeTerrainBounceUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeTerrainBounce = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE];

    return `Terrain Bounce and +${upgrade.damageUpPerBounceFactor * 100}% damage for each bounce` + (upgrade.upgradeSynergy ? " (Synergy)" : "");
}

function addSynergyUpgradeOption(ability: Ability): boolean{
    if(ability.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE]
        || ability.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT]
        || ability.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES]){
        return true;
    }
    return false;
}

function getAbilityUpgradeTerrainBounceUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    const textLines: string[] = [];
    if (option.additionalInfo && option.additionalInfo === "Synergy") {
        textLines.push(`List of synergies:`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_AFTER_IMAGE}`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT}`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_MORE_RIFLES}`);
    } else {
        const upgrade: AbilityUpgradeTerrainBounce | undefined = ability.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE];
        textLines.push(`Main shots will bounce of blocking tiles.`);
        textLines.push(`Each bounce will increase damage`);
        textLines.push(`for the following bounced shot part.`);
        if (upgrade) {
            textLines.push(`Damage bonus from ${DAMAGE_UP_BOUNCE * 100 * upgrade.level}% to ${DAMAGE_UP_BOUNCE * 100 * (upgrade.level + 1)}% per bounce`);
        } else {
            textLines.push(`Damage bonus: ${DAMAGE_UP_BOUNCE * 100}% per bounce`);
        }
    }

    return textLines;
}

function createAndPush(
    startPosition: Position,
    nextBlockingPosistion: Position | undefined,
    availableRange: number,
    idRef: number,
    abilitySnipe: AbilitySnipe,
    faction: string,
    direction: number,
    canSplitOnHit: boolean | undefined,
    bounceCounter: number,
    hitSomething: boolean | undefined,
    triggeredByPlayer: boolean,
    game: Game
) {
    let remainingRange: undefined | number = undefined;
    let range = availableRange;
    if (nextBlockingPosistion) {
        range = calculateDistance(startPosition, nextBlockingPosistion);
        remainingRange = availableRange - range;
    }
    const abilityObjectSnipe = createAbilityObjectSnipe(
        startPosition,
        idRef,
        abilitySnipe,
        faction,
        direction,
        range,
        canSplitOnHit,
        abilitySnipe.baseDamage,
        hitSomething,
        triggeredByPlayer,
        bounceCounter,
        game.state.time
    );
    abilityObjectSnipe.remainingRange = remainingRange;
    abilityObjectSnipe.bounceCounter = bounceCounter;
    game.state.abilityObjects.push(abilityObjectSnipe);
}
