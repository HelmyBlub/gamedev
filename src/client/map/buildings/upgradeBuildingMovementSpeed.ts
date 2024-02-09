import { CHARACTER_UPGRADE_BONUS_MOVE_SPEED, CharacterUpgradeBonusMoveSpeed } from "../../character/upgrades/characterUpgradeMoveSpeed.js";
import { CharacterUpgrade, CharacterUpgrades } from "../../character/upgrades/characterUpgrades.js";
import { Game } from "../../gameModel.js";
import { Player } from "../../player.js";
import { UPGRADE_BUILDINGS_FUNCTIONS } from "./upgradeBuilding.js";

export const UPGRADE_BUILDING_MOVEMENT_SPEED = "Upgrade Movement Speed";
const CHARACTER_UPGRADE = CHARACTER_UPGRADE_BONUS_MOVE_SPEED;

export function addUpgradeBuildingMovementSpeed() {
    UPGRADE_BUILDINGS_FUNCTIONS[UPGRADE_BUILDING_MOVEMENT_SPEED] = {
        getCosts: getCosts,
        getAmount: getAmount,
        getInvestedText: getInvestedText,
        buyUpgrade: buyUpgrade,
        refund: refund,
    }
}

function refund(player: Player, game: Game) {
    let moveSpeedUpgrade: CharacterUpgradeBonusMoveSpeed | undefined = player.permanentData.upgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusMoveSpeed;
    if (!moveSpeedUpgrade) return;
    player.character.baseMoveSpeed -= moveSpeedUpgrade.bonusMoveSpeed;
    player.permanentData.money += moveSpeedUpgrade.investedMoney!;
    if (player.character.pets) {
        for (let pet of player.character.pets) {
            pet.baseMoveSpeed -= moveSpeedUpgrade.bonusMoveSpeed;
        }
    }
    moveSpeedUpgrade.bonusMoveSpeed = 0;
    moveSpeedUpgrade.investedMoney = 0;
}

function getInvestedText(characterUpgrades: CharacterUpgrades, game: Game): string | undefined {
    let hpUpgrade: CharacterUpgradeBonusMoveSpeed | undefined = characterUpgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusMoveSpeed;
    if (!hpUpgrade) return undefined;
    return `Invested $${hpUpgrade.investedMoney} for ${hpUpgrade.bonusMoveSpeed.toFixed(2)} bonus move speed.`;
}


function getCosts(characterUpgrades: CharacterUpgrades, game: Game): number {
    const upgrade: CharacterUpgrade | undefined = characterUpgrades[CHARACTER_UPGRADE];
    if (!upgrade) return 10;
    const moveSpeedUpgrade = upgrade as CharacterUpgradeBonusMoveSpeed;
    return Math.max(10, Math.ceil(Math.pow(moveSpeedUpgrade.bonusMoveSpeed * 200, 2)));
}

function getAmount(characterUpgrades: CharacterUpgrades, game: Game): number {
    return 0.05;
}

function buyUpgrade(player: Player, game: Game) {
    let moveSpeedUpgrade: CharacterUpgradeBonusMoveSpeed | undefined = player.permanentData.upgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusMoveSpeed;
    if (!moveSpeedUpgrade) {
        moveSpeedUpgrade = {
            level: 0,
            bonusMoveSpeed: 0,
            investedMoney: 0,
        }
        player.permanentData.upgrades[CHARACTER_UPGRADE] = moveSpeedUpgrade;
    }

    const bonusMoveSpeed = getAmount(player.permanentData.upgrades, game);
    const upgradeCosts = getCosts(player.permanentData.upgrades, game);
    if (player.permanentData.money >= upgradeCosts) {
        moveSpeedUpgrade.bonusMoveSpeed += bonusMoveSpeed;
        moveSpeedUpgrade.investedMoney! += upgradeCosts;
        player.character.baseMoveSpeed += bonusMoveSpeed;
        player.permanentData.money -= upgradeCosts;
        if (player.character.pets) {
            for (let pet of player.character.pets) {
                pet.baseMoveSpeed += bonusMoveSpeed;
            }
        }
    }
}


