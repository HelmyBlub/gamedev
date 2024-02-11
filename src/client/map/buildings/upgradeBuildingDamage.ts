import { CHARACTER_UPGRADE_BONUS_DAMAGE, CharacterUpgradeBonusDamage } from "../../character/upgrades/characterUpgradeBonusDamage.js";
import { CharacterUpgrade, CharacterUpgrades } from "../../character/upgrades/characterUpgrades.js";
import { Game, Position } from "../../gameModel.js";
import { paintTextWithOutline } from "../../gamePaint.js";
import { Player } from "../../player.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { StatsUIPart, createStatsUI } from "../../statsUI.js";
import { MapTileObject } from "../mapObjects.js";
import { UPGRADE_BUILDINGS_FUNCTIONS } from "./upgradeBuilding.js";

export const UPGRADE_BUILDING_DAMAGE = "Upgrade Damage Factor";
const CHARACTER_UPGRADE = CHARACTER_UPGRADE_BONUS_DAMAGE;

export function addUpgradeBuildingDamage() {
    UPGRADE_BUILDINGS_FUNCTIONS[UPGRADE_BUILDING_DAMAGE] = {
        createUBStatsUis: createUBStatsUis,
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
    paintTextWithOutline(ctx, "white", "black", "Dmg", paintPos.x, paintPos.y, true, 3);
}

function createUBStatsUis(ctx: CanvasRenderingContext2D, characterUpgrades: CharacterUpgrades, game: Game): StatsUIPart[] {
    let damageUpgrade: CharacterUpgradeBonusDamage | undefined = characterUpgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusDamage;
    const texts: string[] = [];
    texts.push(`Damage Upgrade Building:`);
    texts.push(`Increases your damage and your pets damage`);
    texts.push(`multiplicative by a percentage.`);
    if (damageUpgrade && damageUpgrade.investedMoney! > 0) {
        texts.push(`Invested $${damageUpgrade.investedMoney} for ${(damageUpgrade.bonusDamageFactor * 100).toFixed()}% bonus damage factor.`);
    } else {
        texts.push(`Not yet purchased.`);
    }
    return [createStatsUI(ctx, texts)];
}

function refund(player: Player, game: Game) {
    let damageUpgrade: CharacterUpgradeBonusDamage | undefined = player.permanentData.upgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusDamage;
    if (!damageUpgrade) return;
    player.character.damageDoneFactor -= damageUpgrade.bonusDamageFactor;
    player.permanentData.money += damageUpgrade.investedMoney!;
    if (player.character.pets) {
        for (let pet of player.character.pets) {
            pet.damageDoneFactor -= damageUpgrade.bonusDamageFactor;
        }
    }
    damageUpgrade.bonusDamageFactor = 0;
    damageUpgrade.investedMoney = 0;
}

function getUpgradeText(characterUpgrades: CharacterUpgrades, game: Game): string[] {
    let damageUpgrade: CharacterUpgradeBonusDamage | undefined = characterUpgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusDamage;
    const bonusAmount = getAmount(characterUpgrades, game);
    const upgradeCosts = getCosts(characterUpgrades, game);

    const texts = [];
    texts.push(`Damage Upgrade Building:`);
    texts.push(`Pay $${upgradeCosts} for ${bonusAmount * 100}% bonus damage.`);
    const interactBuyKey = playerInputBindingToDisplayValue("interact1", game);
    texts.push(`Press <${interactBuyKey}> to buy.`);

    if (damageUpgrade && damageUpgrade.investedMoney! > 0) {
        texts.push(`Invested $${damageUpgrade.investedMoney} for ${(damageUpgrade.bonusDamageFactor * 100).toFixed()}% bonus damage factor.`);
        const interactRefundKey = playerInputBindingToDisplayValue("interact2", game);
        texts.push(`Press <${interactRefundKey}> to refund.`);
    }
    return texts;
}

function getCosts(characterUpgrades: CharacterUpgrades, game: Game): number {
    const upgrade: CharacterUpgrade | undefined = characterUpgrades[CHARACTER_UPGRADE];
    let upgradeDamage = 0;
    if (upgrade) {
        const damageUpgrade = upgrade as CharacterUpgradeBonusDamage;
        upgradeDamage = damageUpgrade.bonusDamageFactor;
    }
    return Math.max(2, Math.ceil(Math.pow((upgradeDamage * 40), 2)));
}

function getAmount(characterUpgrades: CharacterUpgrades, game: Game): number {
    return 0.05;
}

function buyUpgrade(player: Player, game: Game) {
    let damageUpgrade: CharacterUpgradeBonusDamage | undefined = player.permanentData.upgrades[CHARACTER_UPGRADE] as CharacterUpgradeBonusDamage;
    if (!damageUpgrade) {
        damageUpgrade = {
            level: 0,
            bonusDamageFactor: 0,
            investedMoney: 0,
        }
        player.permanentData.upgrades[CHARACTER_UPGRADE] = damageUpgrade;
    }

    const bonusDamage = getAmount(player.permanentData.upgrades, game);
    const upgradeCosts = getCosts(player.permanentData.upgrades, game);
    if (player.permanentData.money >= upgradeCosts) {
        damageUpgrade.bonusDamageFactor += bonusDamage;
        damageUpgrade.investedMoney! += upgradeCosts;
        player.character.damageDoneFactor += bonusDamage;
        player.permanentData.money -= upgradeCosts;
        if (player.character.pets) {
            for (let pet of player.character.pets) {
                pet.damageDoneFactor += bonusDamage;
            }
        }
    }
}


