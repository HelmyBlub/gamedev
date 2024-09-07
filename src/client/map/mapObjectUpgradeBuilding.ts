import { Character } from "../character/characterModel.js";
import { getCameraPosition } from "../game.js";
import { Game, Position } from "../gameModel.js";
import { getPointPaintPosition, paintTextLinesWithKeys } from "../gamePaint.js";
import { chunkXYToMapKey, mapKeyAndTileXYToPosition } from "./map.js";
import { MAP_OBJECTS_FUNCTIONS, MapTileObject, findMapKeyForMapObject, paintMabObjectDefault } from "./mapObjects.js";
import { localStorageSaveBuildings } from "../permanentData.js";
import { MoreInfosPartContainer, createDefaultMoreInfosContainer } from "../moreInfo.js";
import { UPGRADE_BUILDING, UPGRADE_BUILDINGS_FUNCTIONS, UpgradeBuilding, createBuildingUpgradeBuilding, createUpgradeBuildingMoreInfos, paintUpgradeBuilding, upgradeBuildingBuyUpgrade, upgradeBuildingFindById, upgradeBuildingGetUpgradeText, upgradeBuildingRefund } from "./buildings/upgradeBuilding.js";
import { findPlayerByCharacterId, findPlayerByCliendId } from "../player.js";
import { MapTileObjectBuilding } from "./mapObjectClassBuilding.js";
import { findBuildingByIdAndType } from "./buildings/building.js";

export type MapTileObjectUpgradeBuilding = MapTileObjectBuilding & {
}

export function addMapObjectUpgradeBuilding() {
    MAP_OBJECTS_FUNCTIONS[UPGRADE_BUILDING] = {
        createMoreInfos: createMoreInfosClassBuilding,
        interact1: interactBuy,
        interact2: interactRefund,
        paint: paint,
        paintInteract: paintInteract,
    }
}

export function mapObjectPlaceUpgradeBuilding(game: Game) {
    const upgradeBuildingKeys = Object.keys(UPGRADE_BUILDINGS_FUNCTIONS);
    let spawnChunk = game.state.map.chunks[chunkXYToMapKey(0, 0)];
    let freeChunkTile: Position = { x: 0, y: 7 };
    let foundFreeTile = false;
    main: while (!foundFreeTile) {
        for (let object of spawnChunk.objects) {
            if (object.x === freeChunkTile.x && object.y === freeChunkTile.y) {
                freeChunkTile.x++;
                if (freeChunkTile.x >= upgradeBuildingKeys.length) {
                    return;
                }
                continue main;
            }
        }
        foundFreeTile = true;
    }
    const upgradeBuilding = createBuildingUpgradeBuilding(upgradeBuildingKeys[freeChunkTile.x], freeChunkTile.x, freeChunkTile.y, game.state.idCounter);
    const mapObject: MapTileObjectUpgradeBuilding = {
        x: upgradeBuilding.tileX,
        y: upgradeBuilding.tileY,
        type: upgradeBuilding.type,
        interactable: true,
        buildingId: upgradeBuilding.id,
        image: upgradeBuilding.image,
    }
    spawnChunk.tiles[mapObject.x][mapObject.y] = 0;
    spawnChunk.objects.push(mapObject);
    game.state.buildings.push(upgradeBuilding);
    localStorageSaveBuildings(game);
}

function paint(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, paintTopLeft: Position, game: Game) {
    paintMabObjectDefault(ctx, mapObject, paintTopLeft, game);
    const mapObjectBuilding = mapObject as MapTileObjectBuilding;
    const building = findBuildingByIdAndType(mapObjectBuilding.buildingId, mapObjectBuilding.type, game);
    if (building) {
        const upgradeBuilding = building as UpgradeBuilding;
        paintUpgradeBuilding(ctx, mapObject, paintTopLeft, upgradeBuilding.upgradeType, game);
    }
}

function createMoreInfosClassBuilding(mapObject: MapTileObject, game: Game): MoreInfosPartContainer | undefined {
    const mapObjectBuilding = mapObject as MapTileObjectUpgradeBuilding;
    const building = upgradeBuildingFindById(mapObjectBuilding.buildingId, game);
    if (!building || !game.ctx) return;
    const moreInfosContainer = createDefaultMoreInfosContainer(game.ctx, mapObject.type, game.UI.moreInfos.headingFontSize);
    const characterUpgrades = findPlayerByCliendId(game.multiplayer.myClientId, game.state.players)?.permanentData.upgrades;
    if (characterUpgrades) {
        moreInfosContainer.moreInfoParts.push(...createUpgradeBuildingMoreInfos(game.ctx, characterUpgrades, building.upgradeType, game));
    }
    return moreInfosContainer;
}

function interactBuy(interacter: Character, mapObject: MapTileObject, game: Game) {
    const player = findPlayerByCharacterId(game.state.players, interacter.id);
    if (!player) return;
    const mapObjectUpgradeBuilding = mapObject as MapTileObjectUpgradeBuilding;
    const upgradeBuilding = upgradeBuildingFindById(mapObjectUpgradeBuilding.buildingId, game);
    if (!upgradeBuilding) return;
    upgradeBuildingBuyUpgrade(player, upgradeBuilding.upgradeType, game);
}

function interactRefund(interacter: Character, mapObject: MapTileObject, game: Game) {
    const player = findPlayerByCharacterId(game.state.players, interacter.id);
    if (!player) return;
    const mapObjectUpgradeBuilding = mapObject as MapTileObjectUpgradeBuilding;
    const upgradeBuilding = upgradeBuildingFindById(mapObjectUpgradeBuilding.buildingId, game);
    if (!upgradeBuilding) return;
    upgradeBuildingRefund(player, upgradeBuilding.upgradeType, game);
}

function paintInteract(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, interacter: Character, game: Game) {
    const key = findMapKeyForMapObject(mapObject, game.state.map);
    if (!key) return;
    const player = findPlayerByCharacterId(game.state.players, interacter.id);
    if (!player) return;
    const mapObjectUpgradeBuilding = mapObject as MapTileObjectUpgradeBuilding;
    const upgradeBuilding = upgradeBuildingFindById(mapObjectUpgradeBuilding.buildingId, game);
    if (!upgradeBuilding) return;
    const map = game.state.map;
    const cameraPosition = getCameraPosition(game);
    const topMiddlePos = mapKeyAndTileXYToPosition(key, mapObject.x, mapObject.y, map);
    topMiddlePos.y -= map.tileSize / 2;

    const texts = upgradeBuildingGetUpgradeText(player.permanentData.upgrades, upgradeBuilding.upgradeType, game);
    const paintPos = getPointPaintPosition(ctx, topMiddlePos, cameraPosition, game.UI.zoom);
    if (game.UI.inputType === "touch") game.UI.rectangles.interactRectangle = [];
    for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const rec = paintTextLinesWithKeys(ctx, text, paintPos, 20, true, true);
        if (game.UI.inputType === "touch" && game.UI.rectangles.interactRectangle) {
            if (i < 2) game.UI.rectangles.interactRectangle.push({ ...rec, interactAction: "interact" + (i + 1) });
        }
        paintPos.y += rec.height + 10;
    }
}
