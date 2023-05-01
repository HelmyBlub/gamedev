import { characterTakeDamage, findMyCharacter, getCharactersTouchingLine } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { handleCommand } from "../../commands.js";
import { calculateDirection, getCameraPosition, getNextId } from "../../game.js";
import { Position, Game, IdCounter } from "../../gameModel.js";
import { ABILITY_ACTIONS } from "../../playerInput.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, UpgradeOptionAbility, findAbilityById, levelingAbilityXpGain } from "../ability.js";
import { paintAbilityObjectSnipe, paintAbilitySnipeStatsUI, paintAbilitySnipeUI } from "./abilitySnipePaint.js";
import { abilityUpgradeNoMissChainDamageFactor, abilityUpgradeNoMissChainOnObjectSnipeDamageDone, getAbilityUpgradeNoMissChain } from "./abilitySnipeUpgradeChainHit.js";
import { abilityUpgradeDamageAndRangeDamageFactor, abilityUpgradeDamageAndRangeRangeFactor, getAbilityUpgradeDamageAndRange } from "./abilitySnipeUpgradeDamageAndRange.js";
import { abilityUpgradeOnSnipeHit, getAbilityUpgradeSplitShot } from "./abilitySnipeUpgradeSplitShot.js";

export type AbilityObjectSnipe = AbilityObject & {
    damage: number,
    range: number,
    direction: number,
    damageDone: boolean,
    deleteTime: number,
    splitOnHit?: boolean,
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
    lastMousePosition?: Position,
    upgrades: {
        [key: string]: any,
    }
}

const ABILITY_NAME_SNIPE = "Snipe";

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

export function createAbilityObjectSnipe(startPos: Position, abilityRefId: number | undefined, abilitySnipe: AbilitySnipe, faction: string, direction: number, gameTime: number): AbilityObjectSnipe {
    return {
        type: ABILITY_NAME_SNIPE,
        size: abilitySnipe.size,
        color: "",
        x: startPos.x,
        y: startPos.y,
        damage: getAbilitySnipeDamage(abilitySnipe),
        faction: faction,
        direction: direction,
        range: getAbilitySnipeRange(abilitySnipe),
        damageDone: false,
        deleteTime: gameTime + abilitySnipe.paintFadeDuration,
        leveling: abilitySnipe.leveling ? true : undefined,
        abilityRefId: abilityRefId,
    }
}

function setAbilitySnipeToLevel(ability: Ability, level: number) {
    let abilitySnipe = ability as AbilitySnipe;
    abilitySnipe.baseDamage = level * 100;
    abilitySnipe.maxCharges = 2 + level;
    abilitySnipe.baseRange = 800 + level * 50;
    abilitySnipe.shotFrequencyTimeDecreaseFaktor = 1 + level * 0.15;
}

export function getAbilitySnipeDamage(abilitySnipe: AbilitySnipe) {
    let damage = abilitySnipe.baseDamage;
    damage *= abilityUpgradeNoMissChainDamageFactor(abilitySnipe);
    damage *= abilityUpgradeDamageAndRangeDamageFactor(abilitySnipe);
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

function castSnipe(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) {
    let abilitySnipe = ability as AbilitySnipe;

    abilitySnipe.shotNextAllowedTime = isKeydown;
    abilitySnipe.lastMousePosition = castPosition;
    if(abilitySnipe.currentCharges > 0 && abilitySnipe.shotNextAllowedTime && game.state.time >= abilitySnipe.nextAllowedShotTime){
        createAndPushAbilityObjectSnipe(abilityOwner, abilitySnipe, game);
        abilitySnipe.nextAllowedShotTime = game.state.time + getShotFrequency(abilitySnipe);
    }    
}

function createAndPushAbilityObjectSnipe(abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, game: Game){
    let direction = calculateDirection(abilityOwner, abilitySnipe.lastMousePosition!);
    let abilityObjectSnipt = createAbilityObjectSnipe(abilityOwner, abilitySnipe.id, abilitySnipe, abilityOwner.faction, direction, game.state.time);
    game.state.abilityObjects.push(abilityObjectSnipt);
    abilitySnipe.currentCharges--;
    if (abilitySnipe.currentCharges === 0) {
        abilitySnipe.reloadTime = game.state.time + abilitySnipe.baseRechargeTime;
    }
}

export function calcAbilityObjectSnipeEndPosition(snipe: AbilityObjectSnipe): Position {
    return {
        x: snipe.x + Math.cos(snipe.direction) * snipe.range,
        y: snipe.y + Math.sin(snipe.direction) * snipe.range,
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
    if(abilitySnipe.currentCharges > 0 && abilitySnipe.shotNextAllowedTime && game.state.time >= abilitySnipe.nextAllowedShotTime){
        sendToUpdateCastPosition(abilityOwner, game);
    }
}

function sendToUpdateCastPosition(abilityOwner: AbilityOwner, game: Game){
    let myCharacter = findMyCharacter(game);
    if(!myCharacter || abilityOwner.id !== myCharacter.id) return;
    let cameraPosition = getCameraPosition(game);
    let castPosition = {
        x: game.mouseRelativeCanvasPosition.x - game.canvasElement!.width / 2 + cameraPosition.x,
        y: game.mouseRelativeCanvasPosition.y - game.canvasElement!.height / 2 + cameraPosition.y
    }            

    //TODO tage correct ability action not just 0
    handleCommand(game, {
        command: "playerInput",
        clientId: game.multiplayer.myClientId,
        data: { action: ABILITY_ACTIONS[0], isKeydown: true, castPosition: castPosition },
    });
}

export function getShotFrequency(abilitySnipe: AbilitySnipe){
    return Math.max(abilitySnipe.maxShootFrequency / abilitySnipe.shotFrequencyTimeDecreaseFaktor, 100);
}

function tickAbilityObjectSnipe(abilityObject: AbilityObject, game: Game) {
    let abilityObjectSnipe = abilityObject as AbilityObjectSnipe;
    if (!abilityObjectSnipe.damageDone) {
        const endPos = calcAbilityObjectSnipeEndPosition(abilityObjectSnipe);
        let characters: Character[] = getCharactersTouchingLine(game, abilityObjectSnipe, endPos, abilityObjectSnipe.size);
        let abilitySnipe = abilityObject.abilityRefId !== undefined ? findAbilityById(abilityObject.abilityRefId, game) as AbilitySnipe : undefined;
        let hitSomething: boolean = false;
        for (let char of characters) {
            if (char.isDead) continue;
            hitSomething = true;
            characterTakeDamage(char, abilityObjectSnipe.damage, game);
            abilityUpgradeOnSnipeHit(char, abilitySnipe, abilityObjectSnipe, game);

            if (char.isDead) {
                if (abilityObject.leveling && abilityObject.abilityRefId !== undefined) {
                    if (abilitySnipe) {
                        levelingAbilityXpGain(abilitySnipe, char.experienceWorth);
                    }
                }
            }
        }
        if (abilitySnipe) abilityUpgradeNoMissChainOnObjectSnipeDamageDone(abilitySnipe, hitSomething);
        abilityObjectSnipe.damageDone = true;
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
    upgradeOptions.push(getAbilityUpgradeDamageAndRange());
    upgradeOptions.push(getAbilityUpgradeNoMissChain());
    upgradeOptions.push(getAbilityUpgradeSplitShot());

    return upgradeOptions;
}

