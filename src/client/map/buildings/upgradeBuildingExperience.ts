import { CHARACTER_UPGRADE_BONUS_EXPERIENCE, CharacterUpgradeBonusExperience } from "../../character/upgrades/characterUpgradeExperienceGain.js";
import { CharacterUpgrade, CharacterUpgrades } from "../../character/upgrades/characterUpgrades.js";
import { Game, Position } from "../../gameModel.js";
import { paintTextWithOutline } from "../../gamePaint.js";
import { Player } from "../../player.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { MapTileObject } from "../mapObjects.js";
import { UPGRADE_BUILDINGS_FUNCTIONS } from "./upgradeBuilding.js";

export const UPGRADE_BUILDING_EXPERIENCE = "Upgrade Experience Gain";
const CHARACTER_UPGRADE = CHARACTER_UPGRADE_BONUS_EXPERIENCE;

export function addUpgradeBuildingExperience() {
    UPGRADE_BUILDINGS_FUNCTIONS[UPGRADE_BUILDING_EXPERIENCE] = {
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
    paintTextWithOutline(ctx, "white", "black", "EXP", paintPos.x, paintPos.y, true, 3);
}

function createUBMoreInfos(ctx: CanvasRenderingContext2D, characterUpgrades: CharacterUpgrades, game: Game): MoreInfoPart[] {
    let expUpgrade: CharacterUpgradeBonusExperience | undefined = characterUpgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusExperience;
    const texts: string[] = [];
    texts.push(`Experience Upgrade Building:`);
    texts.push(`Increases your and your pets experience gained`);
    texts.push(`by a percentage.`);
    if (expUpgrade && expUpgrade.investedMoney! > 0) {
        texts.push(`Invested $${expUpgrade.investedMoney} for ${(expUpgrade.bonusExperienceFactor * 100).toFixed()}% bonus experience factor.`);
    } else {
        texts.push(`Not yet purchased.`);
    }
    return [createMoreInfosPart(ctx, texts)];
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

function getUpgradeText(characterUpgrades: CharacterUpgrades, game: Game): string[][] {
    let experienceUpgrade: CharacterUpgradeBonusExperience | undefined = characterUpgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusExperience;
    const bonusAmount = getAmount(characterUpgrades, game);
    const upgradeCosts = getCosts(characterUpgrades, game);
    const textsText = [];

    let texts = [];
    texts.push(`Experience Upgrade Building:`);
    texts.push(`Pay $${upgradeCosts} for ${bonusAmount * 100}% bonus Experience.`);

    if (game.UI.inputType === "keyboard") {
        const interactBuyKey = playerInputBindingToDisplayValue("interact1", game);
        texts.push(`Press <${interactBuyKey}> to buy.`);
    } else {
        textsText.push(texts);
        texts = [];
    }

    if (experienceUpgrade && experienceUpgrade.investedMoney! > 0) {
        texts.push(`Invested $${experienceUpgrade.investedMoney} for ${(experienceUpgrade.bonusExperienceFactor * 100).toFixed()}% bonus experinece gain.`);
        if (game.UI.inputType === "keyboard") {
            const interactRefundKey = playerInputBindingToDisplayValue("interact2", game);
            texts.push(`Press <${interactRefundKey}> to refund.`);
        } else if (game.UI.inputType === "touch") {
            texts.push(`Touch to refund.`);
        }
    }
    textsText.push(texts);

    return textsText;
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


