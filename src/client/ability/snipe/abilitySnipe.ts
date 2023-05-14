import { characterTakeDamage, getCharactersTouchingLine } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { calculateDirection, getClientInfoByCharacterId, getNextId } from "../../game.js";
import { Position, Game, IdCounter, ClientInfo } from "../../gameModel.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, UpgradeOptionAbility, findAbilityById, levelingAbilityXpGain } from "../ability.js";
import { paintAbilityObjectSnipe, paintAbilitySnipeStatsUI, paintAbilitySnipeUI } from "./abilitySnipePaint.js";
import { abilityUpgradeNoMissChainDamageFactor, abilityUpgradeNoMissChainOnObjectSnipeDamageDone, getAbilityUpgradeNoMissChain } from "./abilitySnipeUpgradeChainHit.js";
import { abilityUpgradeDamageAndRangeDamageFactor, abilityUpgradeDamageAndRangeRangeFactor, getAbilityUpgradeDamageAndRange } from "./abilitySnipeUpgradeDamageAndRange.js";
import { abilityUpgradeOnSnipeHit, getAbilityUpgradeSplitShot } from "./abilitySnipeUpgradeSplitShot.js";
import { UPGRADE_SNIPE_ABILITY_STAY_STILL, abilityUpgradeStayStillDamageFactor, getAbilityUpgradeStayStill, tickAbilityUpgradeStayStill } from "./abilitySnipeUpgradeStayStill.js";
import { UPGRADE_SNIPE_ABILITY_TERRAIN_BOUNCE, abilityUpgradeTerrainBounceDamageFactor, createAndPushAbilityObjectSnipeTerrainBounceBounce, createAndPushAbilityObjectSnipeTerrainBounceInit, getAbilityUpgradeTerrainBounce } from "./abilitySnipeUpgradeTerrainBounce.js";

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
}

export const ABILITY_NAME_SNIPE = "Snipe";

export function addSnipeAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SNIPE] = {
        tickAbility: tickAbilitySnipe,
        tickAbilityObject: tickAbilityObjectSnipe,
        createAbiltiyUpgradeOptions: createAbilitySnipeUpgradeOptions,
        createAbiltiyBossUpgradeOptions: createAbilityBossSnipeUpgradeOptions,
        paintAbilityObject: paintAbilityObjectSnipe,
        paintAbilityUI: paintAbilitySnipeUI,
        activeAbilityCast: castSnipe,
        createAbility: createAbilitySnipe,
        deleteAbilityObject: deleteAbilityObjectSnipe,
        paintAbilityStatsUI: paintAbilitySnipeStatsUI,
        setAbilityToLevel: setAbilitySnipeToLevel,
        isPassive: false,
        notInheritable: true,
    };
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
    };
}

export function createAbilityObjectSnipeByAbility(abilitySnipe: AbilitySnipe, abilityOwner: AbilityOwner, startPos: Position, direction: number, game: Game): AbilityObjectSnipe {
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
    damage *= abilityUpgradeNoMissChainDamageFactor(abilitySnipe);
    damage *= abilityUpgradeDamageAndRangeDamageFactor(abilitySnipe);
    damage *= abilityUpgradeTerrainBounceDamageFactor(abilitySnipe, bounceCounter);
    damage *= abilityUpgradeStayStillDamageFactor(abilitySnipe);
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
        createAbilityObjectSnipeInitial(abilityOwner, abilitySnipe, castPosition, game);
    }
}

function createAbilityObjectSnipeInitial(abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, castPosition: Position, game: Game) {
    let direction = calculateDirection(abilityOwner, castPosition);
    if (abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_TERRAIN_BOUNCE]) {
        const range = getAbilitySnipeRange(abilitySnipe);
        createAndPushAbilityObjectSnipeTerrainBounceInit(abilityOwner, direction, abilitySnipe, abilityOwner.faction, undefined, range, 0, game);
    } else {
        let abilityObjectSnipt = createAbilityObjectSnipe(
            abilityOwner,
            abilitySnipe.id,
            abilitySnipe,
            abilityOwner.faction,
            direction,
            getAbilitySnipeRange(abilitySnipe),
            undefined,
            getAbilitySnipeDamage(abilitySnipe),
            undefined,
            game.state.time
        );
        game.state.abilityObjects.push(abilityObjectSnipt);
    }

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
            game.state.time
        );
        game.state.abilityObjects.push(splitAbilityObjectSnipe);
    }
}

export function calcAbilityObjectSnipeEndPosition(position: Position, direction: number, range: number): Position {
    return {
        x: position.x + Math.cos(direction) * range,
        y: position.y + Math.sin(direction) * range,
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
        createAbilityObjectSnipeInitial(abilityOwner, abilitySnipe, castPosition, game);
    }
    if (abilitySnipe?.upgrades[UPGRADE_SNIPE_ABILITY_STAY_STILL]) {
        tickAbilityUpgradeStayStill(abilitySnipe, abilityOwner, game);
    }
}

export function getShotFrequency(abilitySnipe: AbilitySnipe) {
    return Math.max(abilitySnipe.maxShootFrequency / abilitySnipe.shotFrequencyTimeDecreaseFaktor, 100);
}

function tickAbilityObjectSnipe(abilityObject: AbilityObject, game: Game) {
    let abilityObjectSnipe = abilityObject as AbilityObjectSnipe;
    if (!abilityObjectSnipe.damageCalcDone) {
        const endPos = calcAbilityObjectSnipeEndPosition(abilityObjectSnipe, abilityObjectSnipe.direction, abilityObjectSnipe.range);
        let characters: Character[] = getCharactersTouchingLine(game, abilityObjectSnipe, endPos, abilityObjectSnipe.size);
        let abilitySnipe = abilityObject.abilityRefId !== undefined ? findAbilityById(abilityObject.abilityRefId, game) as AbilitySnipe : undefined;
        for (let char of characters) {
            if (char.isDead) continue;
            abilityObjectSnipe.hitSomething = true;
            characterTakeDamage(char, abilityObjectSnipe.damage, game);
            if (!abilityObjectSnipe.preventSplitOnHit) abilityUpgradeOnSnipeHit(char, abilitySnipe, abilityObjectSnipe, game);

            if (char.isDead) {
                if (abilityObject.leveling && abilityObject.abilityRefId !== undefined) {
                    if (abilitySnipe) {
                        levelingAbilityXpGain(abilitySnipe, char.experienceWorth);
                    }
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

function createAbilitySnipeUpgradeOptions(ability: Ability): UpgradeOptionAbility[] {
    let upgradeOptions: UpgradeOptionAbility[] = [];
    upgradeOptions.push({
        name: "Snipe Damage+50", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            as.baseDamage += 50;
        }
    });

    return upgradeOptions;
}

function createAbilityBossSnipeUpgradeOptions(ability: Ability): UpgradeOptionAbility[] {
    let upgradeOptions: UpgradeOptionAbility[] = [];
    let abilitySnipe = ability as AbilitySnipe;
    upgradeOptions.push(getAbilityUpgradeDamageAndRange());
    upgradeOptions.push(getAbilityUpgradeNoMissChain());
    upgradeOptions.push(getAbilityUpgradeSplitShot());
    upgradeOptions.push(getAbilityUpgradeStayStill());
    if (!abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_TERRAIN_BOUNCE]) {
        upgradeOptions.push(getAbilityUpgradeTerrainBounce());
    }
    return upgradeOptions;
}

