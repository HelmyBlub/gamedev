import { CHARACTER_UPGRADE_BONUS_HP, CharacterUpgradeBonusHP } from "../../character/upgrades/characterUpgradeBonusHealth.js";
import { CharacterUpgrade, CharacterUpgrades } from "../../character/upgrades/characterUpgrades.js";
import { getNextId } from "../../game.js";
import { Game, IdCounter } from "../../gameModel.js";
import { Building, findBuildingByIdAndType } from "./building.js";
import { IMAGE_BUILDING1 } from "./classBuilding.js";

export const UPGRADE_BUILDING = "Upgrade Building";
type UpgradeType = "HP" | "EXP";
export type UpgradeBuilding = Building & {
    type: typeof UPGRADE_BUILDING,
    upgradeType: UpgradeType,
}

export function createBuildingUpgradeBuilding(upgradeType: UpgradeType, tileX: number, tileY: number, idCounter: IdCounter): UpgradeBuilding {
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

export function upgradeBuildingNextUpgradeCosts(characterUpgrades: CharacterUpgrades, upgradeKey: string): number {
    if (upgradeKey === CHARACTER_UPGRADE_BONUS_HP) {
        const bonusHP = upgradeBuildingNextUpgradeBonusAmount(characterUpgrades, upgradeKey);
        return Math.ceil(bonusHP / 10);
    }
    return 0;
}

export function upgradeBuildingNextUpgradeBonusAmount(characterUpgrades: CharacterUpgrades, upgradeKey: string): number {
    if (upgradeKey === CHARACTER_UPGRADE_BONUS_HP) {
        const upgrade: CharacterUpgrade | undefined = characterUpgrades[upgradeKey];
        if (!upgrade) return 10;
        const hpUpgrade = upgrade as CharacterUpgradeBonusHP;
        return Math.max(10, hpUpgrade.bonusHp);
    }
    return 0;
}