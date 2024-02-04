import { CHARACTER_UPGRADE_BONUS_HP, CharacterUpgradeBonusHP } from "../../character/upgrades/characterUpgradeBonusHealth.js";
import { CharacterUpgrade, CharacterUpgrades } from "../../character/upgrades/characterUpgrades.js";
import { Game } from "../../gameModel.js";
import { Player } from "../../player.js";
import { UPGRADE_BUILDINGS_FUNCTIONS } from "./upgradeBuilding.js";

export const UPGRADE_BUILDING_HP = "Upgrade HP";

export function addUpgradeBuildingHp() {
    UPGRADE_BUILDINGS_FUNCTIONS[UPGRADE_BUILDING_HP] = {
        getCosts: getCosts,
        getAmount: getAmount,
        buyUpgrade: buyUpgrade,
    }
}

function getCosts(characterUpgrades: CharacterUpgrades, game: Game): number {
    const bonusHP = getAmount(characterUpgrades, game);
    return Math.ceil(bonusHP / 10);
}

function getAmount(characterUpgrades: CharacterUpgrades, game: Game): number {
    const upgrade: CharacterUpgrade | undefined = characterUpgrades[CHARACTER_UPGRADE_BONUS_HP];
    if (!upgrade) return 10;
    const hpUpgrade = upgrade as CharacterUpgradeBonusHP;
    return Math.max(10, hpUpgrade.bonusHp);
}

function buyUpgrade(player: Player, game: Game) {
    let hpUpgrade: CharacterUpgradeBonusHP | undefined = player.permanentData.upgrades[CHARACTER_UPGRADE_BONUS_HP] as CharacterUpgradeBonusHP;
    if (!hpUpgrade) {
        hpUpgrade = {
            level: 0,
            bonusHp: 0,
        }
        player.permanentData.upgrades[CHARACTER_UPGRADE_BONUS_HP] = hpUpgrade;
    }

    const bonusHP = getAmount(player.permanentData.upgrades, game);
    const upgradeCosts = getCosts(player.permanentData.upgrades, game);
    if (player.permanentData.money >= upgradeCosts) {
        hpUpgrade.bonusHp += bonusHP;
        player.character.maxHp += bonusHP;
        player.character.hp += bonusHP;
        player.permanentData.money -= upgradeCosts;
    }
}


