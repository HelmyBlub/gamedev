import { PLAYER_BASE_HP } from "../../character/characterModel.js";
import { CHARACTER_UPGRADE_BONUS_HP, CharacterUpgradeBonusHP } from "../../character/upgrades/characterUpgradeBonusHealth.js";
import { CharacterUpgrade, CharacterUpgrades } from "../../character/upgrades/characterUpgrades.js";
import { Game, Position } from "../../gameModel.js";
import { paintTextWithOutline } from "../../gamePaint.js";
import { Player } from "../../player.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { MapTileObject } from "../mapObjects.js";
import { UPGRADE_BUILDINGS_FUNCTIONS } from "./upgradeBuilding.js";

export const UPGRADE_BUILDING_HP = "Upgrade HP";
const CHARACTER_UPGRADE = CHARACTER_UPGRADE_BONUS_HP;

export function addUpgradeBuildingHp() {
    UPGRADE_BUILDINGS_FUNCTIONS[UPGRADE_BUILDING_HP] = {
        createUBMoreInfos: createUBMoreInfos,
        buyUpgrade: buyUpgrade,
        getAmount: getAmount,
        getCosts: getCosts,
        getUpgradeText: getUpgradeText,
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
    paintTextWithOutline(ctx, "white", "black", "HP", paintPos.x, paintPos.y, true, 3);
}

function createUBMoreInfos(ctx: CanvasRenderingContext2D, characterUpgrades: CharacterUpgrades, game: Game): MoreInfoPart[] {
    let hpUpgrade: CharacterUpgradeBonusHP | undefined = characterUpgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusHP;
    const texts: string[] = [];
    texts.push(`HP Upgrade Building:`);
    texts.push(`Increases your Characters HP.`);
    if (hpUpgrade && hpUpgrade.investedMoney! > 0) {
        texts.push(`Invested $${hpUpgrade.investedMoney} for ${(hpUpgrade.bonusHp).toFixed()} bonus HP.`);
    } else {
        texts.push(`Not yet purchased.`);
    }
    return [createMoreInfosPart(ctx, texts)];
}

function refund(player: Player, game: Game) {
    let hpUpgrade: CharacterUpgradeBonusHP | undefined = player.permanentData.upgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusHP;
    if (!hpUpgrade) return;
    player.character.maxHp -= hpUpgrade.bonusHp;
    player.character.hp -= hpUpgrade.bonusHp;
    player.permanentData.money += hpUpgrade.investedMoney!;
    hpUpgrade.bonusHp = 0;
    hpUpgrade.investedMoney = 0;
}

function getUpgradeText(characterUpgrades: CharacterUpgrades, game: Game): string[][] {
    let hpUpgrade: CharacterUpgradeBonusHP | undefined = characterUpgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusHP;
    const bonusAmount = getAmount(characterUpgrades, game);
    const upgradeCosts = getCosts(characterUpgrades, game);

    const texts = [];
    texts.push(`HP Upgrade Building:`);
    texts.push(`Pay $${upgradeCosts} for ${bonusAmount} bonus HP.`);
    const interactBuyKey = playerInputBindingToDisplayValue("interact1", game);
    texts.push(`Press <${interactBuyKey}> to buy.`);

    if (hpUpgrade && hpUpgrade.investedMoney! > 0) {
        texts.push(`Invested $${hpUpgrade.investedMoney} for ${hpUpgrade.bonusHp.toFixed()} bonus HP gain.`);
        const interactRefundKey = playerInputBindingToDisplayValue("interact2", game);
        texts.push(`Press <${interactRefundKey}> to refund.`);
    }
    return [texts];
}

function getCosts(characterUpgrades: CharacterUpgrades, game: Game): number {
    const upgrade: CharacterUpgrade | undefined = characterUpgrades[CHARACTER_UPGRADE];
    let upgradeBonusHp = 0;
    if (upgrade) {
        const hpUpgrade = upgrade as CharacterUpgradeBonusHP;
        upgradeBonusHp = hpUpgrade.bonusHp;
    }
    return Math.max(2, Math.ceil(Math.pow(upgradeBonusHp / 10, 2)));
}

function getAmount(characterUpgrades: CharacterUpgrades, game: Game): number {
    const upgrade: CharacterUpgrade | undefined = characterUpgrades[CHARACTER_UPGRADE];
    let upgradeBonusHp = 0;
    if (upgrade) {
        const hpUpgrade = upgrade as CharacterUpgradeBonusHP;
        upgradeBonusHp = hpUpgrade.bonusHp;
    }
    return Math.ceil((PLAYER_BASE_HP + upgradeBonusHp) * 0.1);
}

function buyUpgrade(player: Player, game: Game) {
    let hpUpgrade: CharacterUpgradeBonusHP | undefined = player.permanentData.upgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusHP;
    if (!hpUpgrade) {
        hpUpgrade = {
            level: 0,
            bonusHp: 0,
            investedMoney: 0,
        }
        player.permanentData.upgrades[CHARACTER_UPGRADE] = hpUpgrade;
    }

    const bonusHP = getAmount(player.permanentData.upgrades, game);
    const upgradeCosts = getCosts(player.permanentData.upgrades, game);
    if (player.permanentData.money >= upgradeCosts) {
        hpUpgrade.bonusHp += bonusHP;
        player.character.maxHp += bonusHP;
        player.character.hp += bonusHP;
        player.permanentData.money -= upgradeCosts;
        hpUpgrade.investedMoney! += upgradeCosts;
    }
}


