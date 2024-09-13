import { CharacterUpgrade, CharacterUpgrades } from "../../character/upgrades/characterUpgrades.js";
import { Game, Position } from "../../gameModel.js";
import { paintTextWithOutline } from "../../gamePaint.js";
import { Player } from "../../player.js";
import { playerInputBindingToDisplayValue } from "../../input/playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { MapTileObject } from "../mapObjects.js";
import { UPGRADE_BUILDINGS_FUNCTIONS } from "./upgradeBuilding.js";
import { CHARACTER_UPGRADE_REROLLS, CharacterUpgradeRerolls } from "../../character/upgrades/characterUpgradeRerolls.js";

export const UPGRADE_BUILDING_REROLLS = "Gain Rerolls";
const CHARACTER_UPGRADE = CHARACTER_UPGRADE_REROLLS;

export function addUpgradeBuildingRerolls() {
    UPGRADE_BUILDINGS_FUNCTIONS[UPGRADE_BUILDING_REROLLS] = {
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
    paintTextWithOutline(ctx, "white", "black", "RE", paintPos.x, paintPos.y, true, 3);
}

function createUBMoreInfos(ctx: CanvasRenderingContext2D, characterUpgrades: CharacterUpgrades, game: Game): MoreInfoPart[] {
    let rerollUpgrade: CharacterUpgradeRerolls | undefined = characterUpgrades[CHARACTER_UPGRADE] as CharacterUpgradeRerolls;
    const texts: string[] = [];
    texts.push(`Reroll Upgrade Building:`);
    texts.push(`When you get random upgrade choices for your class`);
    texts.push(`one new choice is added to reroll the available choices.`);
    texts.push(``);
    if (rerollUpgrade && rerollUpgrade.investedMoney! > 0) {
        texts.push(`Invested $${rerollUpgrade.investedMoney} for ${rerollUpgrade.amount} rerolls per run.`);
    } else {
        texts.push(`Not yet purchased.`);
    }
    return [createMoreInfosPart(ctx, texts)];
}

function refund(player: Player, game: Game) {
    let up: CharacterUpgradeRerolls | undefined = player.permanentData.upgrades[CHARACTER_UPGRADE] as CharacterUpgradeRerolls;
    if (!up) return;
    player.character.upgradeChoices.rerools! -= up.amount;
    player.permanentData.money += up.investedMoney!;
    up.amount = 0;
    up.investedMoney = 0;
}

function getUpgradeText(characterUpgrades: CharacterUpgrades, game: Game): string[][] {
    let rerollUpgrade: CharacterUpgradeRerolls | undefined = characterUpgrades[CHARACTER_UPGRADE] as CharacterUpgradeRerolls;
    const bonusAmount = getAmount(characterUpgrades, game);
    const upgradeCosts = getCosts(characterUpgrades, game);
    const textsText = [];
    const texts: string[] = [];

    if (game.UI.inputType === "keyboard") {
        texts.push(`Reroll Upgrade Building:`);
        texts.push(`Pay $${upgradeCosts} for ${bonusAmount} reroll.`);
        const interactBuyKey = playerInputBindingToDisplayValue("interact1", game);
        texts.push(`Press <${interactBuyKey}> to buy.`);

        if (rerollUpgrade && rerollUpgrade.investedMoney! > 0) {
            texts.push(`Invested $${rerollUpgrade.investedMoney} for ${rerollUpgrade.amount} rerolls.`);
            const interactRefundKey = playerInputBindingToDisplayValue("interact2", game);
            texts.push(`Press <${interactRefundKey}> to refund.`);
        }
        textsText.push(texts);
    } else if (game.UI.inputType === "touch") {
        texts.push(`Reroll Upgrade Building:`);
        texts.push(`Pay $${upgradeCosts} for ${bonusAmount} reroll.`);
        textsText.push(texts);

        if (rerollUpgrade && rerollUpgrade.investedMoney! > 0) {
            const text2: string[] = [];
            text2.push(`Invested $${rerollUpgrade.investedMoney} for ${rerollUpgrade.amount} rerolls.`);
            text2.push(`Touch to refund.`);
            textsText.push(text2);
        }
    }
    return textsText;
}

function getCosts(characterUpgrades: CharacterUpgrades, game: Game): number {
    const upgrade: CharacterUpgrade | undefined = characterUpgrades[CHARACTER_UPGRADE];
    let upgradeRerolls = 0;
    if (upgrade) {
        const rerollUp = upgrade as CharacterUpgradeRerolls;
        upgradeRerolls = rerollUp.amount;
    }
    return Math.max(10, Math.ceil(Math.pow(10, upgradeRerolls + 1)));
}

function getAmount(characterUpgrades: CharacterUpgrades, game: Game): number {
    return 1;
}

function buyUpgrade(player: Player, game: Game) {
    let rerollUpgrade: CharacterUpgradeRerolls | undefined = player.permanentData.upgrades[CHARACTER_UPGRADE] as CharacterUpgradeRerolls;
    if (!rerollUpgrade) {
        rerollUpgrade = {
            level: 0,
            amount: 0,
            investedMoney: 0,
        }
        player.permanentData.upgrades[CHARACTER_UPGRADE] = rerollUpgrade;
        if (player.character.upgradeChoices.rerools === undefined) player.character.upgradeChoices.rerools = 0;
    }

    const rerollsAmount = getAmount(player.permanentData.upgrades, game);
    const upgradeCosts = getCosts(player.permanentData.upgrades, game);
    if (player.permanentData.money >= upgradeCosts) {
        rerollUpgrade.amount += rerollsAmount;
        rerollUpgrade.investedMoney! += upgradeCosts;
        player.character.upgradeChoices.rerools! += rerollsAmount;
        player.permanentData.money -= upgradeCosts;
    }
}


