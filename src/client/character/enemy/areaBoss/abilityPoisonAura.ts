import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, PaintOrderAbility } from "../../../ability/ability.js";
import { calculateDistance, getCameraPosition, getNextId } from "../../../game.js";
import { Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { characterTakeDamage, determineClosestCharacter, getPlayerCharacters } from "../../character.js";
import { Character } from "../../characterModel.js";

export const ABILITY_NAME_POISON_AURA = "PoisonAura";
export type AbilityPoisonAura = Ability & {
    lastCastTime?: number,
    nextDamageTick?: number,
}

export type AbilityObjectPoisonAura = AbilityObject & {
    nextDamageTick: number,
    deleteTime: number,
}

const MAX_RADIUS = 250;
const TRIGGER_DISTANCE = 50;
const GROW_DURATION = 5000;
const HP_COST = 1;
const HP_PER_CENT_DAMAGE = 0.05;
const DAMAGE_TICK_INTERVAL = 250;

export function addAbilityPoisonAura() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_POISON_AURA] = {
        createAbility: createAbilityPoisonAura,
        deleteAbilityObject: deleteObject,
        paintAbilityObject: paintAbilityObject,
        resetAbility: resetAbility,
        tickAbility: tickAbility,
        tickAbilityObject: tickAbilityObject,
        canBeUsedByBosses: true,
    };
}

export function createAbilityPoisonAura(
    idCounter: IdCounter,
): AbilityPoisonAura {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_POISON_AURA,
        passive: true,
        upgrades: {},
    };
}

function deleteObject(abilityObject: AbilityObject, game: Game): boolean {
    const poisonAura = abilityObject as AbilityObjectPoisonAura;
    return poisonAura.deleteTime < game.state.time;
}

function paintAbilityObject(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    const poisonAura = abilityObject as AbilityObjectPoisonAura;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "black";
    ctx.beginPath();
    const radius = getRadius(poisonAura, game.state.time);
    ctx.arc(paintPos.x, paintPos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

function resetAbility(ability: Ability) {
    const poisonAura = ability as AbilityPoisonAura;
    poisonAura.lastCastTime = undefined;
    poisonAura.nextDamageTick = undefined;
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    const poisonAura = abilityObject as AbilityObjectPoisonAura;
    if (poisonAura.nextDamageTick > game.state.time) return;
    poisonAura.nextDamageTick += DAMAGE_TICK_INTERVAL;

    const radius = getRadius(poisonAura, game.state.time);
    const playerChars = getPlayerCharacters(game.state.players);
    for (let player of playerChars) {
        const distance = calculateDistance(abilityObject, player);
        if (distance < radius + player.width / 2) {
            const damage = player.maxHp * HP_PER_CENT_DAMAGE;
            characterTakeDamage(player, damage, game, undefined, abilityObject.type);
        }
    }
}

function createObjectPoisonAura(abilityOwner: AbilityOwner, abilityIdRef: number, gameTime: number): AbilityObjectPoisonAura {
    return {
        type: ABILITY_NAME_POISON_AURA,
        x: abilityOwner.x,
        y: abilityOwner.y,
        color: "black",
        damage: 0,
        faction: abilityOwner.faction,
        deleteTime: gameTime + GROW_DURATION,
        nextDamageTick: gameTime + DAMAGE_TICK_INTERVAL,
        abilityIdRef: abilityIdRef,
    }
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const poisonAura = ability as AbilityPoisonAura;
    if (poisonAura.lastCastTime === undefined) {
        const closest = determineClosestCharacter(abilityOwner, getPlayerCharacters(game.state.players));
        if (!closest.minDistanceCharacter || closest.minDistance > TRIGGER_DISTANCE) return;
        poisonAura.lastCastTime = game.state.time;
        poisonAura.nextDamageTick = game.state.time + DAMAGE_TICK_INTERVAL;
        const poisonAuraObject = createObjectPoisonAura(abilityOwner, ability.id, game.state.time);
        game.state.abilityObjects.push(poisonAuraObject);
    } else {
        if (poisonAura.nextDamageTick! > game.state.time) return;
        poisonAura.nextDamageTick! += DAMAGE_TICK_INTERVAL;
        if (poisonAura.lastCastTime + GROW_DURATION < game.state.time) {
            resetAbility(poisonAura);
            return;
        }

        const owner = abilityOwner as Character;
        owner.isDamageImmune = false;
        characterTakeDamage(owner, HP_COST, game, undefined, ability.name);
        owner.isDamageImmune = true;
    }
}

function getRadius(poisonAura: AbilityObjectPoisonAura, time: number): number {
    return ((time - poisonAura.deleteTime + GROW_DURATION) / GROW_DURATION) * MAX_RADIUS;
}
