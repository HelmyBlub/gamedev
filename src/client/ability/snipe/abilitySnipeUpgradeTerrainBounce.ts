import { calculateDirection, calculateDistance } from "../../game.js";
import { Position, Game } from "../../gameModel.js";
import { GameMap, MapTile, getMapTile, positionToMapKey } from "../../map/map.js";
import { Ability, AbilityOwner, UpgradeOptionAbility } from "../ability.js";
import { AbilitySnipe, calcAbilityObjectSnipeEndPosition, createAbilityObjectSnipe, getAbilitySnipeRange } from "./abilitySnipe.js";

export const UPGRADE_SNIPE_ABILITY_TERRAIN_BOUNCE = "Terrain Bounce";

export type AbilityUpgradeTerrainBounce = {
    active: boolean
}

export function getAbilityUpgradeTerrainBounce(): UpgradeOptionAbility {
    return {
        name: "Terrain Bounce", probabilityFactor: 1, upgrade: (a: Ability) => {
            const as = a as AbilitySnipe;
            let up: AbilityUpgradeTerrainBounce;
            if (as.upgrades[UPGRADE_SNIPE_ABILITY_TERRAIN_BOUNCE] === undefined) {
                up = {
                    active: true
                }
                as.upgrades[UPGRADE_SNIPE_ABILITY_TERRAIN_BOUNCE] = up;
            } else {
                throw new Error("should only be possible to skill once");
            }
        }
    }
}

export function abilityUpgradeTerrainBounceUiText(abilitySnipe: AbilitySnipe): string {
    let upgrades: AbilityUpgradeTerrainBounce | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_TERRAIN_BOUNCE];
    if (upgrades) {
        return "Terrain Bounce";
    }

    return "";
}

export function createAndPushAbilityObjectSnipeTerrainBounce(abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, castPosition: Position, game: Game) {
    let direction = calculateDirection(abilityOwner, castPosition);
    let remainingRange = getAbilitySnipeRange(abilitySnipe);
    let lastEndPosition: Position = abilityOwner;
    do{
        let startPosition = lastEndPosition;
        let endPos = calcAbilityObjectSnipeEndPosition(startPosition, direction, remainingRange);
        let nextBlockingPosistion = getFirstBlockingTilePositionTouchingLine(game.state.map, startPosition, endPos, game);
        if(nextBlockingPosistion){
            let range = calculateDistance(startPosition, nextBlockingPosistion);
            remainingRange -= range;
            let abilityObjectSnipe = createAbilityObjectSnipe(
                startPosition, 
                abilitySnipe.id, 
                abilitySnipe, 
                abilityOwner.faction, 
                direction, 
                range,
                game.state.time
            );
            game.state.abilityObjects.push(abilityObjectSnipe);
    
            let tileSize = game.state.map.tileSize;
            let wallX = Math.abs(nextBlockingPosistion.x % tileSize);
            if (wallX > tileSize/2) wallX = Math.abs(wallX - tileSize);
            let wallY = Math.abs(nextBlockingPosistion.y % tileSize);
            if (wallY > tileSize/2) wallY = Math.abs(wallY - tileSize);
            const wallAngle = wallX - wallY > 0 ? 0 : Math.PI / 2;
            direction = calculateBounceAngle(direction, wallAngle);
            lastEndPosition = nextBlockingPosistion;
        }else{
            let abilityObjectSnipt = createAbilityObjectSnipe(
                startPosition, 
                abilitySnipe.id, 
                abilitySnipe, 
                abilityOwner.faction, 
                direction, 
                remainingRange,
                game.state.time
            );
            game.state.abilityObjects.push(abilityObjectSnipt);
            remainingRange = 0;
        }
    }while(remainingRange > 0);
}

function calculateBounceAngle(startingAngle: number, wallAngle: number): number {
    const angleDiff = startingAngle - wallAngle;    
    return wallAngle - angleDiff;
}

export function getFirstBlockingTilePositionTouchingLine(map: GameMap, lineStart: Position, lineEnd: Position, game: Game): Position | undefined {
    let tileSize = map.tileSize;
    let currentTileIJ = positionToTileIJ(map, lineStart);
    let endTileIJ = positionToTileIJ(map, lineEnd);
    if (currentTileIJ.i !== endTileIJ.i && currentTileIJ.j !== endTileIJ.j) {
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
            console.log(positionToTileIJ(map, currentPos));
            if(currentTile.blocking){
                return currentPos;
            }
        } while (currentTileIJ.i !== endTileIJ.i && currentTileIJ.j !== endTileIJ.j);
    }

    return undefined;
}

function positionToTileIJ(map: GameMap, position: Position): {i: number, j: number}{
    return {
        i: Math.floor(position.x / map.tileSize),
        j: Math.floor(position.y / map.tileSize),
    }
}


