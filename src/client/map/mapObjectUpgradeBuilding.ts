import { Character } from "../character/characterModel.js";
import { getCameraPosition } from "../game.js";
import { Game, Position } from "../gameModel.js";
import { getPointPaintPosition, paintTextLinesWithKeys } from "../gamePaint.js";
import { chunkXYToMapKey, mapKeyAndTileXYToPosition } from "./map.js";
import { MAP_OBJECTS_FUNCTIONS, MapTileObject, findMapKeyForMapObject } from "./mapObjects.js";
import { localStorageSaveBuildings } from "../permanentData.js";
import { StatsUIsPartContainer, createDefaultStatsUiContainer } from "../statsUI.js";
import { UPGRADE_BUILDING, createBuildingUpgradeBuilding, upgradeBuildingFindById, upgradeBuildingNextUpgradeBonusAmount, upgradeBuildingNextUpgradeCosts } from "./buildings/upgradeBuilding.js";
import { playerInputBindingToDisplayValue } from "../playerInput.js";
import { findPlayerByCharacterId } from "../player.js";
import { CHARACTER_UPGRADE_BONUS_HP, CharacterUpgradeBonusHP } from "../character/upgrades/characterUpgradeBonusHealth.js";

export type MapTileObjectUpgradeBuilding = MapTileObject & {
    buildingId: number,
}

export function addMapObjectUpgradeBuilding() {
    MAP_OBJECTS_FUNCTIONS[UPGRADE_BUILDING] = {
        createStatsUi: createStatsUiClassBuilding,
        interact1: interactLevelUp,
        paintInteract: paintInteract,
    }
}

export function mapObjectPlaceUpgradeBuilding(game: Game) {
    let spawnChunk = game.state.map.chunks[chunkXYToMapKey(0, 0)];
    let freeChunkTile: Position = { x: 0, y: 7 };
    let foundFreeTile = false;
    main: while (!foundFreeTile) {
        for (let object of spawnChunk.objects) {
            if (object.x === freeChunkTile.x && object.y === freeChunkTile.y) {
                freeChunkTile.x++;
                if (freeChunkTile.x >= 1) {
                    return;
                }
                continue main;
            }
        }
        foundFreeTile = true;
    }
    const upgradeBuilding = createBuildingUpgradeBuilding("HP", freeChunkTile.x, freeChunkTile.y, game.state.idCounter);
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

function createStatsUiClassBuilding(mapObject: MapTileObject, game: Game): StatsUIsPartContainer | undefined {
    const mapObjectBuilding = mapObject as MapTileObjectUpgradeBuilding;
    const building = upgradeBuildingFindById(mapObjectBuilding.buildingId, game);
    if (!building || !game.ctx) return;
    const statsUIContainer = createDefaultStatsUiContainer(game.ctx, mapObject.type, game.UI.statsUIs.headingFontSize);

    return statsUIContainer;
}


function interactLevelUp(interacter: Character, mapObject: MapTileObject, game: Game) {
    const player = findPlayerByCharacterId(game.state.players, interacter.id);
    if (!player) return;
    let hpUpgrade: CharacterUpgradeBonusHP | undefined = player.upgrades[CHARACTER_UPGRADE_BONUS_HP] as CharacterUpgradeBonusHP;
    if (!hpUpgrade) {
        hpUpgrade = {
            level: 0,
            bonusHp: 0,
        }
        player.upgrades[CHARACTER_UPGRADE_BONUS_HP] = hpUpgrade;
    }

    const bonusHP = upgradeBuildingNextUpgradeBonusAmount(player.upgrades, CHARACTER_UPGRADE_BONUS_HP);
    const upgradeCosts = upgradeBuildingNextUpgradeCosts(player.upgrades, CHARACTER_UPGRADE_BONUS_HP);
    if (player.currency >= upgradeCosts) {
        hpUpgrade.bonusHp += bonusHP;
        interacter.maxHp += bonusHP;
        interacter.hp += bonusHP;
        player.currency -= upgradeCosts;
    }
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

    const bonusHP = upgradeBuildingNextUpgradeBonusAmount(player.upgrades, CHARACTER_UPGRADE_BONUS_HP);
    const upgradeCosts = upgradeBuildingNextUpgradeCosts(player.upgrades, CHARACTER_UPGRADE_BONUS_HP);

    const texts = [];
    texts.push(`Upgrade Building:`);
    texts.push(`Permanently increase HP.`);
    texts.push(`Costs $${upgradeCosts} for ${bonusHP} HP.`);
    const interactBurrowKey = playerInputBindingToDisplayValue("interact1", game);
    texts.push(`Press <${interactBurrowKey}> to buy.`);

    texts.push(`Work in progress`);
    const paintPos = getPointPaintPosition(ctx, topMiddlePos, cameraPosition);
    paintTextLinesWithKeys(ctx, texts, paintPos, 20, true, true);
}
