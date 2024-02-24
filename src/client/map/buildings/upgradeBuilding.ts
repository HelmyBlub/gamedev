import { CharacterUpgrades } from "../../character/upgrades/characterUpgrades.js";
import { getNextId } from "../../game.js";
import { Game, IdCounter, Position } from "../../gameModel.js";
import { Player, getTextYouGainMoneyWhen } from "../../player.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { MapTileObject } from "../mapObjects.js";
import { Building, findBuildingByIdAndType } from "./building.js";
import { IMAGE_BUILDING1 } from "./classBuilding.js";
import { addUpgradeBuildingDamage } from "./upgradeBuildingDamage.js";
import { addUpgradeBuildingExperience } from "./upgradeBuildingExperience.js";
import { addUpgradeBuildingHp } from "./upgradeBuildingHp.js";
import { addUpgradeBuildingMoney } from "./upgradeBuildingMoney.js";
import { addUpgradeBuildingMovementSpeed } from "./upgradeBuildingMovementSpeed.js";
import { addUpgradeBuildingRerolls } from "./upgradeBuildingRerolls.js";

export const UPGRADE_BUILDING = "Upgrade Building";
export type UpgradeBuilding = Building & {
    type: typeof UPGRADE_BUILDING,
    upgradeType: string,
}
export type UpgradeBuildingFunctions = {
    buyUpgrade: (player: Player, game: Game) => void,
    createUBMoreInfos: (ctx: CanvasRenderingContext2D, characterUpgrades: CharacterUpgrades, game: Game) => MoreInfoPart[],
    getAmount: (characterUpgrades: CharacterUpgrades, game: Game) => number,
    getCosts: (characterUpgrades: CharacterUpgrades, game: Game) => number,
    getUpgradeText: (characterUpgrades: CharacterUpgrades, game: Game) => string[],
    paint?: (ctx: CanvasRenderingContext2D, mapObject: MapTileObject, paintTopLeft: Position, game: Game) => void,
    refund: (player: Player, game: Game) => void,
}

export type UpgradeBuildingsFunctions = {
    [key: string]: UpgradeBuildingFunctions,
}

export const UPGRADE_BUILDINGS_FUNCTIONS: UpgradeBuildingsFunctions = {};

export function addUpgradeBuildingsFunctions() {
    addUpgradeBuildingHp();
    addUpgradeBuildingMovementSpeed();
    addUpgradeBuildingExperience();
    addUpgradeBuildingMoney();
    addUpgradeBuildingDamage();
    addUpgradeBuildingRerolls();
}

export function createBuildingUpgradeBuilding(upgradeType: string, tileX: number, tileY: number, idCounter: IdCounter): UpgradeBuilding {
    return {
        type: UPGRADE_BUILDING,
        id: getNextId(idCounter),
        tileX: tileX,
        tileY: tileY,
        image: IMAGE_BUILDING1,
        upgradeType: upgradeType,
    }
}

export function createUpgradeBuildingMoreInfos(ctx: CanvasRenderingContext2D, characterUpgrades: CharacterUpgrades, upgradeBuildingKey: string, game: Game): MoreInfoPart[] {
    const result: MoreInfoPart[] = [createBaseUpgradeBuildingMoreInfosPart(ctx)];

    const upgradeBuildingFunctions = UPGRADE_BUILDINGS_FUNCTIONS[upgradeBuildingKey];
    if (upgradeBuildingFunctions) {
        result.push(...upgradeBuildingFunctions.createUBMoreInfos(ctx, characterUpgrades, game));
    }

    return result;
}

function createBaseUpgradeBuildingMoreInfosPart(ctx: CanvasRenderingContext2D): MoreInfoPart {
    const texts: string[] = [
        `Pay money to gain a permanent upgrade.`,
        `Upgrades apply to your character and your pets.`,
        ``,
    ];
    texts.push(...getTextYouGainMoneyWhen());
    return createMoreInfosPart(ctx, texts);

}

export function upgradeBuildingFindById(id: number, game: Game): UpgradeBuilding | undefined {
    const building = findBuildingByIdAndType(id, UPGRADE_BUILDING, game);
    if (building) return building as UpgradeBuilding;
    return undefined;
}

export function paintUpgradeBuilding(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, paintTopLeft: Position, upgradeBuildingKey: string, game: Game) {
    const upgradeBuildingFunctions = UPGRADE_BUILDINGS_FUNCTIONS[upgradeBuildingKey];
    if (upgradeBuildingFunctions && upgradeBuildingFunctions.paint) {
        upgradeBuildingFunctions.paint(ctx, mapObject, paintTopLeft, game);
    }
}

export function upgradeBuildingNextUpgradeCosts(characterUpgrades: CharacterUpgrades, upgradeBuildingKey: string, game: Game): number {
    const upgradeBuildingFunctions = UPGRADE_BUILDINGS_FUNCTIONS[upgradeBuildingKey];
    if (upgradeBuildingFunctions) {
        return upgradeBuildingFunctions.getCosts(characterUpgrades, game);
    }
    return 0;
}

export function upgradeBuildingNextUpgradeBonusAmount(characterUpgrades: CharacterUpgrades, upgradeBuildingKey: string, game: Game): number {
    const upgradeBuildingFunctions = UPGRADE_BUILDINGS_FUNCTIONS[upgradeBuildingKey];
    if (upgradeBuildingFunctions) {
        return upgradeBuildingFunctions.getAmount(characterUpgrades, game);
    }
    return 0;
}

export function upgradeBuildingBuyUpgrade(player: Player, upgradeBuildingKey: string, game: Game) {
    const upgradeBuildingFunctions = UPGRADE_BUILDINGS_FUNCTIONS[upgradeBuildingKey];
    if (upgradeBuildingFunctions) {
        upgradeBuildingFunctions.buyUpgrade(player, game);
    }
}

export function upgradeBuildingRefund(player: Player, upgradeBuildingKey: string, game: Game) {
    const upgradeBuildingFunctions = UPGRADE_BUILDINGS_FUNCTIONS[upgradeBuildingKey];
    if (upgradeBuildingFunctions) {
        upgradeBuildingFunctions.refund(player, game);
    }
}

export function upgradeBuildingGetUpgradeText(characterUpgrades: CharacterUpgrades, upgradeBuildingKey: string, game: Game): string[] {
    const upgradeBuildingFunctions = UPGRADE_BUILDINGS_FUNCTIONS[upgradeBuildingKey];
    if (upgradeBuildingFunctions) {
        return upgradeBuildingFunctions.getUpgradeText(characterUpgrades, game);
    }
    return [];
}