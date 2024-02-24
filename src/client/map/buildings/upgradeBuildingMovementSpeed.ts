import { CHARACTER_UPGRADE_BONUS_MOVE_SPEED, CharacterUpgradeBonusMoveSpeed } from "../../character/upgrades/characterUpgradeMoveSpeed.js";
import { CharacterUpgrade, CharacterUpgrades } from "../../character/upgrades/characterUpgrades.js";
import { Game, Position } from "../../gameModel.js";
import { paintTextWithOutline } from "../../gamePaint.js";
import { Player } from "../../player.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { MapTileObject } from "../mapObjects.js";
import { UPGRADE_BUILDINGS_FUNCTIONS } from "./upgradeBuilding.js";

export const UPGRADE_BUILDING_MOVEMENT_SPEED = "Upgrade Movement Speed";
const CHARACTER_UPGRADE = CHARACTER_UPGRADE_BONUS_MOVE_SPEED;

export function addUpgradeBuildingMovementSpeed() {
    UPGRADE_BUILDINGS_FUNCTIONS[UPGRADE_BUILDING_MOVEMENT_SPEED] = {
        createUBMoreInfos: createUBMoreInfos,
        getCosts: getCosts,
        getAmount: getAmount,
        getUpgradeText: getUpgradeText,
        buyUpgrade: buyUpgrade,
        paint: paint,
        refund: refund,
    }
}

function paint(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, paintTopLeft: Position, game: Game) {
    const tileSize = game.state.map.tileSize;
    const paintPos = {
        x: paintTopLeft.x + mapObject.x * tileSize + 20,
        y: paintTopLeft.y + mapObject.y * tileSize + 30
    };
    ctx.font = "bold 16px Arial";
    paintTextWithOutline(ctx, "white", "black", "SPD", paintPos.x, paintPos.y, true, 3);
}

function createUBMoreInfos(ctx: CanvasRenderingContext2D, characterUpgrades: CharacterUpgrades, game: Game): MoreInfoPart[] {
    let moveSpeedUpgrade: CharacterUpgradeBonusMoveSpeed | undefined = characterUpgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusMoveSpeed;
    const texts: string[] = [];
    texts.push(`Movement Speed Upgrade Building:`);
    texts.push(`Increases your movement speed.`);
    if (moveSpeedUpgrade && moveSpeedUpgrade.investedMoney! > 0) {
        texts.push(`Invested $${moveSpeedUpgrade.investedMoney} for ${(moveSpeedUpgrade.bonusMoveSpeed).toFixed(2)} bonus movement speed.`);
    } else {
        texts.push(`Not yet purchased.`);
    }
    return [createMoreInfosPart(ctx, texts)];
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

function getUpgradeText(characterUpgrades: CharacterUpgrades, game: Game): string[] {
    let moveSpeedUpgrade: CharacterUpgradeBonusMoveSpeed | undefined = characterUpgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusMoveSpeed;
    const bonusAmount = getAmount(characterUpgrades, game);
    const upgradeCosts = getCosts(characterUpgrades, game);

    const texts = [];
    texts.push(`Move Speed Upgrade Building:`);
    texts.push(`Pay $${upgradeCosts} for ${bonusAmount} bonus move speed.`);
    const interactBuyKey = playerInputBindingToDisplayValue("interact1", game);
    texts.push(`Press <${interactBuyKey}> to buy.`);

    if (moveSpeedUpgrade && moveSpeedUpgrade.investedMoney! > 0) {
        texts.push(`Invested $${moveSpeedUpgrade.investedMoney} for ${moveSpeedUpgrade.bonusMoveSpeed.toFixed(2)} bonus move speed.`);
        const interactRefundKey = playerInputBindingToDisplayValue("interact2", game);
        texts.push(`Press <${interactRefundKey}> to refund.`);
    }
    return texts;
}

function getCosts(characterUpgrades: CharacterUpgrades, game: Game): number {
    const upgrade: CharacterUpgrade | undefined = characterUpgrades[CHARACTER_UPGRADE];
    let upgradeMoveSpeed = 0;
    if (upgrade) {
        const moveSpeedUpgrade = upgrade as CharacterUpgradeBonusMoveSpeed;
        upgradeMoveSpeed = moveSpeedUpgrade.bonusMoveSpeed;
    }
    return Math.max(2, Math.ceil(Math.pow(upgradeMoveSpeed * 40, 2)));
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


