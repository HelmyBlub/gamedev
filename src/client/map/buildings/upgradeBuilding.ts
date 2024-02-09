import { CHARACTER_UPGRADE_BONUS_HP, CharacterUpgradeBonusHP } from "../../character/upgrades/characterUpgradeBonusHealth.js";
import { CharacterUpgrade, CharacterUpgrades } from "../../character/upgrades/characterUpgrades.js";
import { getNextId } from "../../game.js";
import { Game, IdCounter } from "../../gameModel.js";
import { Player } from "../../player.js";
import { Building, findBuildingByIdAndType } from "./building.js";
import { IMAGE_BUILDING1 } from "./classBuilding.js";
import { addUpgradeBuildingExperience } from "./upgradeBuildingExperience.js";
import { addUpgradeBuildingHp } from "./upgradeBuildingHp.js";
import { addUpgradeBuildingMovementSpeed } from "./upgradeBuildingMovementSpeed.js";

export const UPGRADE_BUILDING = "Upgrade Building";
export type UpgradeBuilding = Building & {
    type: typeof UPGRADE_BUILDING,
    upgradeType: string,
}
export type UpgradeBuildingFunctions = {
    buyUpgrade: (player: Player, game: Game) => void,
    getAmount: (characterUpgrades: CharacterUpgrades, game: Game) => number,
    getCosts: (characterUpgrades: CharacterUpgrades, game: Game) => number,
    getUpgradeText: (characterUpgrades: CharacterUpgrades, game: Game) => string[],
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

export function upgradeBuildingFindById(id: number, game: Game): UpgradeBuilding | undefined {
    const building = findBuildingByIdAndType(id, UPGRADE_BUILDING, game);
    if (building) return building as UpgradeBuilding;
    return undefined;
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