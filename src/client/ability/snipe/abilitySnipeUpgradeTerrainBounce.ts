import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { calcNewPositionMovedInDirection, calculateDistance } from "../../game.js";
import { Position, Game } from "../../gameModel.js";
import { calculateBounceAngle, getFirstBlockingGameMapTilePositionTouchingLine } from "../../map/map.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilityObjectSnipe, AbilitySnipe, createAbilityObjectSnipe, getAbilitySnipeDamage, getAbilitySnipeRange, getOptionsSnipeUpgrade } from "./abilitySnipe.js";

export const ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE = "Terrain Bounce";
const DAMAGE_UP_BOUNCE = 0.5;

export type AbilityUpgradeTerrainBounce = AbilityUpgrade & {
    damageUpPerBounceFactor: number,
    upgradeSynergy: boolean,
    active: boolean
}

export function addAbilitySnipeUpgradeTerrainBounce() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE] = {
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
    const newBounceDirection = calculateBounceAngle(newStartPosition, abilityObjectSnipe.direction, game.state.map);
    const newEndPosistion = calcNewPositionMovedInDirection(newStartPosition, newBounceDirection, abilityObjectSnipe.remainingRange);
    const nextBlockingPosistion = getFirstBlockingGameMapTilePositionTouchingLine(game.state.map, newStartPosition, newEndPosistion, game);
    createAndPush(
        newStartPosition,
        nextBlockingPosistion,
        abilityObjectSnipe.remainingRange,
        abilityObjectSnipe.abilityRefId!,
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
    let terrainBounce: AbilityUpgradeTerrainBounce | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE];
    if (!terrainBounce) return 1;
    return 1 + bounceCounter * terrainBounce.damageUpPerBounceFactor;
}

function getOptionsTerrainBounce(ability: Ability): UpgradeOptionAndProbability[] {
    let options = getOptionsSnipeUpgrade(ability, ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE);
    return options;
}

function executeOptionTerrainBounce(ability: Ability, option: AbilityUpgradeOption) {
    let as = ability as AbilitySnipe;
    let up: AbilityUpgradeTerrainBounce;
    if (option.additionalInfo === "Synergy") {
        up = as.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE];
        up.upgradeSynergy = true;
    } else {
        if (as.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE] === undefined) {
            up = {
                level: 1,
                active: true,
                damageUpPerBounceFactor: 0,
                upgradeSynergy: false,

            }
            as.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE] = up;
        } else {
            up = as.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE];
        }
        up.damageUpPerBounceFactor += DAMAGE_UP_BOUNCE;
    }
}

function getAbilityUpgradeTerrainBounceUiText(ability: Ability): string {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeTerrainBounce = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE];

    return `Terrain Bounce and +${upgrade.damageUpPerBounceFactor * 100}% damage for each bounce` + (upgrade.upgradeSynergy ? " (Synergy)" : "");
}

function getAbilityUpgradeTerrainBounceUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeTerrainBounce | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE];
    const textLines: string[] = [];
    if (option.additionalInfo && option.additionalInfo === "Synergy") {
        textLines.push(`Most other upgrades will benefit from terrain bounce`);
    } else {
        textLines.push(`Main shots will bounce of blocking tiles.`);
        textLines.push(`Each bounce will increase damage by ${DAMAGE_UP_BOUNCE * 100}%`);
        textLines.push(`for the following bounced shot part.`);
    }

    return textLines;
}

function createAndPush(
    startPosition: Position,
    nextBlockingPosistion: Position | undefined,
    availableRange: number,
    refId: number,
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
    let abilityObjectSnipe = createAbilityObjectSnipe(
        startPosition,
        refId,
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
