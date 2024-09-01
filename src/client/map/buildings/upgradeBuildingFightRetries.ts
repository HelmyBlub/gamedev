import { CharacterUpgrade, CharacterUpgrades } from "../../character/upgrades/characterUpgrades.js";
import { Game, Position } from "../../gameModel.js";
import { paintTextWithOutline } from "../../gamePaint.js";
import { Player } from "../../player.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { MapTileObject } from "../mapObjects.js";
import { UPGRADE_BUILDINGS_FUNCTIONS } from "./upgradeBuilding.js";
import { CHARACTER_UPGRADE_FIGHT_RETRIES, CharacterUpgradeFightRetries } from "../../character/upgrades/characterUpgradeFightRetries.js";

export const UPGRADE_BUILDING_FIGHT_RETRIES = "Gain King Fight Retries";
const CHARACTER_UPGRADE = CHARACTER_UPGRADE_FIGHT_RETRIES;

export function addUpgradeBuildingFightRetries() {
    UPGRADE_BUILDINGS_FUNCTIONS[UPGRADE_BUILDING_FIGHT_RETRIES] = {
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
    paintTextWithOutline(ctx, "white", "black", "TRY", paintPos.x, paintPos.y, true, 3);
}

function createUBMoreInfos(ctx: CanvasRenderingContext2D, characterUpgrades: CharacterUpgrades, game: Game): MoreInfoPart[] {
    let rerollUpgrade: CharacterUpgradeFightRetries | undefined = characterUpgrades[CHARACTER_UPGRADE] as CharacterUpgradeFightRetries;
    const texts: string[] = [];
    texts.push(`Fight Retries Upgrade Building:`);
    texts.push(`When you lose a king fight, you get`);
    texts.push(`the option to restart the king fight`);
    texts.push(`with your current character.`);
    texts.push(``);
    if (rerollUpgrade && rerollUpgrade.investedMoney! > 0) {
        texts.push(`Invested $${rerollUpgrade.investedMoney} for ${rerollUpgrade.amount} fight retries per run.`);
    } else {
        texts.push(`Not yet purchased.`);
    }
    return [createMoreInfosPart(ctx, texts)];
}

function refund(player: Player, game: Game) {
    let up: CharacterUpgradeFightRetries | undefined = player.permanentData.upgrades[CHARACTER_UPGRADE] as CharacterUpgradeFightRetries;
    if (!up) return;
    player.character.fightRetries! -= up.amount;
    player.permanentData.money += up.investedMoney!;
    up.amount = 0;
    up.investedMoney = 0;
}

function getUpgradeText(characterUpgrades: CharacterUpgrades, game: Game): string[][] {
    let retryUpgrade: CharacterUpgradeFightRetries | undefined = characterUpgrades[CHARACTER_UPGRADE] as CharacterUpgradeFightRetries;
    const bonusAmount = getAmount(characterUpgrades, game);
    const upgradeCosts = getCosts(characterUpgrades, game);

    const texts = [];
    texts.push(`Fight Retries Upgrade Building:`);
    texts.push(`Pay $${upgradeCosts} for ${bonusAmount} retries.`);
    const interactBuyKey = playerInputBindingToDisplayValue("interact1", game);
    texts.push(`Press <${interactBuyKey}> to buy.`);

    if (retryUpgrade && retryUpgrade.investedMoney! > 0) {
        texts.push(`Invested $${retryUpgrade.investedMoney} for ${retryUpgrade.amount} retries.`);
        const interactRefundKey = playerInputBindingToDisplayValue("interact2", game);
        texts.push(`Press <${interactRefundKey}> to refund.`);
    }
    return [texts];
}

function getCosts(characterUpgrades: CharacterUpgrades, game: Game): number {
    const upgrade: CharacterUpgrade | undefined = characterUpgrades[CHARACTER_UPGRADE];
    let upgradeRerolls = 0;
    if (upgrade) {
        const rerollUp = upgrade as CharacterUpgradeFightRetries;
        upgradeRerolls = rerollUp.amount;
    }
    return Math.max(10, Math.ceil(Math.pow(10, upgradeRerolls + 1)));
}

function getAmount(characterUpgrades: CharacterUpgrades, game: Game): number {
    return 1;
}

function buyUpgrade(player: Player, game: Game) {
    let rerollUpgrade: CharacterUpgradeFightRetries | undefined = player.permanentData.upgrades[CHARACTER_UPGRADE] as CharacterUpgradeFightRetries;
    if (!rerollUpgrade) {
        rerollUpgrade = {
            level: 0,
            amount: 0,
            investedMoney: 0,
        }
        player.permanentData.upgrades[CHARACTER_UPGRADE] = rerollUpgrade;
        if (player.character.fightRetries === undefined) player.character.fightRetries = 0;
    }

    const rerollsAmount = getAmount(player.permanentData.upgrades, game);
    const upgradeCosts = getCosts(player.permanentData.upgrades, game);
    if (player.permanentData.money >= upgradeCosts) {
        rerollUpgrade.amount += rerollsAmount;
        rerollUpgrade.investedMoney! += upgradeCosts;
        player.character.fightRetries! += rerollsAmount;
        player.permanentData.money -= upgradeCosts;
    }
}


