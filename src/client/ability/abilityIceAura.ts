import { Character } from "../character/characterModel.js";
import { applyDebuff } from "../debuff/debuff.js";
import { createDebuffSlow } from "../debuff/debuffSlow.js";
import { getCameraPosition, getNextId } from "../game.js";
import { Position, Game, IdCounter, FACTION_ENEMY, FACTION_PLAYER } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, PaintOrderAbility, detectSomethingToCharacterHit, tickAbilityObjects } from "./ability.js";

type IceBaseProperties = {
    damage: number,
    radius: number,
    slowFactor: number,
    tickInterval: number,
    nextTickTime?: number,
}

export type AbilityIceAura = Ability & IceBaseProperties;

type AbilityObjectIceAura = AbilityObject & IceBaseProperties & { deleteTime: number };

export const ABILITY_NAME_ICE_AURA = "Ice Aura";

export function addAbilityIceAura() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_ICE_AURA] = {
        createAbility: createAbilityIceAura,
        deleteAbilityObject: deleteAbilityObject,
        paintAbility: paintAbility,
        paintAbilityObject: paintAbilityObject,
        setAbilityToLevel: setAbilityIceToLevel,
        setAbilityToBossLevel: setAbilityIceToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbility,
        tickAbilityObject: tickAbilityObject,
        resetAbility: resetAbility,
        canBeUsedByBosses: true,
    };
}

export function createAbilityIceAura(
    idCounter: IdCounter,
    playerInputBinding?: string,
    damage: number = 50,
    radius: number = 30,
    slowFactor: number = 1.5
): AbilityIceAura {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_ICE_AURA,
        damage: damage,
        radius: radius,
        slowFactor: slowFactor,
        passive: true,
        tickInterval: 250,
        upgrades: {},
    };
}

export function createAbilityObjectIceAura(
    damage: number,
    radius: number,
    slowFactor: number,
    faction: string,
    x: number,
    y: number,
    deleteTime: number,
    abilityIdRef: number,
): AbilityObjectIceAura {
    return {
        type: ABILITY_NAME_ICE_AURA,
        damage: damage,
        radius: radius,
        slowFactor: slowFactor,
        tickInterval: 250,
        color: "",
        faction: faction,
        x: x,
        y: y,
        abilityIdRef: abilityIdRef,
        deleteTime: deleteTime,
    };
}

function resetAbility(ability: Ability) {
    const ice = ability as AbilityIceAura;
    ice.nextTickTime = undefined;
}

function deleteAbilityObject(ability: AbilityObject, game: Game) {
    const ice = ability as AbilityObjectIceAura;
    if (ice.deleteTime < game.state.time) {
        return true;
    }
    return false;
}

function setAbilityIceToLevel(ability: Ability, level: number) {
    const abilityIce = ability as AbilityIceAura;
    abilityIce.damage = level * 100;
    abilityIce.radius = 30 + level * 10;
    abilityIce.slowFactor = 1 + 0.25 * level;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityIce = ability as AbilityIceAura;
    abilityIce.damage = level / 2 * damageFactor;
    abilityIce.radius = 30 + level * 3;
    abilityIce.slowFactor = 2;
}

function setAbilityIceToBossLevel(ability: Ability, level: number) {
    const abilityIce = ability as AbilityIceAura;
    abilityIce.damage = level * 10;
    abilityIce.radius = 60 + level * 12;
    abilityIce.slowFactor = 2;
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const ice = ability as AbilityIceAura as IceBaseProperties;
    paintIceAura(ctx, ice, abilityOwner, abilityOwner.faction, cameraPosition, game);
}

function paintAbilityObject(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    const ice = abilityObject as AbilityObjectIceAura as IceBaseProperties;
    if (paintOrder === "beforeCharacterPaint") {
        const cameraPosition = getCameraPosition(game);
        paintIceAura(ctx, ice, abilityObject, abilityObject.faction, cameraPosition, game);
    }
}

function paintIceAura(ctx: CanvasRenderingContext2D, ice: IceBaseProperties, position: Position, faction: string, cameraPosition: Position, game: Game) {
    const paintPos = getPointPaintPosition(ctx, position, cameraPosition, game.UI.zoom);
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = "white";
    if (faction === FACTION_ENEMY) {
        ctx.fillStyle = "darkgray";
        ctx.globalAlpha = 0.50;
    }
    if (faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;

    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        ice.radius, 0, 2 * Math.PI
    );
    ctx.fill();
    ctx.globalAlpha = 1;
}

function onHitEffect(target: Character, iceProperties: IceBaseProperties, game: Game): boolean {
    const debuffSlow = createDebuffSlow(iceProperties.slowFactor, 1000, game.state.time);
    applyDebuff(debuffSlow, target, game);
    return true;
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const ice = ability as AbilityIceAura as IceBaseProperties;
    tickIceAura(abilityOwner, abilityOwner.faction, ice, ability.id, game);
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    const ice = abilityObject as AbilityObjectIceAura as IceBaseProperties;
    tickIceAura(abilityObject, abilityObject.faction, ice, abilityObject.abilityIdRef!, game, abilityObject);
}

function tickIceAura(position: Position, faction: string, iceBaseProperties: IceBaseProperties, abilityIdRef: number, game: Game, abilityObject: AbilityObject | undefined = undefined) {
    if (iceBaseProperties.nextTickTime === undefined) iceBaseProperties.nextTickTime = game.state.time + iceBaseProperties.tickInterval;
    if (iceBaseProperties.nextTickTime <= game.state.time) {
        detectSomethingToCharacterHit(
            game.state.map,
            position,
            iceBaseProperties.radius * 2,
            faction,
            iceBaseProperties.damage,
            game.state.players,
            game.state.bossStuff.bosses,
            ABILITY_NAME_ICE_AURA,
            abilityIdRef,
            (c: Character) => onHitEffect(c, iceBaseProperties, game),
            game,
            abilityObject
        );

        iceBaseProperties.nextTickTime += iceBaseProperties.tickInterval;
        if (iceBaseProperties.nextTickTime <= game.state.time) {
            iceBaseProperties.nextTickTime = game.state.time + iceBaseProperties.tickInterval;
        }
    }
}
