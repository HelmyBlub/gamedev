import { CHARACTER_UPGRADE_BONUS_MONEY, CharacterUpgradeBonusMoney } from "../../character/upgrades/characterUpgradeMoney.js";
import { CharacterUpgrade, CharacterUpgrades } from "../../character/upgrades/characterUpgrades.js";
import { Game, Position } from "../../gameModel.js";
import { paintTextWithOutline } from "../../gamePaint.js";
import { Player } from "../../player.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { MapTileObject } from "../mapObjects.js";
import { UPGRADE_BUILDINGS_FUNCTIONS } from "./upgradeBuilding.js";

export const UPGRADE_BUILDING_MONEY = "Upgrade Money Gain";
const CHARACTER_UPGRADE = CHARACTER_UPGRADE_BONUS_MONEY;

export function addUpgradeBuildingMoney() {
    UPGRADE_BUILDINGS_FUNCTIONS[UPGRADE_BUILDING_MONEY] = {
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
    paintTextWithOutline(ctx, "white", "black", "$", paintPos.x, paintPos.y, true, 3);
}

function createUBMoreInfos(ctx: CanvasRenderingContext2D, characterUpgrades: CharacterUpgrades, game: Game): MoreInfoPart[] {
    let moneyUpgrade: CharacterUpgradeBonusMoney | undefined = characterUpgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusMoney;
    const texts: string[] = [];
    texts.push(`Money Upgrade Building:`);
    texts.push(`Increases your money gained`);
    texts.push(`by a percentage.`);
    if (moneyUpgrade && moneyUpgrade.investedMoney! > 0) {
        texts.push(`Invested $${moneyUpgrade.investedMoney} for ${(moneyUpgrade.bonusMoneyFactor * 100).toFixed()}% bonus money factor.`);
    } else {
        texts.push(`Not yet purchased.`);
    }
    return [createMoreInfosPart(ctx, texts)];
}

function refund(player: Player, game: Game) {
    let up: CharacterUpgradeBonusMoney | undefined = player.permanentData.upgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusMoney;
    if (!up) return;
    player.character.bonusMoneyFactor! -= up.bonusMoneyFactor;
    player.permanentData.money += up.investedMoney!;
    if (player.character.pets) {
        for (let pet of player.character.pets) {
            pet.bonusMoneyFactor! -= up.bonusMoneyFactor;
        }
    }
    up.bonusMoneyFactor = 0;
    up.investedMoney = 0;
}

function getUpgradeText(characterUpgrades: CharacterUpgrades, game: Game): string[][] {
    let moneyUpgrade: CharacterUpgradeBonusMoney | undefined = characterUpgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusMoney;
    const bonusAmount = getAmount(characterUpgrades, game);
    const upgradeCosts = getCosts(characterUpgrades, game);
    const textsText = [];
    const texts: string[] = [];

    if (game.UI.inputType === "keyboard") {
        texts.push(`Money Upgrade Building:`);
        texts.push(`Pay $${upgradeCosts} for ${bonusAmount * 100}% bonus money gain.`);
        const interactBuyKey = playerInputBindingToDisplayValue("interact1", game);
        texts.push(`Press <${interactBuyKey}> to buy.`);

        if (moneyUpgrade && moneyUpgrade.investedMoney! > 0) {
            texts.push(`Invested $${moneyUpgrade.investedMoney} for ${(moneyUpgrade.bonusMoneyFactor * 100).toFixed()}% bonus money gain.`);
            const interactRefundKey = playerInputBindingToDisplayValue("interact2", game);
            texts.push(`Press <${interactRefundKey}> to refund.`);
        }
        textsText.push(texts);
    } else if (game.UI.inputType === "touch") {
        texts.push(`Money Upgrade Building:`);
        texts.push(`Pay $${upgradeCosts} for ${bonusAmount * 100}% bonus money gain.`);
        textsText.push(texts);

        if (moneyUpgrade && moneyUpgrade.investedMoney! > 0) {
            const text2: string[] = [];
            text2.push(`Invested $${moneyUpgrade.investedMoney} for ${(moneyUpgrade.bonusMoneyFactor * 100).toFixed()}% bonus money gain.`);
            text2.push(`Touch to refund.`);
            textsText.push(text2);
        }
    }
    return textsText;
}

function getCosts(characterUpgrades: CharacterUpgrades, game: Game): number {
    const upgrade: CharacterUpgrade | undefined = characterUpgrades[CHARACTER_UPGRADE];
    let upgradeMoney = 0;
    if (upgrade) {
        const moneyUp = upgrade as CharacterUpgradeBonusMoney;
        upgradeMoney = moneyUp.bonusMoneyFactor;
    }
    return Math.max(2, Math.ceil(Math.pow((upgradeMoney * 20), 2)));
}

function getAmount(characterUpgrades: CharacterUpgrades, game: Game): number {
    return 0.1;
}

function buyUpgrade(player: Player, game: Game) {
    let moneyUpgrade: CharacterUpgradeBonusMoney | undefined = player.permanentData.upgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusMoney;
    if (!moneyUpgrade) {
        moneyUpgrade = {
            level: 0,
            bonusMoneyFactor: 0,
            investedMoney: 0,
        }
        player.permanentData.upgrades[CHARACTER_UPGRADE] = moneyUpgrade;
        if (player.character.bonusMoneyFactor === undefined) player.character.bonusMoneyFactor = 1;
    }

    const bonusMoney = getAmount(player.permanentData.upgrades, game);
    const upgradeCosts = getCosts(player.permanentData.upgrades, game);
    if (player.permanentData.money >= upgradeCosts) {
        moneyUpgrade.bonusMoneyFactor += bonusMoney;
        moneyUpgrade.investedMoney! += upgradeCosts;
        player.character.bonusMoneyFactor! += bonusMoney;
        player.permanentData.money -= upgradeCosts;
    }
}


