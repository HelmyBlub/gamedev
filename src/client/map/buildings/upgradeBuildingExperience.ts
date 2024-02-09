import { CHARACTER_UPGRADE_BONUS_EXPERIENCE, CharacterUpgradeBonusExperience } from "../../character/upgrades/characterUpgradeExperienceGain.js";
import { CharacterUpgrade, CharacterUpgrades } from "../../character/upgrades/characterUpgrades.js";
import { Game } from "../../gameModel.js";
import { Player } from "../../player.js";
import { UPGRADE_BUILDINGS_FUNCTIONS } from "./upgradeBuilding.js";

export const UPGRADE_BUILDING_EXPERIENCE = "Upgrade Experience Gain";
const CHARACTER_UPGRADE = CHARACTER_UPGRADE_BONUS_EXPERIENCE;

export function addUpgradeBuildingExperience() {
    UPGRADE_BUILDINGS_FUNCTIONS[UPGRADE_BUILDING_EXPERIENCE] = {
        getCosts: getCosts,
        getAmount: getAmount,
        getInvestedText: getInvestedText,
        buyUpgrade: buyUpgrade,
        refund: refund,
    }
}

function refund(player: Player, game: Game) {
    let expUpgrade: CharacterUpgradeBonusExperience | undefined = player.permanentData.upgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusExperience;
    if (!expUpgrade) return;
    player.character.experienceGainFactor! -= expUpgrade.bonusExperienceFactor;
    player.permanentData.money += expUpgrade.investedMoney!;
    if (player.character.pets) {
        for (let pet of player.character.pets) {
            pet.experienceGainFactor! -= expUpgrade.bonusExperienceFactor;
        }
    }
    expUpgrade.bonusExperienceFactor = 0;
    expUpgrade.investedMoney = 0;
}

function getInvestedText(characterUpgrades: CharacterUpgrades, game: Game): string | undefined {
    let hpUpgrade: CharacterUpgradeBonusExperience | undefined = characterUpgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusExperience;
    if (!hpUpgrade) return undefined;
    return `Invested $${hpUpgrade.investedMoney} for ${(hpUpgrade.bonusExperienceFactor * 100).toFixed()}% bonus experinece gain.`;
}

function getCosts(characterUpgrades: CharacterUpgrades, game: Game): number {
    const upgrade: CharacterUpgrade | undefined = characterUpgrades[CHARACTER_UPGRADE];
    let upgradeEXP = 0;
    if (upgrade) {
        const hpUpgrade = upgrade as CharacterUpgradeBonusExperience;
        upgradeEXP = hpUpgrade.bonusExperienceFactor;
    }
    return Math.max(2, Math.ceil(Math.pow((upgradeEXP * 20), 2)));
}

function getAmount(characterUpgrades: CharacterUpgrades, game: Game): number {
    return 0.1;
}

function buyUpgrade(player: Player, game: Game) {
    let expierenceUpgrade: CharacterUpgradeBonusExperience | undefined = player.permanentData.upgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusExperience;
    if (!expierenceUpgrade) {
        expierenceUpgrade = {
            level: 0,
            bonusExperienceFactor: 0,
            investedMoney: 0,
        }
        player.permanentData.upgrades[CHARACTER_UPGRADE] = expierenceUpgrade;
        if (player.character.experienceGainFactor === undefined) player.character.experienceGainFactor = 1;
        if (player.character.pets) {
            for (let pet of player.character.pets) {
                if (pet.experienceGainFactor === undefined) pet.experienceGainFactor = 1;
            }
        }
    }

    const bonusExp = getAmount(player.permanentData.upgrades, game);
    const upgradeCosts = getCosts(player.permanentData.upgrades, game);
    if (player.permanentData.money >= upgradeCosts) {
        expierenceUpgrade.bonusExperienceFactor += bonusExp;
        expierenceUpgrade.investedMoney! += upgradeCosts;
        player.character.experienceGainFactor! += bonusExp;
        player.permanentData.money -= upgradeCosts;
        if (player.character.pets) {
            for (let pet of player.character.pets) {
                pet.experienceGainFactor! += bonusExp;
            }
        }
    }
}


