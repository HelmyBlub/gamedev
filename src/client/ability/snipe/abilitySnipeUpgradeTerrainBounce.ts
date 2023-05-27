import { calcNewPositionMovedInDirection, calculateDistance } from "../../game.js";
import { Position, Game } from "../../gameModel.js";
import { GameMap, getMapTile } from "../../map/map.js";
import { Ability, AbilityUpgradeOption } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilityObjectSnipe, AbilitySnipe, createAbilityObjectSnipe, getAbilitySnipeDamage, getAbilitySnipeRange } from "./abilitySnipe.js";

export const ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE = "Terrain Bounce";
const DAMAGE_UP_BOUNCE = 0.5;

export type AbilityUpgradeTerrainBounce = AbilityUpgrade & {
    damageUpPerBounceFactor: number,
    active: boolean
}

export function addAbilitySnipeUpgradeTerrainBounce() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE] = {
        getAbilityUpgradeUiText: getAbilityUpgradeTerrainBounceUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeTerrainBounceUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeTerrainBounce,
    }
}

export function createAndPushAbilityObjectSnipeTerrainBounceInit(startPosition: Position, direction: number, abilitySnipe: AbilitySnipe, faction: string, preventSplitOnHit: boolean | undefined, range: number, bounceCounter: number, triggeredByPlayer: boolean, game: Game) {
    const endPosistion = calcNewPositionMovedInDirection(startPosition, direction, range);
    const blockingPosistion = getFirstBlockingTilePositionTouchingLine(game.state.map, startPosition, endPosistion, game);
    createAndPush(
        startPosition,
        blockingPosistion,
        range,
        abilitySnipe.id,
        abilitySnipe,
        faction,
        direction,
        preventSplitOnHit,
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
    const newBounceDirection = calculateBounceAngle(newStartPosition, abilityObjectSnipe.direction, game);
    const newEndPosistion = calcNewPositionMovedInDirection(newStartPosition, newBounceDirection, abilityObjectSnipe.remainingRange);
    const nextBlockingPosistion = getFirstBlockingTilePositionTouchingLine(game.state.map, newStartPosition, newEndPosistion, game);
    createAndPush(
        newStartPosition,
        nextBlockingPosistion,
        abilityObjectSnipe.remainingRange,
        abilityObjectSnipe.abilityRefId,
        abilitySnipe,
        abilityObjectSnipe.faction,
        newBounceDirection,
        abilityObjectSnipe.preventSplitOnHit,
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

function pushAbilityUpgradeTerrainBounce(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    upgradeOptions.push({
        name: "Terrain Bounce", probabilityFactor: 1, upgrade: (a: Ability) => {
            const as = a as AbilitySnipe;
            let up: AbilityUpgradeTerrainBounce;
            if (as.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE] === undefined) {
                up = {
                    level: 1,
                    active: true,
                    damageUpPerBounceFactor: 0,
                }
                as.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE] = up;
            } else {
                up = as.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE];
            }
            up.damageUpPerBounceFactor += DAMAGE_UP_BOUNCE;
        }
    });
}

function getAbilityUpgradeTerrainBounceUiText(ability: Ability): string {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeTerrainBounce = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE];

    return `Terrain Bounce and +${upgrades.damageUpPerBounceFactor*100}% damage for each bounce`;
}

function getAbilityUpgradeTerrainBounceUiTextLong(ability: Ability): string[] {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeTerrainBounce | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE];
    const textLines: string[] = [];
    textLines.push(ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE);
    textLines.push(`Shots will bounce of blocking tiles.`);
    textLines.push(`Each bounce will increase damage by ${DAMAGE_UP_BOUNCE*100}%`);
    textLines.push(`for the following bounced shot part.`);

    return textLines;
}

function createAndPush(
    startPosition: Position,
    nextBlockingPosistion: Position | undefined,
    availableRange: number,
    refId: number | undefined,
    abilitySnipe: AbilitySnipe,
    faction: string,
    direction: number,
    preventSplitOnHit: boolean | undefined,
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
        preventSplitOnHit,
        getAbilitySnipeDamage(abilitySnipe, bounceCounter),
        hitSomething,
        triggeredByPlayer,
        game.state.time
    );
    abilityObjectSnipe.remainingRange = remainingRange;
    abilityObjectSnipe.bounceCounter = bounceCounter;
    game.state.abilityObjects.push(abilityObjectSnipe);
}

function calculateBounceAngle(bouncePosition: Position, startingAngle: number, game: Game): number {
    let tileSize = game.state.map.tileSize;
    let wallX = Math.abs(bouncePosition.x % tileSize);
    if (wallX > tileSize / 2) wallX = Math.abs(wallX - tileSize);
    let wallY = Math.abs(bouncePosition.y % tileSize);
    if (wallY > tileSize / 2) wallY = Math.abs(wallY - tileSize);

    const wallAngle = wallX - wallY > 0 ? 0 : Math.PI / 2;
    const angleDiff = startingAngle - wallAngle;
    return wallAngle - angleDiff;
}


//TODO copied from somewhere, redundant code or fine?
function getFirstBlockingTilePositionTouchingLine(map: GameMap, lineStart: Position, lineEnd: Position, game: Game): Position | undefined {
    let tileSize = map.tileSize;
    let currentTileIJ = positionToTileIJ(map, lineStart);
    let endTileIJ = positionToTileIJ(map, lineEnd);
    if (currentTileIJ.i !== endTileIJ.i || currentTileIJ.j !== endTileIJ.j) {
        let xDiff = lineEnd.x - lineStart.x;
        let yDiff = lineEnd.y - lineStart.y;
        let currentPos = { ...lineStart };
        do {
            let nextYBorder: number | undefined;
            let nextXBorder: number | undefined;
            let nextYBorderX: number | undefined;
            let nextXBorderY: number | undefined;
            if (yDiff !== 0) {
                if (yDiff > 0) {
                    nextYBorder = Math.ceil(currentPos.y / tileSize) * tileSize + 0.01;
                } else {
                    nextYBorder = Math.floor(currentPos.y / tileSize) * tileSize - 0.01;
                }
            }
            if (xDiff !== 0) {
                if (xDiff > 0) {
                    nextXBorder = Math.ceil(currentPos.x / tileSize) * tileSize + 0.01;
                } else {
                    nextXBorder = Math.floor(currentPos.x / tileSize) * tileSize - 0.01;
                }
            }
            if (nextYBorder !== undefined) {
                nextYBorderX = (nextYBorder - currentPos.y) * (xDiff / yDiff) + currentPos.x;
            }
            if (nextXBorder !== undefined) {
                nextXBorderY = (nextXBorder - currentPos.x) * (yDiff / xDiff) + currentPos.y;
            }
            if (nextYBorderX !== undefined && nextXBorderY !== undefined) {
                if (nextXBorder! > nextYBorderX) {
                    if (xDiff > 0) {
                        currentPos.x = nextYBorderX;
                        currentPos.y = nextYBorder!;
                    } else {
                        currentPos.x = nextXBorder!;
                        currentPos.y = nextXBorderY;
                    }
                } else {
                    if (xDiff > 0) {
                        currentPos.x = nextXBorder!;
                        currentPos.y = nextXBorderY;
                    } else {
                        currentPos.x = nextYBorderX;
                        currentPos.y = nextYBorder!;
                    }
                }
            } else if (nextYBorderX !== undefined) {
                currentPos.y = nextYBorder!;
            } else if (nextXBorderY !== undefined) {
                currentPos.x = nextXBorder!;
            } else {
                console.log("should not happen?");
            }
            const currentTile = getMapTile(currentPos, map, game.state.idCounter);
            currentTileIJ = positionToTileIJ(map, currentPos);
            if (currentTile.blocking) {
                return currentPos;
            }
        } while (currentTileIJ.i !== endTileIJ.i || currentTileIJ.j !== endTileIJ.j);
    }

    return undefined;
}

function positionToTileIJ(map: GameMap, position: Position): { i: number, j: number } {
    return {
        i: Math.floor(position.x / map.tileSize),
        j: Math.floor(position.y / map.tileSize),
    }
}


