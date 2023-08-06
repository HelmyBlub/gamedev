import { characterTakeDamage, getCharactersTouchingLine } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { UpgradeOptionAndProbability, UpgradeOption, AbilityUpgradeOption } from "../../character/upgrade.js";
import { calcNewPositionMovedInDirection, calculateDirection, getClientInfoByCharacterId, getNextId } from "../../game.js";
import { Position, Game, IdCounter, ClientInfo } from "../../gameModel.js";
import { GAME_IMAGES } from "../../imageLoad.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, findAbilityById } from "../ability.js";
import { AbilityUpgrade, AbilityUpgradesFunctions, getAbilityUpgradeOptionDefault, getAbilityUpgradesDamageFactor, pushAbilityUpgradesOptions, upgradeAbility } from "../abilityUpgrade.js";
import { paintAbilityObjectSnipe, paintAbilitySnipe, paintAbilitySnipeStatsUI, paintAbilitySnipeUI } from "./abilitySnipePaint.js";
import { addAbilitySnipeUpgradeAfterImage, castSnipeAfterImage, tickAbilityUpgradeAfterImage } from "./abilitySnipeUpgradeAfterImage.js";
import { addAbilitySnipeUpgradeBackwardsShot, castSnipeBackwardsShot } from "./abilitySnipeUpgradeBackwardsShot.js";
import { abilityUpgradeNoMissChainOnObjectSnipeDamageDone, addAbilitySnipeUpgradeNoMissChain } from "./abilitySnipeUpgradeChainHit.js";
import { abilityUpgradeDamageAndRangeRangeFactor, addAbilitySnipeUpgradeDamageAndRange } from "./abilitySnipeUpgradeDamageAndRange.js";
import { addAbilitySnipeUpgradeExplodeOnDeath, executeUpgradeExplodeOnDeath } from "./abilitySnipeUpgradeExplodeOnDeath.js";
import { addAbilitySnipeUpgradeFireLine, castSnipeFireLine as castSnipeUpgradeFireLine } from "./abilitySnipeUpgradeFireLine.js";
import { addAbilitySnipeUpgradeMoreRifles, castSnipeMoreRifles as castSnipeUpgradeMoreRifles, tickAbilityUpgradeMoreRifles } from "./abilitySnipeUpgradeMoreRifle.js";
import { abilityUpgradeSplitShotOnSnipeHit, addAbilitySnipeUpgradeSplitShot } from "./abilitySnipeUpgradeSplitShot.js";
import { ABILITY_SNIPE_UPGRADE_STAY_STILL, addAbilitySnipeUpgradeStayStill, tickAbilityUpgradeStayStill } from "./abilitySnipeUpgradeStayStill.js";
import { ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE, AbilityUpgradeTerrainBounce, addAbilitySnipeUpgradeTerrainBounce, createAndPushAbilityObjectSnipeTerrainBounceBounce, createAndPushAbilityObjectSnipeTerrainBounceInit, getAbilityUpgradeTerrainBounceDamageFactor } from "./abilitySnipeUpgradeTerrainBounce.js";

export type AbilityObjectSnipe = AbilityObject & {
    damage: number,
    range: number,
    size: number,
    direction: number,
    damageCalcDone: boolean,
    deleteTime: number,
    remainingRange?: number,
    canSplitOnHit?: boolean,
    bounceCounter: number,
    hitSomething?: boolean,
    triggeredByPlayer: boolean,
}

export type AbilitySnipe = Ability & {
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
export const ABILITY_SNIPE_PAINT_FADE_DURATION = 500;
export const ABILITY_SNIPE_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};

GAME_IMAGES[ABILITY_NAME_SNIPE] = {
    imagePath: "/images/sniperRifle.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};

export function addAbilitySnipe() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SNIPE] = {
        tickAbility: tickAbilitySnipe,
        tickAbilityObject: tickAbilityObjectSnipe,
        createAbilityBossUpgradeOptions: createAbilityBossSnipeUpgradeOptions,
        executeUpgradeOption: executeAbilitySnipeUpgradeOption,
        paintAbilityObject: paintAbilityObjectSnipe,
        paintAbilityUI: paintAbilitySnipeUI,
        paintAbility: paintAbilitySnipe,
        activeAbilityCast: castSnipe,
        createAbility: createAbilitySnipe,
        deleteAbilityObject: deleteAbilityObjectSnipe,
        paintAbilityStatsUI: paintAbilitySnipeStatsUI,
        setAbilityToLevel: setAbilitySnipeToLevel,
        abilityUpgradeFunctions: ABILITY_SNIPE_UPGRADE_FUNCTIONS,
        isPassive: false,
        notInheritable: true,
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

export function createAbilitySnipe(
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
    };
}

export function createAbilityObjectSnipeByAbility(abilitySnipe: AbilitySnipe, abilityOwner: AbilityOwner, startPos: Position, direction: number, triggeredByPlayer: boolean, game: Game): AbilityObjectSnipe {
    let abilityObjectSnipe: AbilityObjectSnipe = {
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
        deleteTime: game.state.time + abilitySnipe.paintFadeDuration,
        isLeveling: abilitySnipe.leveling ? true : undefined,
        abilityRefId: abilitySnipe.id,
        triggeredByPlayer: triggeredByPlayer,
        bounceCounter: 0,
    }
    return abilityObjectSnipe;
}

export function createAbilityObjectSnipe(
    startPos: Position,
    abilityRefId: number,
    abilitySnipe: AbilitySnipe,
    faction: string,
    direction: number,
    range: number,
    canSplitOnHit: boolean | undefined,
    damage: number,
    hitSomething: boolean | undefined,
    triggeredByPlayer: boolean, 
    bounceCounter: number,
    gameTime: number
): AbilityObjectSnipe {
    let abilityObjectSnipe: AbilityObjectSnipe = {
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
        deleteTime: gameTime + abilitySnipe.paintFadeDuration,
        isLeveling: abilitySnipe.leveling ? true : undefined,
        abilityRefId: abilityRefId,
        canSplitOnHit: canSplitOnHit,
        hitSomething: hitSomething,
        triggeredByPlayer: triggeredByPlayer,
        bounceCounter: bounceCounter,
    }

    return abilityObjectSnipe;
}

export function getAbilitySnipeDamage(abilitySnipe: AbilitySnipe, baseDamage: number, playerTriggered: boolean, bounceCounter: number = 0) {
    let damage = baseDamage;
    damage *= getAbilityUpgradesDamageFactor(ABILITY_SNIPE_UPGRADE_FUNCTIONS, abilitySnipe, playerTriggered);
    damage *= getAbilityUpgradeTerrainBounceDamageFactor(abilitySnipe, bounceCounter);
    return damage;
}

export function getAbilitySnipeRange(abilitySnipe: AbilitySnipe) {
    let range = abilitySnipe.baseRange;
    range *= abilityUpgradeDamageAndRangeRangeFactor(abilitySnipe);
    return range;
}

export function createAbilityObjectSnipeInitial(startPosition: Position, faction: string, abilitySnipe: AbilitySnipe, castPosition: Position, triggeredByPlayer: boolean, preventBackwardsShot: boolean, game: Game) {
    castSnipeUpgradeFireLine(startPosition, faction, abilitySnipe, castPosition, triggeredByPlayer, game);
    if(!preventBackwardsShot) castSnipeBackwardsShot(startPosition, faction, abilitySnipe, castPosition, triggeredByPlayer, game);

    const direction = calculateDirection(startPosition, castPosition);
    const upgardeTerrainBounce: AbilityUpgradeTerrainBounce = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE];
    if (upgardeTerrainBounce && (triggeredByPlayer || upgardeTerrainBounce.upgradeSynergy)) {
        const range = getAbilitySnipeRange(abilitySnipe);
        createAndPushAbilityObjectSnipeTerrainBounceInit(startPosition, direction, abilitySnipe, faction, true, range, 0, triggeredByPlayer, game);
    } else {
        let abilityObjectSnipt = createAbilityObjectSnipe(
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
            game.state.time
        );
        game.state.abilityObjects.push(abilityObjectSnipt);
    }
}

export function getOptionsSnipeUpgrade(ability: Ability, upgradeName:string): UpgradeOptionAndProbability[] {
    let options = getAbilityUpgradeOptionDefault(ability, upgradeName);
    const upgrade: AbilityUpgrade & {upgradeSynergy:boolean} | undefined = ability.upgrades[upgradeName];
    const upgradeFunctions = ABILITY_SNIPE_UPGRADE_FUNCTIONS[upgradeName];
    options[0].option.displayLongText = upgradeFunctions.getLongExplainText!(ability, options[0].option as AbilityUpgradeOption);

    if (upgrade && !upgrade.upgradeSynergy) {
        options.push(getAbilityUpgradeOptionSynergy(ability.name, upgradeName, upgrade.level));
        options[1].option.displayLongText = upgradeFunctions.getLongExplainText!(ability, options[1].option as AbilityUpgradeOption);
    }

    return options;
}

function getAbilityUpgradeOptionSynergy(abilityName: string, upgradeName: string, probabilityFactor: number): UpgradeOptionAndProbability{
    const probability = 0.3 * probabilityFactor;
    let option: AbilityUpgradeOption = {
        displayText: `Synergy ${upgradeName}`,
        identifier: upgradeName,
        name: abilityName,
        type: "Ability",
        additionalInfo: "Synergy",
        boss: true,
    }    

    let optionAndProbability: UpgradeOptionAndProbability = {
        option: option,
        probability: probability,
    };
    return optionAndProbability;
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
        let splitAbilityObjectSnipe = createAbilityObjectSnipe(
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

function setAbilitySnipeToLevel(ability: Ability, level: number) {
    let abilitySnipe = ability as AbilitySnipe;
    abilitySnipe.baseDamage = level * 100;
    abilitySnipe.maxCharges = Math.min(2 + level, abilitySnipe.maxMagazineSize);
    abilitySnipe.baseRange = 800 + level * 10;
    abilitySnipe.shotFrequencyTimeDecreaseFaktor = 1 + level * 0.15;
}

function deleteAbilityObjectSnipe(abilityObject: AbilityObject, game: Game) {
    let abilityObjectSnipe = abilityObject as AbilityObjectSnipe;
    return abilityObjectSnipe.deleteTime <= game.state.time;
}

function castSnipe(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isInputdown: boolean, game: Game) {
    const abilitySnipe = ability as AbilitySnipe;
    const clientInfo: ClientInfo = getClientInfoByCharacterId(abilityOwner.id, game)!;
    abilitySnipe.shotNextAllowedTime = isInputdown;

    if (clientInfo.id === game.multiplayer.myClientId) game.multiplayer.autosendMousePosition.active = isInputdown;
    clientInfo.lastMousePosition = castPosition;
    if (abilitySnipe.currentCharges > 0 && abilitySnipe.shotNextAllowedTime && game.state.time >= abilitySnipe.nextAllowedShotTime) {
        createAbilityObjectSnipeInitialPlayerTriggered(abilityOwner, abilitySnipe, castPosition, game);
    }
}

function createAbilityObjectSnipeInitialPlayerTriggered(abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, castPosition: Position, game: Game) {
    castSnipeUpgradeMoreRifles(abilityOwner, abilityOwner.faction, abilitySnipe, castPosition, true, game);
    castSnipeAfterImage(abilityOwner, abilitySnipe, castPosition, true, game);
    createAbilityObjectSnipeInitial(abilityOwner, abilityOwner.faction, abilitySnipe, castPosition, true, false, game);
    abilitySnipe.currentCharges--;
    if (abilitySnipe.currentCharges === 0) {
        abilitySnipe.reloadTime = game.state.time + abilitySnipe.baseRechargeTime;
    }
    abilitySnipe.nextAllowedShotTime = game.state.time + getAbilitySnipeShotFrequency(abilitySnipe);

}

function tickAbilitySnipe(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilitySnipe = ability as AbilitySnipe;
    if (abilitySnipe.currentCharges === 0) {
        if (game.state.time >= abilitySnipe.reloadTime) {
            abilitySnipe.currentCharges = abilitySnipe.maxCharges;
            abilitySnipe.reloadTime = -1;
        }
    }
    if (abilitySnipe.currentCharges > 0 && abilitySnipe.shotNextAllowedTime && game.state.time >= abilitySnipe.nextAllowedShotTime) {
        let castPosition = getClientInfoByCharacterId(abilityOwner.id, game)!.lastMousePosition;
        createAbilityObjectSnipeInitialPlayerTriggered(abilityOwner, abilitySnipe, castPosition, game);
    }
    if (abilitySnipe?.upgrades[ABILITY_SNIPE_UPGRADE_STAY_STILL]) {
        tickAbilityUpgradeStayStill(abilitySnipe, abilityOwner, game);
    }
    if (abilitySnipe.shotNextAllowedTime) {
        const clientInfo: ClientInfo = getClientInfoByCharacterId(abilityOwner.id, game)!;
        abilitySnipe.lastSniperRiflePaintDirection = calculateDirection(abilityOwner, clientInfo.lastMousePosition);
    }
    tickAbilityUpgradeMoreRifles(abilitySnipe, abilityOwner, game);
    tickAbilityUpgradeAfterImage(abilitySnipe, abilityOwner, game);
}

function tickAbilityObjectSnipe(abilityObject: AbilityObject, game: Game) {
    let abilityObjectSnipe = abilityObject as AbilityObjectSnipe;
    if (!abilityObjectSnipe.damageCalcDone) {
        const endPos = calcNewPositionMovedInDirection(abilityObjectSnipe, abilityObjectSnipe.direction, abilityObjectSnipe.range);
        let characters: Character[] = getCharactersTouchingLine(game, abilityObjectSnipe, endPos, abilityObjectSnipe.size);
        let abilitySnipe = findAbilityById(abilityObject.abilityRefId!, game) as AbilitySnipe;
        for (let char of characters) {
            if (char.isDead) continue;
            abilityObjectSnipe.hitSomething = true;
            if(abilitySnipe){
                executeUpgradeExplodeOnDeath(abilitySnipe, abilityObject.faction, char, abilityObjectSnipe.triggeredByPlayer, game);
            }
            const damage = getAbilitySnipeDamage(abilitySnipe, abilityObjectSnipe.damage, abilityObjectSnipe.triggeredByPlayer, abilityObjectSnipe.bounceCounter);
            characterTakeDamage(char, damage, game, abilityObject.abilityRefId);
            if (abilityObjectSnipe.canSplitOnHit) abilityUpgradeSplitShotOnSnipeHit(char, abilitySnipe, abilityObjectSnipe, game);
        }
        if (abilitySnipe) abilityUpgradeNoMissChainOnObjectSnipeDamageDone(abilitySnipe, abilityObjectSnipe);
        abilityObjectSnipe.damageCalcDone = true;

        if (abilitySnipe?.upgrades[ABILITY_SNIPE_UPGRADE_TERRAIN_BOUNCE]) {
            createAndPushAbilityObjectSnipeTerrainBounceBounce(abilityObjectSnipe, abilitySnipe, game);
        }
    }
}

function createAbilityBossSnipeUpgradeOptions(ability: Ability): UpgradeOptionAndProbability[] {
    let upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_SNIPE_UPGRADE_FUNCTIONS, upgradeOptions, ability);
    return upgradeOptions;
}

function executeAbilitySnipeUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game){
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    upgradeAbility(ability, character, abilityUpgradeOption);
}

