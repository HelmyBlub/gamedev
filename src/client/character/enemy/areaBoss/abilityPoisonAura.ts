import { ABILITIES_FUNCTIONS, Ability, AbilityOwner } from "../../../ability/ability.js";
import { calculateDistance, getNextId } from "../../../game.js";
import { Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { characterTakeDamage, determineClosestCharacter, getPlayerCharacters } from "../../character.js";
import { Character } from "../../characterModel.js";

export const ABILITY_NAME_POISON_AURA = "PoisonAura";
export type AbilityPoisonAura = Ability & {
    lastCastTime?: number,
    nextDamageTick?: number,
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
        paintAbility: paintAbility,
        tickAbility: tickAbility,
        resetAbility: resetAbility,
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

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const poisonAura = ability as AbilityPoisonAura;
    if (poisonAura.lastCastTime === undefined) return;
    const paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition, game.UI.zoom);
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

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const poisonAura = ability as AbilityPoisonAura;
    if (poisonAura.lastCastTime === undefined) {
        const closest = determineClosestCharacter(abilityOwner, getPlayerCharacters(game.state.players));
        if (!closest.minDistanceCharacter || closest.minDistance > TRIGGER_DISTANCE) return;
        poisonAura.lastCastTime = game.state.time;
        poisonAura.nextDamageTick = game.state.time + DAMAGE_TICK_INTERVAL;
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

        const radius = getRadius(poisonAura, game.state.time);
        const playerChars = getPlayerCharacters(game.state.players);
        for (let player of playerChars) {
            const distance = calculateDistance(abilityOwner, player);
            if (distance < radius + player.width / 2) {
                const damage = player.maxHp * HP_PER_CENT_DAMAGE;
                characterTakeDamage(player, damage, game, undefined, ability.name);
            }
        }
    }
}

function getRadius(poisonAura: AbilityPoisonAura, time: number): number {
    if (poisonAura.lastCastTime === undefined) return 0;
    return ((time - poisonAura.lastCastTime) / GROW_DURATION) * MAX_RADIUS;
}
