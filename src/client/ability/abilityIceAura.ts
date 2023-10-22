import { Character } from "../character/characterModel.js";
import { applyDebuff } from "../debuff/debuff.js";
import { createDebuffSlow } from "../debuff/debuffSlow.js";
import { getNextId } from "../game.js";
import { Position, Game, IdCounter, FACTION_ENEMY } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, detectSomethingToCharacterHit } from "./ability.js";

type AbilityIce = Ability & {
    damage: number,
    radius: number,
    slowFactor: number,
    tickInterval: number,
    nextTickTime?: number,
}
export const ABILITY_NAME_ICE_AURA = "Ice Aura";

export function addAbilityIceAura() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_ICE_AURA] = {
        createAbility: createAbilityIce,
        paintAbility: paintAbilityIce,
        setAbilityToLevel: setAbilityIceToLevel,
        setAbilityToBossLevel: setAbilityIceToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbilityIce,
        canBeUsedByBosses: true,
    };
}

export function createAbilityIce(
    idCounter: IdCounter,
    playerInputBinding?: string,
    damage: number = 50,
    radius: number = 30,
    slowFactor: number = 1.5
): AbilityIce {
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

function setAbilityIceToLevel(ability: Ability, level: number) {
    const abilityIce = ability as AbilityIce;
    abilityIce.damage = level * 100;
    abilityIce.radius = 30 + level * 10;
    abilityIce.slowFactor = 1 + 0.25 * level;
}
function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityIce = ability as AbilityIce;
    abilityIce.damage = level / 2 * damageFactor;
    abilityIce.radius = 30 + level * 3;
    abilityIce.slowFactor = 2;
}

function setAbilityIceToBossLevel(ability: Ability, level: number) {
    const abilityIce = ability as AbilityIce;
    abilityIce.damage = level * 10;
    abilityIce.radius = 60 + level * 12;
    abilityIce.slowFactor = 2;
}

function paintAbilityIce(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abilityIce = ability as AbilityIce;
    const paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = "white";
    if(abilityOwner.faction === FACTION_ENEMY){
        ctx.fillStyle = "darkgray";
        ctx.globalAlpha = 0.50;
    }
    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        abilityIce.radius, 0, 2 * Math.PI
    );
    ctx.fill();
    ctx.globalAlpha = 1;
}

function onHitEffect(target: Character, abilityIce: AbilityIce, game: Game): boolean {
    const debuffSlow = createDebuffSlow(abilityIce.slowFactor, 1000, game.state.time);
    applyDebuff(debuffSlow, target, game);
    return true;
}

function tickAbilityIce(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityIce = ability as AbilityIce;

    if (abilityIce.nextTickTime === undefined) abilityIce.nextTickTime = game.state.time + abilityIce.tickInterval;
    if (abilityIce.nextTickTime <= game.state.time) {
        detectSomethingToCharacterHit(
            game.state.map,
            abilityOwner,
            abilityIce.radius * 2,
            abilityOwner.faction,
            abilityIce.damage,
            game.state.players,
            game.state.bossStuff.bosses,
            ability.id,
            (c: Character) => onHitEffect(c, abilityIce, game),
            game
        );

        abilityIce.nextTickTime += abilityIce.tickInterval;
        if (abilityIce.nextTickTime <= game.state.time) {
            abilityIce.nextTickTime = game.state.time + abilityIce.tickInterval;
        }
    }
}
