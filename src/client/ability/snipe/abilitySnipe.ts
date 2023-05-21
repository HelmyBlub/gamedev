import { characterTakeDamage, getCharactersTouchingLine } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { calcNewPositionMovedInDirection, calculateDirection, getClientInfoByCharacterId, getNextId } from "../../game.js";
import { Position, Game, IdCounter, ClientInfo } from "../../gameModel.js";
import { GAME_IMAGES } from "../../imageLoad.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, AbilityUpgradeOption, findAbilityById, levelingAbilityXpGain } from "../ability.js";
import { AbilityUpgradesFunctions, getAbilityUpgradesDamageFactor, pushAbilityUpgradesOptions } from "../abilityUpgrade.js";
import { paintAbilityObjectSnipe, paintAbilitySnipe, paintAbilitySnipeStatsUI, paintAbilitySnipeUI } from "./abilitySnipePaint.js";
import { abilityUpgradeNoMissChainOnObjectSnipeDamageDone, addAbilitySnipeUpgradeNoMissChain } from "./abilitySnipeUpgradeChainHit.js";
import { abilityUpgradeDamageAndRangeRangeFactor, addAbilitySnipeUpgradeDamageAndRange } from "./abilitySnipeUpgradeDamageAndRange.js";
import { addAbilitySnipeUpgradeFireLine, castSnipeFireLine as castSnipeUpgradeFireLine } from "./abilitySnipeUpgradeFireLine.js";
import { addAbilitySnipeUpgradeMoreRifles, castSnipeMoreRifles as castSnipeUpgradeMoreRifles, tickAbilityUpgradeMoreRifles } from "./abilitySnipeUpgradeMoreRifle.js";
import { abilityUpgradeOnSnipeHit, addAbilitySnipeUpgradeSplitShot } from "./abilitySnipeUpgradeSplitShot.js";
import { UPGRADE_SNIPE_ABILITY_STAY_STILL, addAbilitySnipeUpgradeStayStill, tickAbilityUpgradeStayStill } from "./abilitySnipeUpgradeStayStill.js";
import { UPGRADE_SNIPE_ABILITY_TERRAIN_BOUNCE, addAbilitySnipeUpgradeTerrainBounce, createAndPushAbilityObjectSnipeTerrainBounceBounce, createAndPushAbilityObjectSnipeTerrainBounceInit, getAbilityUpgradeTerrainBounceDamageFactor } from "./abilitySnipeUpgradeTerrainBounce.js";

export type AbilityObjectSnipe = AbilityObject & {
    damage: number,
    range: number,
    direction: number,
    damageCalcDone: boolean,
    deleteTime: number,
    remainingRange?: number,
    preventSplitOnHit?: boolean,
    bounceCounter?: number,
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
}

export const ABILITY_NAME_SNIPE = "Snipe";
export const ABILITY_SNIPE_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};

GAME_IMAGES[ABILITY_NAME_SNIPE] = {
    imagePath: "/images/sniperRifle.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};

export function addSnipeAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SNIPE] = {
        tickAbility: tickAbilitySnipe,
        tickAbilityObject: tickAbilityObjectSnipe,
        createAbilityUpgradeOptions: createAbilitySnipeUpgradeOptions,
        createAbilityBossUpgradeOptions: createAbilityBossSnipeUpgradeOptions,
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

    addAbilitySnipeUpgradeNoMissChain();
    addAbilitySnipeUpgradeDamageAndRange();
    addAbilitySnipeUpgradeMoreRifles();
    addAbilitySnipeUpgradeSplitShot();
    addAbilitySnipeUpgradeStayStill();
    addAbilitySnipeUpgradeTerrainBounce();
    addAbilitySnipeUpgradeFireLine();
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
        paintFadeDuration: 1000,
        upgrades: {},
        maxShootFrequency: 1000,
        shotNextAllowedTime: false,
        nextAllowedShotTime: 0,
        lastSniperRiflePaintDirection: 0,
    };
}

export function createAbilityObjectSnipeByAbility(abilitySnipe: AbilitySnipe, abilityOwner: AbilityOwner, startPos: Position, direction: number, triggeredByPlayer: boolean, game: Game): AbilityObjectSnipe {
    let abilityObjectSnipe: AbilityObjectSnipe = {
        type: ABILITY_NAME_SNIPE,
        size: abilitySnipe.size,
        color: "",
        x: startPos.x,
        y: startPos.y,
        damage: getAbilitySnipeDamage(abilitySnipe),
        faction: abilityOwner.faction,
        direction: direction,
        range: getAbilitySnipeRange(abilitySnipe),
        damageCalcDone: false,
        deleteTime: game.state.time + abilitySnipe.paintFadeDuration,
        leveling: abilitySnipe.leveling ? true : undefined,
        abilityRefId: abilitySnipe.id,
        triggeredByPlayer: triggeredByPlayer,
    }
    return abilityObjectSnipe;
}

export function createAbilityObjectSnipe(
    startPos: Position,
    abilityRefId: number | undefined,
    abilitySnipe: AbilitySnipe,
    faction: string,
    direction: number,
    range: number,
    preventSplitOnHit: boolean | undefined,
    damage: number,
    hitSomething: boolean | undefined,
    triggeredByPlayer: boolean, 
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
        leveling: abilitySnipe.leveling ? true : undefined,
        abilityRefId: abilityRefId,
        preventSplitOnHit: preventSplitOnHit,
        hitSomething: hitSomething,
        triggeredByPlayer: triggeredByPlayer,
    }

    return abilityObjectSnipe;
}

function setAbilitySnipeToLevel(ability: Ability, level: number) {
    let abilitySnipe = ability as AbilitySnipe;
    abilitySnipe.baseDamage = level * 100;
    abilitySnipe.maxCharges = 2 + level;
    abilitySnipe.baseRange = 800 + level * 10;
    abilitySnipe.shotFrequencyTimeDecreaseFaktor = 1 + level * 0.15;
}

export function getAbilitySnipeDamage(abilitySnipe: AbilitySnipe, bounceCounter: number = 0) {
    let damage = abilitySnipe.baseDamage;
    damage *= getAbilityUpgradesDamageFactor(ABILITY_SNIPE_UPGRADE_FUNCTIONS, abilitySnipe);
    damage *= getAbilityUpgradeTerrainBounceDamageFactor(abilitySnipe, bounceCounter);
    return damage;
}

export function getAbilitySnipeRange(abilitySnipe: AbilitySnipe) {
    let range = abilitySnipe.baseRange;
    range *= abilityUpgradeDamageAndRangeRangeFactor(abilitySnipe);
    return range;
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

export function createAbilityObjectSnipeInitial(startPosition: Position, faction: string, abilitySnipe: AbilitySnipe, castPosition: Position, triggeredByPlayer: boolean, game: Game) {
    let direction = calculateDirection(startPosition, castPosition);
    if (abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_TERRAIN_BOUNCE]) {
        const range = getAbilitySnipeRange(abilitySnipe);
        createAndPushAbilityObjectSnipeTerrainBounceInit(startPosition, direction, abilitySnipe, faction, undefined, range, 0, triggeredByPlayer, game);
    } else {
        let abilityObjectSnipt = createAbilityObjectSnipe(
            startPosition,
            abilitySnipe.id,
            abilitySnipe,
            faction,
            direction,
            getAbilitySnipeRange(abilitySnipe),
            undefined,
            getAbilitySnipeDamage(abilitySnipe),
            undefined,
            triggeredByPlayer,
            game.state.time
        );
        game.state.abilityObjects.push(abilityObjectSnipt);
    }
}

function createAbilityObjectSnipeInitialPlayerTriggered(abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, castPosition: Position, game: Game) {
    castSnipeUpgradeFireLine(abilityOwner, abilitySnipe, castPosition, game);
    castSnipeUpgradeMoreRifles(abilityOwner, abilitySnipe, castPosition, game);
    createAbilityObjectSnipeInitial(abilityOwner, abilityOwner.faction, abilitySnipe, castPosition, true, game);
    abilitySnipe.currentCharges--;
    if (abilitySnipe.currentCharges === 0) {
        abilitySnipe.reloadTime = game.state.time + abilitySnipe.baseRechargeTime;
    }
    abilitySnipe.nextAllowedShotTime = game.state.time + getShotFrequency(abilitySnipe);

}

export function createAbilityObjectSnipeBranch(abilitySnipe: AbilitySnipe, abilityObjectSnipe: AbilityObjectSnipe, startPosition: Position, direction: number, range: number, game: Game) {
    if (abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_TERRAIN_BOUNCE]) {
        createAndPushAbilityObjectSnipeTerrainBounceInit(
            startPosition,
            direction,
            abilitySnipe,
            abilityObjectSnipe.faction,
            true,
            range,
            abilityObjectSnipe.bounceCounter!,
            abilityObjectSnipe.triggeredByPlayer,
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
            true,
            getAbilitySnipeDamage(abilitySnipe),
            true,
            abilityObjectSnipe.triggeredByPlayer,
            game.state.time
        );
        game.state.abilityObjects.push(splitAbilityObjectSnipe);
    }
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
    if (abilitySnipe?.upgrades[UPGRADE_SNIPE_ABILITY_STAY_STILL]) {
        tickAbilityUpgradeStayStill(abilitySnipe, abilityOwner, game);
    }
    if (abilitySnipe.shotNextAllowedTime) {
        const clientInfo: ClientInfo = getClientInfoByCharacterId(abilityOwner.id, game)!;
        abilitySnipe.lastSniperRiflePaintDirection = calculateDirection(abilityOwner, clientInfo.lastMousePosition);
    }
    tickAbilityUpgradeMoreRifles(abilitySnipe, abilityOwner, game);
}

export function getShotFrequency(abilitySnipe: AbilitySnipe) {
    return Math.max(abilitySnipe.maxShootFrequency / abilitySnipe.shotFrequencyTimeDecreaseFaktor, 100);
}

function tickAbilityObjectSnipe(abilityObject: AbilityObject, game: Game) {
    let abilityObjectSnipe = abilityObject as AbilityObjectSnipe;
    if (!abilityObjectSnipe.damageCalcDone) {
        const endPos = calcNewPositionMovedInDirection(abilityObjectSnipe, abilityObjectSnipe.direction, abilityObjectSnipe.range);
        let characters: Character[] = getCharactersTouchingLine(game, abilityObjectSnipe, endPos, abilityObjectSnipe.size);
        let abilitySnipe = abilityObject.abilityRefId !== undefined ? findAbilityById(abilityObject.abilityRefId, game) as AbilitySnipe : undefined;
        for (let char of characters) {
            if (char.isDead) continue;
            abilityObjectSnipe.hitSomething = true;
            characterTakeDamage(char, abilityObjectSnipe.damage, game);
            if (!abilityObjectSnipe.preventSplitOnHit) abilityUpgradeOnSnipeHit(char, abilitySnipe, abilityObjectSnipe, game);

            if (abilityObject.leveling && abilityObject.abilityRefId !== undefined) {
                if (abilitySnipe) {
                    levelingAbilityXpGain(abilitySnipe, char.experienceWorth);
                }
            }
        }
        if (abilitySnipe) abilityUpgradeNoMissChainOnObjectSnipeDamageDone(abilitySnipe, abilityObjectSnipe);
        abilityObjectSnipe.damageCalcDone = true;

        if (abilitySnipe?.upgrades[UPGRADE_SNIPE_ABILITY_TERRAIN_BOUNCE]) {
            createAndPushAbilityObjectSnipeTerrainBounceBounce(abilityObjectSnipe, abilitySnipe, game);
        }
    }
}

function createAbilitySnipeUpgradeOptions(ability: Ability): AbilityUpgradeOption[] {
    let upgradeOptions: AbilityUpgradeOption[] = [];
    upgradeOptions.push({
        name: "Snipe Damage+50", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            as.baseDamage += 50;
        }
    });

    return upgradeOptions;
}

function createAbilityBossSnipeUpgradeOptions(ability: Ability): AbilityUpgradeOption[] {
    let upgradeOptions: AbilityUpgradeOption[] = [];
    let abilitySnipe = ability as AbilitySnipe;

    pushAbilityUpgradesOptions(ABILITY_SNIPE_UPGRADE_FUNCTIONS, upgradeOptions, ability);
    return upgradeOptions;
}

