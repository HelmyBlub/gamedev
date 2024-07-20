import { characterTakeDamage, getCharactersTouchingLine, getRandomAlivePlayerCharacter } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { UpgradeOptionAndProbability, UpgradeOption, AbilityUpgradeOption } from "../../character/upgrade.js";
import { autoSendMousePositionHandler, calcNewPositionMovedInDirection, calculateDirection, findClientInfoByCharacterId, getNextId } from "../../game.js";
import { Position, Game, IdCounter, ClientInfo, FACTION_ENEMY } from "../../gameModel.js";
import { GAME_IMAGES } from "../../imageLoad.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, findAbilityById } from "../ability.js";
import { AbilityUpgrade, AbilityUpgradesFunctions, getAbilityUpgradeOptionDefault, getAbilityUpgradesDamageFactor, pushAbilityUpgradesOptions, upgradeAbility } from "../abilityUpgrade.js";
import { paintAbilityObjectSnipe, paintAbilitySnipe, paintAbilitySnipeAccessoire, createAbilitySnipeMoreInfos, paintAbilitySnipeUI } from "./abilitySnipePaint.js";
import { addAbilitySnipeUpgradeAfterImage, castSnipeAfterImage, tickAbilityUpgradeAfterImage } from "./abilitySnipeUpgradeAfterImage.js";
import { addAbilitySnipeUpgradeBackwardsShot, castSnipeBackwardsShot } from "./abilitySnipeUpgradeBackwardsShot.js";
import { abilityUpgradeNoMissChainOnObjectSnipeDamageDone, addAbilitySnipeUpgradeNoMissChain } from "./abilitySnipeUpgradeNoMissChain.js";
import { abilityUpgradeDamageAndRangeRangeFactor, addAbilitySnipeUpgradeDamageAndRange } from "./abilitySnipeUpgradeDamageAndRange.js";
import { ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH, AbilityUpgradeExplodeOnDeath, addAbilitySnipeUpgradeExplodeOnDeath, executeUpgradeExplodeOnDeath } from "./abilitySnipeUpgradeExplodeOnDeath.js";
import { ABILITY_SNIPE_UPGRADE_FIRE_LINE, AbilityUpgradeFireLine, addAbilitySnipeUpgradeFireLine, castSnipeFireLine as castSnipeUpgradeFireLine } from "./abilitySnipeUpgradeFireLine.js";
import { addAbilitySnipeUpgradeMoreRifles, castSnipeMoreRifles as castSnipeUpgradeMoreRifles, tickAbilityUpgradeMoreRifles } from "./abilitySnipeUpgradeMoreRifle.js";
import { ABILITY_SNIPE_UPGRADE_SPLIT_SHOT, abilityUpgradeSplitShotOnSnipeHit, addAbilitySnipeUpgradeSplitShot } from "./abilitySnipeUpgradeSplitShot.js";
import { ABILITY_SNIPE_UPGRADE_STAY_STILL, addAbilitySnipeUpgradeStayStill, tickAbilityUpgradeStayStill } from "./abilitySnipeUpgradeStayStill.js";
import { ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE, AbilityUpgradeTerrainBounce, addAbilitySnipeUpgradeTerrainBounce, createAndPushAbilityObjectSnipeTerrainBounceBounce, createAndPushAbilityObjectSnipeTerrainBounceInit, getAbilityUpgradeTerrainBounceDamageFactor } from "./abilitySnipeUpgradeTerrainBounce.js";
import { AbilityDamageBreakdown } from "../../combatlog.js";
import { ABILITY_NAME_EXPLODE } from "../abilityExplode.js";
import { ABILITY_NAME_FIRE_LINE } from "../abilityFireLine.js";

export type AbilityObjectSnipe = AbilityObject & {
    damage: number,
    range: number,
    size: number,
    direction: number,
    damageCalcDone: boolean,
    deleteTime: number,
    enemyFactionDamageTime?: number,
    remainingRange?: number,
    canSplitOnHit?: boolean,
    createdByUpgrade?: string,
    bounceCounter: number,
    hitSomething?: boolean,
    triggeredByPlayer: boolean,
}

export type AbilitySnipe = Ability & {
    abilitySnipeCounter?: number,
    abilitySnipeCharacterTotal?: number,
    baseDamage: number,
    baseRange: number,
    size: number,
    baseRechargeTime: number,
    shotFrequencyTimeDecreaseFaktor: number,
    maxCharges: number,
    currentCharges: number,
    reloadTime: number,
    paintFadeDuration: number,
    shotNextAllowedTime: boolean,
    maxShootFrequency: number,
    nextAllowedShotTime: number,
    lastSniperRiflePaintDirection: number,
    maxMagazineSize: number,
    minimumShotFrequency: number,
}

export const ABILITY_NAME_SNIPE = "Snipe";
export const IMAGE_NAME_SNIPE_AIM = "snipe aim";
export const IMAGE_NAME_RELOAD = "reload";
export const ABILITY_SNIPE_PAINT_FADE_DURATION = 500;
export const ABILITY_SNIPE_DAMAGE_PER_LEVEL = 100;
export const ABILITY_SNIPE_MAGAZIN_SIZE_PER_LEVEL = 1;
export const ABILITY_SNIPE_SNIPE_FREQUENCY_PER_LEVEL = 0.15;
export const ABILITY_SNIPE_RANGE_PER_LEVEL = 10;
export const ABILITY_SNIPE_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};
const EMEMY_SNIPE_DAMAGE_DELAY = 750;

GAME_IMAGES[ABILITY_NAME_SNIPE] = {
    imagePath: "/images/sniperRifle.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};
GAME_IMAGES[IMAGE_NAME_SNIPE_AIM] = {
    imagePath: "/images/aim.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};
GAME_IMAGES[IMAGE_NAME_RELOAD] = {
    imagePath: "/images/reload.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};

export function addAbilitySnipe() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SNIPE] = {
        activeAbilityCast: castSnipe,
        createAbility: createAbilitySnipe,
        createAbilityBossUpgradeOptions: createAbilityBossSnipeUpgradeOptions,
        createAbilityMoreInfos: createAbilitySnipeMoreInfos,
        createDamageBreakDown: createDamageBreakDown,
        deleteAbilityObject: deleteAbilityObjectSnipe,
        executeUpgradeOption: executeAbilitySnipeUpgradeOption,
        paintAbilityObject: paintAbilityObjectSnipe,
        paintAbilityUI: paintAbilitySnipeUI,
        paintAbility: paintAbilitySnipe,
        paintAbilityAccessoire: paintAbilitySnipeAccessoire,
        resetAbility: resetAbility,
        setAbilityToLevel: setAbilitySnipeToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbilitySnipe,
        tickAbilityObject: tickAbilityObjectSnipe,
        tickBossAI: tickBossAI,
        abilityUpgradeFunctions: ABILITY_SNIPE_UPGRADE_FUNCTIONS,
        canBeUsedByBosses: true,
    };

    addAbilitySnipeUpgradeAfterImage();
    addAbilitySnipeUpgradeMoreRifles();
    addAbilitySnipeUpgradeSplitShot();
    addAbilitySnipeUpgradeNoMissChain();
    addAbilitySnipeUpgradeDamageAndRange();
    addAbilitySnipeUpgradeStayStill();
    addAbilitySnipeUpgradeTerrainBounce();
    addAbilitySnipeUpgradeFireLine();
    addAbilitySnipeUpgradeBackwardsShot();
    addAbilitySnipeUpgradeExplodeOnDeath();
}

function createAbilitySnipe(
    idCounter: IdCounter,
    playerInputBinding?: string,
    damage: number = 50,
    range: number = 800,
    size: number = 5,
    rechargeTime: number = 1000,
    maxCharges: number = 3
): AbilitySnipe {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_SNIPE,
        baseDamage: damage,
        passive: false,
        playerInputBinding: playerInputBinding,
        baseRechargeTime: rechargeTime,
        currentCharges: maxCharges,
        maxCharges: maxCharges,
        reloadTime: -1,
        baseRange: range,
        shotFrequencyTimeDecreaseFaktor: 1,
        size: size,
        paintFadeDuration: ABILITY_SNIPE_PAINT_FADE_DURATION,
        upgrades: {},
        maxShootFrequency: 1000,
        shotNextAllowedTime: false,
        nextAllowedShotTime: 0,
        lastSniperRiflePaintDirection: 0,
        maxMagazineSize: 99,
        minimumShotFrequency: 100,
        tradable: true,
    };
}

export function createAbilityObjectSnipeByAbility(abilitySnipe: AbilitySnipe, abilityOwner: AbilityOwner, startPos: Position, direction: number, triggeredByPlayer: boolean, game: Game, createdByUpgrade: string | undefined = undefined): AbilityObjectSnipe {
    let deleteTime: number = game.state.time + abilitySnipe.paintFadeDuration;
    let enemyDamageTime = undefined;
    if (abilityOwner.faction === FACTION_ENEMY) {
        deleteTime += EMEMY_SNIPE_DAMAGE_DELAY;
        enemyDamageTime = game.state.time + EMEMY_SNIPE_DAMAGE_DELAY;
    }
    const abilityObjectSnipe: AbilityObjectSnipe = {
        type: ABILITY_NAME_SNIPE,
        size: abilitySnipe.size,
        color: "",
        x: startPos.x,
        y: startPos.y,
        damage: abilitySnipe.baseDamage,
        faction: abilityOwner.faction,
        direction: direction,
        range: getAbilitySnipeRange(abilitySnipe),
        damageCalcDone: false,
        deleteTime: deleteTime,
        enemyFactionDamageTime: enemyDamageTime,
        abilityIdRef: abilitySnipe.id,
        triggeredByPlayer: triggeredByPlayer,
        bounceCounter: 0,
    }
    if (createdByUpgrade) abilityObjectSnipe.createdByUpgrade = createdByUpgrade;
    return abilityObjectSnipe;
}

export function createAbilityObjectSnipe(
    startPos: Position,
    abilityIdRef: number,
    abilitySnipe: AbilitySnipe,
    faction: string,
    direction: number,
    range: number,
    canSplitOnHit: boolean | undefined,
    damage: number,
    hitSomething: boolean | undefined,
    triggeredByPlayer: boolean,
    bounceCounter: number,
    gameTime: number,
    createdByUpgrade: string | undefined = undefined,
): AbilityObjectSnipe {
    let deleteTime: number = gameTime + abilitySnipe.paintFadeDuration;
    let enemyDamageTime
    if (faction === FACTION_ENEMY) {
        deleteTime += EMEMY_SNIPE_DAMAGE_DELAY;
        enemyDamageTime = gameTime + EMEMY_SNIPE_DAMAGE_DELAY;
    }
    const abilityObjectSnipe: AbilityObjectSnipe = {
        type: ABILITY_NAME_SNIPE,
        size: abilitySnipe.size,
        color: "",
        x: startPos.x,
        y: startPos.y,
        damage: damage,
        faction: faction,
        direction: direction,
        range: range,
        damageCalcDone: false,
        deleteTime: deleteTime,
        enemyFactionDamageTime: enemyDamageTime,
        abilityIdRef: abilityIdRef,
        canSplitOnHit: canSplitOnHit,
        hitSomething: hitSomething,
        triggeredByPlayer: triggeredByPlayer,
        bounceCounter: bounceCounter,
    }
    if (createdByUpgrade) abilityObjectSnipe.createdByUpgrade = createdByUpgrade;
    return abilityObjectSnipe;
}

export function getAbilitySnipeDamage(abilitySnipe: AbilitySnipe | undefined, baseDamage: number, playerTriggered: boolean, bounceCounter: number = 0) {
    let damage = baseDamage;
    if (abilitySnipe) {
        damage *= getAbilityUpgradesDamageFactor(ABILITY_SNIPE_UPGRADE_FUNCTIONS, abilitySnipe, playerTriggered);
        damage *= getAbilityUpgradeTerrainBounceDamageFactor(abilitySnipe, bounceCounter);
    }
    return damage;
}

export function getAbilitySnipeRange(abilitySnipe: AbilitySnipe) {
    let range = abilitySnipe.baseRange;
    range *= abilityUpgradeDamageAndRangeRangeFactor(abilitySnipe);
    return range;
}

export function createAbilityObjectSnipeInitial(startPosition: Position, faction: string, abilitySnipe: AbilitySnipe, castPosition: Position, triggeredByPlayer: boolean, preventBackwardsShot: boolean, game: Game, createdByUpgrade: string | undefined = undefined) {
    castSnipeUpgradeFireLine(startPosition, faction, abilitySnipe, castPosition, triggeredByPlayer, game);
    if (!preventBackwardsShot) castSnipeBackwardsShot(startPosition, faction, abilitySnipe, castPosition, triggeredByPlayer, game);

    const direction = calculateDirection(startPosition, castPosition);
    const upgradeTerrainBounce: AbilityUpgradeTerrainBounce = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE];
    if (upgradeTerrainBounce && (triggeredByPlayer || upgradeTerrainBounce.upgradeSynergy)) {
        const range = getAbilitySnipeRange(abilitySnipe);
        createAndPushAbilityObjectSnipeTerrainBounceInit(startPosition, direction, abilitySnipe, faction, true, range, 0, triggeredByPlayer, game);
    } else {
        const abilityObjectSnipt = createAbilityObjectSnipe(
            startPosition,
            abilitySnipe.id,
            abilitySnipe,
            faction,
            direction,
            getAbilitySnipeRange(abilitySnipe),
            true,
            abilitySnipe.baseDamage,
            undefined,
            triggeredByPlayer,
            0,
            game.state.time,
            createdByUpgrade,
        );
        game.state.abilityObjects.push(abilityObjectSnipt);
    }
}

export function getOptionsSnipeUpgrade(ability: Ability, upgradeName: string): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, upgradeName);
    const upgrade: AbilityUpgrade & { upgradeSynergy: boolean } | undefined = ability.upgrades[upgradeName];
    const upgradeFunctions = ABILITY_SNIPE_UPGRADE_FUNCTIONS[upgradeName];
    options[0].option.displayMoreInfoText = upgradeFunctions.getMoreInfoText!(ability, options[0].option as AbilityUpgradeOption);

    if (upgrade && !upgrade.upgradeSynergy) {
        if (upgradeFunctions.addSynergyUpgradeOption && upgradeFunctions.addSynergyUpgradeOption(ability)) {
            options.push(getAbilityUpgradeOptionSynergy(ability.name, upgradeName, upgrade.level));
            options[1].option.displayMoreInfoText = upgradeFunctions.getMoreInfoText!(ability, options[1].option as AbilityUpgradeOption);
        }
    }

    return options;
}

export function getSniperRiflePosition(snipe: AbilitySnipe, owner: AbilityOwner): Position {
    if (!snipe.abilitySnipeCharacterTotal || snipe.abilitySnipeCharacterTotal < 2) return { x: owner.x, y: owner.y };
    const distance = 10;
    const angle = Math.PI * 2 / snipe.abilitySnipeCharacterTotal;
    return {
        x: owner.x + Math.cos(angle * snipe.abilitySnipeCounter!) * distance,
        y: owner.y + Math.sin(angle * snipe.abilitySnipeCounter!) * distance,
    }
}

export function createAbilityObjectSnipeBranch(abilitySnipe: AbilitySnipe, abilityObjectSnipe: AbilityObjectSnipe, startPosition: Position, direction: number, range: number, game: Game) {
    const upgradeTerrainBounce: AbilityUpgradeTerrainBounce = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE];
    if (upgradeTerrainBounce && upgradeTerrainBounce.upgradeSynergy) {
        createAndPushAbilityObjectSnipeTerrainBounceInit(
            startPosition,
            direction,
            abilitySnipe,
            abilityObjectSnipe.faction,
            false,
            range,
            abilityObjectSnipe.bounceCounter!,
            false,
            game
        );
    } else {
        const splitAbilityObjectSnipe = createAbilityObjectSnipe(
            startPosition,
            abilitySnipe.id,
            abilitySnipe!,
            abilityObjectSnipe.faction,
            direction,
            range,
            false,
            abilitySnipe.baseDamage,
            true,
            false,
            abilityObjectSnipe.bounceCounter,
            game.state.time
        );
        game.state.abilityObjects.push(splitAbilityObjectSnipe);
    }
}

export function getAbilitySnipeShotFrequency(abilitySnipe: AbilitySnipe) {
    return Math.max(abilitySnipe.maxShootFrequency / abilitySnipe.shotFrequencyTimeDecreaseFaktor, abilitySnipe.minimumShotFrequency);
}

export function abilitySnipeReload(abilitySnipe: AbilitySnipe, time: number) {
    if (abilitySnipe.currentCharges === 0 && abilitySnipe.reloadTime > time) return;
    if (abilitySnipe.currentCharges === abilitySnipe.maxCharges) return;
    abilitySnipe.currentCharges = 0;
    abilitySnipe.reloadTime = time + abilitySnipe.baseRechargeTime;
}

function resetAbility(ability: Ability) {
    const abilitySnipe = ability as AbilitySnipe;
    abilitySnipe.nextAllowedShotTime = 0;
    abilitySnipe.shotNextAllowedTime = false;
    abilitySnipe.reloadTime = -1;
    abilitySnipe.abilitySnipeCounter = undefined;
    abilitySnipe.abilitySnipeCharacterTotal = undefined;
}

function calculateAbilitySnipeCounter(character: AbilityOwner) {
    if (!character.abilities) return;
    let snipeCounter = 0;
    for (let ability of character.abilities) {
        if (ability.name === ABILITY_NAME_SNIPE) {
            const snipe = ability as AbilitySnipe;
            snipe.abilitySnipeCounter = snipeCounter;
            snipeCounter++;
        }
    }
    for (let ability of character.abilities) {
        if (ability.name === ABILITY_NAME_SNIPE) {
            const snipe = ability as AbilitySnipe;
            snipe.abilitySnipeCharacterTotal = snipeCounter;
        }
    }
}

function getAbilityUpgradeOptionSynergy(abilityName: string, upgradeName: string, probabilityFactor: number): UpgradeOptionAndProbability {
    const probability = 0.3 * probabilityFactor;
    const option: AbilityUpgradeOption = {
        displayText: `Synergy ${upgradeName}`,
        identifier: upgradeName,
        name: abilityName,
        type: "Ability",
        additionalInfo: "Synergy",
        boss: true,
    }

    const optionAndProbability: UpgradeOptionAndProbability = {
        option: option,
        probability: probability,
    };
    return optionAndProbability;
}

function setAbilitySnipeToLevel(ability: Ability, level: number) {
    const abilitySnipe = ability as AbilitySnipe;
    abilitySnipe.baseDamage = level * ABILITY_SNIPE_DAMAGE_PER_LEVEL;
    abilitySnipe.maxCharges = Math.min(2 + level * ABILITY_SNIPE_MAGAZIN_SIZE_PER_LEVEL, abilitySnipe.maxMagazineSize);
    abilitySnipe.baseRange = 800 + level * ABILITY_SNIPE_RANGE_PER_LEVEL;
    abilitySnipe.shotFrequencyTimeDecreaseFaktor = 0.5 + level * ABILITY_SNIPE_SNIPE_FREQUENCY_PER_LEVEL;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilitySnipe = ability as AbilitySnipe;
    abilitySnipe.baseDamage = level * 1 * damageFactor;
    abilitySnipe.maxCharges = Math.min(2 + level, abilitySnipe.maxMagazineSize);
    abilitySnipe.baseRange = 400 + level * 10;
    abilitySnipe.shotFrequencyTimeDecreaseFaktor = 1.00 + level * 0.10;
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const abilitySnipe = ability as AbilitySnipe;
    abilitySnipe.baseDamage = level * 10;
    abilitySnipe.maxCharges = Math.min(2 + level, abilitySnipe.maxMagazineSize);
    abilitySnipe.baseRange = 600 + level * 100;
    abilitySnipe.shotFrequencyTimeDecreaseFaktor = 0.75 + level * 0.25;
}

function deleteAbilityObjectSnipe(abilityObject: AbilityObject, game: Game) {
    const abilityObjectSnipe = abilityObject as AbilityObjectSnipe;
    return abilityObjectSnipe.deleteTime <= game.state.time;
}

function castSnipe(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, castPositionRelativeToCharacter: Position | undefined, isInputdown: boolean, game: Game) {
    const abilitySnipe = ability as AbilitySnipe;
    abilitySnipe.shotNextAllowedTime = isInputdown;
    autoSendMousePositionHandler(abilityOwner.id, ability.id.toString(), isInputdown, castPosition, game);
    if (abilitySnipe.currentCharges > 0 && abilitySnipe.shotNextAllowedTime && game.state.time >= abilitySnipe.nextAllowedShotTime) {
        createAbilityObjectSnipeInitialPlayerTriggered(abilityOwner, abilitySnipe, castPosition, game);
    }
}

function createAbilityObjectSnipeInitialPlayerTriggered(abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, castPosition: Position, game: Game) {
    abilitySnipe.lastSniperRiflePaintDirection = calculateDirection(abilityOwner, castPosition);

    castSnipeUpgradeMoreRifles(abilityOwner, abilityOwner.faction, abilitySnipe, castPosition, true, game);
    const startPosition = getSniperRiflePosition(abilitySnipe, abilityOwner);
    castSnipeAfterImage(startPosition, abilitySnipe, castPosition, true, game);
    createAbilityObjectSnipeInitial(startPosition, abilityOwner.faction, abilitySnipe, castPosition, true, false, game);
    abilitySnipe.currentCharges--;
    if (abilitySnipe.currentCharges === 0) {
        abilitySnipeReload(abilitySnipe, game.state.time);
    }
    abilitySnipe.nextAllowedShotTime = game.state.time + getAbilitySnipeShotFrequency(abilitySnipe);

}
function tickBossAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilitySnipe = ability as AbilitySnipe;
    abilitySnipe.shotNextAllowedTime = true;
}

function tickAbilitySnipe(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilitySnipe = ability as AbilitySnipe;
    if (abilitySnipe.abilitySnipeCounter === undefined) {
        calculateAbilitySnipeCounter(abilityOwner);
    }
    if (abilitySnipe.currentCharges === 0) {
        if (game.state.time >= abilitySnipe.reloadTime) {
            abilitySnipe.currentCharges = abilitySnipe.maxCharges;
            abilitySnipe.reloadTime = -1;
        }
    }
    if (abilitySnipe.currentCharges > 0 && abilitySnipe.shotNextAllowedTime && game.state.time >= abilitySnipe.nextAllowedShotTime) {
        const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
        let castPosition = { x: 0, y: 0 };
        if (clientInfo) {
            castPosition = clientInfo.lastMousePosition;
        } else {
            const target = getRandomAlivePlayerCharacter(game.state.players, game.state.randomSeed);
            if (target) {
                castPosition = { x: target.x, y: target.y };
            }
        }
        createAbilityObjectSnipeInitialPlayerTriggered(abilityOwner, abilitySnipe, castPosition, game);
    }
    if (abilitySnipe?.upgrades[ABILITY_SNIPE_UPGRADE_STAY_STILL]) {
        tickAbilityUpgradeStayStill(abilitySnipe, abilityOwner, game);
    }
    if (abilitySnipe.shotNextAllowedTime) {
        const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
        if (clientInfo) {
            abilitySnipe.lastSniperRiflePaintDirection = calculateDirection(abilityOwner, clientInfo.lastMousePosition);
        }
    }
    tickAbilityUpgradeMoreRifles(abilitySnipe, abilityOwner, game);
    tickAbilityUpgradeAfterImage(abilitySnipe, abilityOwner, game);
    if (abilityOwner.faction === FACTION_ENEMY) {
        abilitySnipe.shotNextAllowedTime = false;
    }
}

function tickAbilityObjectSnipe(abilityObject: AbilityObject, game: Game) {
    const abilityObjectSnipe = abilityObject as AbilityObjectSnipe;
    if (abilityObject.faction === FACTION_ENEMY) {
        if (abilityObjectSnipe.enemyFactionDamageTime! > game.state.time) {
            return;
        }
    }
    if (!abilityObjectSnipe.damageCalcDone) {
        const endPos = calcNewPositionMovedInDirection(abilityObjectSnipe, abilityObjectSnipe.direction, abilityObjectSnipe.range);
        const characters: Character[] = getCharactersTouchingLine(game, abilityObjectSnipe, endPos, abilityObject.faction, abilityObjectSnipe.size);
        const abilitySnipe = findAbilityById(abilityObject.abilityIdRef!, game) as AbilitySnipe | undefined;
        for (let char of characters) {
            if (char.state === "dead") continue;
            abilityObjectSnipe.hitSomething = true;
            if (abilitySnipe) {
                executeUpgradeExplodeOnDeath(abilitySnipe, abilityObject.faction, char, abilityObjectSnipe.triggeredByPlayer, game);
            }
            const damage = getAbilitySnipeDamage(abilitySnipe, abilityObjectSnipe.damage, abilityObjectSnipe.triggeredByPlayer, abilityObjectSnipe.bounceCounter);
            characterTakeDamage(char, damage, game, abilityObject.abilityIdRef, abilityObject.type, abilityObjectSnipe);
            if (abilityObjectSnipe.canSplitOnHit) abilityUpgradeSplitShotOnSnipeHit(char, abilitySnipe, abilityObjectSnipe, game);
        }
        if (abilitySnipe) abilityUpgradeNoMissChainOnObjectSnipeDamageDone(abilitySnipe, abilityObjectSnipe);
        abilityObjectSnipe.damageCalcDone = true;

        if (abilitySnipe?.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE]) {
            createAndPushAbilityObjectSnipeTerrainBounceBounce(abilityObjectSnipe, abilitySnipe, game);
        }
    }
}

function createDamageBreakDown(damage: number, ability: Ability, abilityObject: AbilityObject | undefined, damageAbilityName: string, game: Game): AbilityDamageBreakdown[] {
    const snipe = ability as AbilitySnipe;
    let triggeredByPlayer = false;
    let bounceCounter = 0;
    const damageBreakDown: AbilityDamageBreakdown[] = [];
    let openDamage = damage;
    if (abilityObject && abilityObject.type === ABILITY_NAME_SNIPE) {
        const snipeObject = abilityObject as AbilityObjectSnipe;
        triggeredByPlayer = snipeObject.triggeredByPlayer;
        bounceCounter = snipeObject.bounceCounter;
        if (snipeObject.triggeredByPlayer) {
            damageBreakDown.push({
                damage: snipe.baseDamage,
                name: "Main Shot Base Damage",
            });
            openDamage -= snipe.baseDamage;
        }
        if (snipeObject.canSplitOnHit === false && snipe.upgrades[ABILITY_SNIPE_UPGRADE_SPLIT_SHOT]) {
            damageBreakDown.push({
                damage: snipe.baseDamage,
                name: ABILITY_SNIPE_UPGRADE_SPLIT_SHOT,
            });
            openDamage -= snipe.baseDamage;
        }
        if (snipeObject.createdByUpgrade !== undefined) {
            damageBreakDown.push({
                damage: snipe.baseDamage,
                name: snipeObject.createdByUpgrade,
            });
            openDamage -= snipe.baseDamage;
        }
    } else if (abilityObject && abilityObject.type === ABILITY_NAME_EXPLODE) {
        const explodeUpgrade = snipe.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH] as AbilityUpgradeExplodeOnDeath;
        damageBreakDown.push({
            damage: snipe.baseDamage * explodeUpgrade.damageFactor,
            name: ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH,
        });
        openDamage -= snipe.baseDamage * explodeUpgrade.damageFactor;
    } else if (abilityObject && abilityObject.type === ABILITY_NAME_FIRE_LINE) {
        const fireLineUpgrade = snipe.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE] as AbilityUpgradeFireLine;
        const dps = fireLineUpgrade.damagePerSecondFactor * snipe.baseDamage;
        const damagePerTick = dps * (fireLineUpgrade.tickInterval / 1000);

        damageBreakDown.push({
            damage: damagePerTick,
            name: ABILITY_SNIPE_UPGRADE_FIRE_LINE,
        });
        openDamage -= damagePerTick;
    }
    const damageFactors = createDamageFactorBreakDown(snipe, triggeredByPlayer, bounceCounter);
    let totalFactor = 0;
    for (let damageFactor of damageFactors) {
        totalFactor += damageFactor.factor;
    }
    for (let damageFactor of damageFactors) {
        damageBreakDown.push({
            damage: openDamage * (damageFactor.factor / totalFactor),
            name: damageFactor.name,
        });
    }

    return damageBreakDown;
}

function createDamageFactorBreakDown(snipe: AbilitySnipe, playerTriggered: boolean, bounceCouter: number): { name: string, factor: number }[] {
    const keys = Object.keys(ABILITY_SNIPE_UPGRADE_FUNCTIONS);
    let damageFactors: { name: string, factor: number }[] = [];
    for (let key of keys) {
        if (snipe.upgrades && snipe.upgrades[key]) {
            let functions = ABILITY_SNIPE_UPGRADE_FUNCTIONS[key];
            if (functions.getDamageFactor) {
                const factor = functions.getDamageFactor(snipe, playerTriggered);
                damageFactors.push({ factor: factor, name: key });
            }
        }
    }
    if (bounceCouter > 0) {
        const factor = getAbilityUpgradeTerrainBounceDamageFactor(snipe, bounceCouter);
        damageFactors.push({ factor: factor, name: ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE });
    }
    return damageFactors;
}

function createAbilityBossSnipeUpgradeOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_SNIPE_UPGRADE_FUNCTIONS, upgradeOptions, ability, character, game);
    return upgradeOptions;
}

function executeAbilitySnipeUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    upgradeAbility(ability, character, abilityUpgradeOption);
}
