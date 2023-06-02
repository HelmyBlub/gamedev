import { calculateDirection } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { Ability, AbilityOwner, AbilityUpgradeOption } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, createAbilityObjectSnipeInitial, getAbilitySnipeShotFrequency } from "./abilitySnipe.js";
import { paintSniperRifle } from "./abilitySnipePaint.js";

export const ABILITY_SNIPE_UPGRADE_AFTER_IMAGE = "After Image";
const AFTER_IMAGE_DURATION = 3000;
const AFTER_IMAGE_COUNTER_PER_LEVEL = 2;

type AfterImage = {
    castPosition: Position,
    position: Position,
    removeTime: number,
    nextAllowedShotTime: number,
    direction: number,
}

export type AbilityUpgradeAfterImage = AbilityUpgrade & {
    cooldown: number,
    nextValidSpawnTime?: number,
    afterImages: AfterImage[],
}

export function addAbilitySnipeUpgradeAfterImage() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE] = {
        getAbilityUpgradeUiText: getAbilityUpgradeAfterImageUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeAfterImageUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeAfterImage,
    }
}

export function castSnipeAfterImage(abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, castPosition: Position, game: Game) {
    const upgradeAfterImage: AbilityUpgradeAfterImage = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE];
    if (!upgradeAfterImage) return;

    if (upgradeAfterImage.nextValidSpawnTime === undefined || upgradeAfterImage.nextValidSpawnTime <= game.state.time) {
        upgradeAfterImage.nextValidSpawnTime = game.state.time + upgradeAfterImage.cooldown;
        upgradeAfterImage.afterImages.push({
            position: { x: abilityOwner.x, y: abilityOwner.y },
            castPosition: { x: castPosition.x, y: castPosition.y },
            removeTime: game.state.time + AFTER_IMAGE_DURATION,
            nextAllowedShotTime: game.state.time + getAbilitySnipeShotFrequency(abilitySnipe),
            direction: calculateDirection(abilityOwner, castPosition),
        });
    }
}

export function paintVisualizationAfterImage(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, cameraPosition: Position, game: Game) {
    const upgradeAfterImage: AbilityUpgradeAfterImage = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE];
    if (!upgradeAfterImage) return;

    for (let i = 0; i < upgradeAfterImage.afterImages.length; i++) {
        const afterImage = upgradeAfterImage.afterImages[i];
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        const paintX = Math.floor(afterImage.position.x - cameraPosition.x + centerX);
        const paintY = Math.floor(afterImage.position.y - cameraPosition.y + centerY);
        paintSniperRifle(ctx, abilitySnipe, paintX, paintY, afterImage.direction, 0, game);
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
        }
        if (afterImage.removeTime <= game.state.time) {
            upgrade.afterImages.splice(i, 1);
        }
    }
}

function pushAbilityUpgradeAfterImage(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    upgradeOptions.push({
        name: ABILITY_SNIPE_UPGRADE_AFTER_IMAGE, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            let up: AbilityUpgradeAfterImage;
            if (as.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE] === undefined) {
                up = {
                    level: 0,
                    afterImages: [],
                    cooldown: AFTER_IMAGE_DURATION,
                }
                as.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE] = up;
            } else {
                up = as.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE];
            }
            up.level++;
            up.cooldown = AFTER_IMAGE_DURATION / (AFTER_IMAGE_COUNTER_PER_LEVEL * up.level);
        }
    });
}

function getAbilityUpgradeAfterImageUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeAfterImage = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE];
    return `${ABILITY_SNIPE_UPGRADE_AFTER_IMAGE}s: ${upgrades.level * AFTER_IMAGE_COUNTER_PER_LEVEL}`;
}

function getAbilityUpgradeAfterImageUiTextLong(ability: Ability): string[] {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeAfterImage | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");
    const textLines: string[] = [];
    textLines.push(ABILITY_SNIPE_UPGRADE_AFTER_IMAGE + levelText);
    textLines.push(`After shooting an after image is created.`);
    textLines.push(`It stays and repeats the same shot for ${AFTER_IMAGE_DURATION/1000}s.`);
    textLines.push(`Number After Images: +${AFTER_IMAGE_COUNTER_PER_LEVEL}.`);

    return textLines;
}