import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { calculateDirection } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { Ability, AbilityOwner } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault, getAbilityUpgradeOptionSynergy } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, createAbilityObjectSnipeInitial, getAbilitySnipeShotFrequency } from "./abilitySnipe.js";
import { paintSniperRifle } from "./abilitySnipePaint.js";
import { ABILITY_SNIPE_UPGRADE_MORE_RIFLES, AbilityUpgradeMoreRifles, castSnipeMoreRifles, paintVisualizationMoreRifles } from "./abilitySnipeUpgradeMoreRifle.js";

export const ABILITY_SNIPE_UPGRADE_AFTER_IMAGE = "After Image";
const AFTER_IMAGE_DURATION = 3000;
const AFTER_IMAGE_COUNTER_PER_LEVEL = 2;

type AfterImage = {
    castPosition: Position,
    position: Position,
    removeTime: number,
    nextAllowedShotTime: number,
    direction: number,
    playerTriggered: boolean,
}

export type AbilityUpgradeAfterImage = AbilityUpgrade & {
    cooldown: number,
    nextValidSpawnTime?: number,
    afterImages: AfterImage[],
    upgradeSynergry: boolean,
}

export function addAbilitySnipeUpgradeAfterImage() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE] = {
        getStatsDisplayText: getAbilityUpgradeAfterImageUiText,
        getLongExplainText: getAbilityUpgradeAfterImageUiTextLong,
        getOptions: getOptionsAfterImage,
        executeOption: executeOptionAfterImage,
    }
}

export function castSnipeAfterImage(position: Position, abilitySnipe: AbilitySnipe, castPosition: Position, playerTriggered: boolean, game: Game) {
    const upgradeAfterImage: AbilityUpgradeAfterImage = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE];
    if (!upgradeAfterImage) return;
    if (!playerTriggered && !upgradeAfterImage.upgradeSynergry) return;
    if (upgradeAfterImage.nextValidSpawnTime === undefined || upgradeAfterImage.nextValidSpawnTime <= game.state.time) {
        if (playerTriggered) upgradeAfterImage.nextValidSpawnTime = game.state.time + upgradeAfterImage.cooldown;
        upgradeAfterImage.afterImages.push({
            position: { x: position.x, y: position.y },
            castPosition: { x: castPosition.x, y: castPosition.y },
            removeTime: game.state.time + AFTER_IMAGE_DURATION,
            nextAllowedShotTime: game.state.time + getAbilitySnipeShotFrequency(abilitySnipe),
            direction: calculateDirection(position, castPosition),
            playerTriggered: playerTriggered,
        });
    }
}

export function paintVisualizationAfterImage(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, cameraPosition: Position, game: Game) {
    const upgradeAfterImage: AbilityUpgradeAfterImage | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE];
    if (!upgradeAfterImage) return;
    const upgradeMoreRifles: AbilityUpgradeMoreRifles | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];

    for (let i = 0; i < upgradeAfterImage.afterImages.length; i++) {
        const afterImage = upgradeAfterImage.afterImages[i];
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        const paintX = Math.floor(afterImage.position.x - cameraPosition.x + centerX);
        const paintY = Math.floor(afterImage.position.y - cameraPosition.y + centerY);
        paintSniperRifle(ctx, abilitySnipe, paintX, paintY, afterImage.direction, 0, false, game);
        if (afterImage.playerTriggered && upgradeMoreRifles && upgradeMoreRifles.upgradeSynergry) {
            paintVisualizationMoreRifles(ctx, afterImage.position, abilitySnipe, cameraPosition, afterImage.castPosition, game);
        }
    }
}

export function tickAbilityUpgradeAfterImage(abilitySnipe: AbilitySnipe, abilityOwner: AbilityOwner, game: Game) {
    let upgrade: AbilityUpgradeAfterImage | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE];
    if (!upgrade) return;

    for (let i = upgrade.afterImages.length - 1; i >= 0; i--) {
        const afterImage = upgrade.afterImages[i];
        if (afterImage.nextAllowedShotTime <= game.state.time) {
            afterImage.nextAllowedShotTime += getAbilitySnipeShotFrequency(abilitySnipe);
            const randomizedCastPosition = {
                x: afterImage.castPosition.x + nextRandom(game.state.randomSeed) * 10 - 5,
                y: afterImage.castPosition.y + nextRandom(game.state.randomSeed) * 10 - 5,
            }
            createAbilityObjectSnipeInitial(afterImage.position, abilityOwner.faction, abilitySnipe, randomizedCastPosition, false, false, game);
            if (afterImage.playerTriggered) castSnipeMoreRifles(afterImage.position, abilityOwner.faction, abilitySnipe, randomizedCastPosition, false, game);
        }
        if (afterImage.removeTime <= game.state.time) {
            upgrade.afterImages.splice(i, 1);
        }
    }
}

function getOptionsAfterImage(ability: Ability): UpgradeOptionAndProbability[] {
    let options = getAbilityUpgradeOptionDefault(ability, ABILITY_SNIPE_UPGRADE_AFTER_IMAGE);
    const upgradeAfterImage: AbilityUpgradeAfterImage | undefined = ability.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE];

    if (upgradeAfterImage && !upgradeAfterImage.upgradeSynergry) {
        options.push(getAbilityUpgradeOptionSynergy(ability.name, ABILITY_SNIPE_UPGRADE_AFTER_IMAGE, upgradeAfterImage.level));
    }
    options[0].option.displayLongText = getAbilityUpgradeAfterImageUiTextLong(ability, options[0].option as AbilityUpgradeOption);

    return options;
}

function executeOptionAfterImage(ability: Ability, option: AbilityUpgradeOption) {
    let as = ability as AbilitySnipe;
    let up: AbilityUpgradeAfterImage;
    if (option.additionalInfo === "Synergy") {
        up = as.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE];
        up.upgradeSynergry = true;
    } else {
        if (as.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE] === undefined) {
            up = {
                level: 0,
                afterImages: [],
                cooldown: AFTER_IMAGE_DURATION,
                upgradeSynergry: false,
            }
            as.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE] = up;
        } else {
            up = as.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE];
        }
        up.level++;
        up.cooldown = AFTER_IMAGE_DURATION / (AFTER_IMAGE_COUNTER_PER_LEVEL * up.level);
    }
}

function getAbilityUpgradeAfterImageUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeAfterImage = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE];
    return `${ABILITY_SNIPE_UPGRADE_AFTER_IMAGE}s: ${upgrade.level * AFTER_IMAGE_COUNTER_PER_LEVEL}` + (upgrade.upgradeSynergry ? " (synergry)" : "");
}

function getAbilityUpgradeAfterImageUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeAfterImage | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");
    const textLines: string[] = [];
    if (option.additionalInfo && option.additionalInfo === "Synergry") {
        textLines.push(`Synergry ${ABILITY_SNIPE_UPGRADE_AFTER_IMAGE}`);
        textLines.push(`List of synergies:`);
        textLines.push(`- More Rifles`);
    } else {
        textLines.push(ABILITY_SNIPE_UPGRADE_AFTER_IMAGE + levelText);
        textLines.push(`After shooting an after image is created.`);
        textLines.push(`It stays and repeats the same shot for ${AFTER_IMAGE_DURATION / 1000}s.`);
        textLines.push(`Number After Images: +${AFTER_IMAGE_COUNTER_PER_LEVEL}.`);
    }

    return textLines;
}