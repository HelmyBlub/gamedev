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
        buyUpgrade: buyUpgrade,
    }
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
        }
        player.permanentData.upgrades[CHARACTER_UPGRADE] = moveSpeedUpgrade;
    }

    const bonusMoveSpeed = getAmount(player.permanentData.upgrades, game);
    const upgradeCosts = getCosts(player.permanentData.upgrades, game);
    if (player.permanentData.money >= upgradeCosts) {
        moveSpeedUpgrade.bonusMoveSpeed += bonusMoveSpeed;
        player.character.moveSpeed += bonusMoveSpeed;
        player.permanentData.money -= upgradeCosts;
    }
}


