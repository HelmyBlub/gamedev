import { Character } from "../character/characterModel.js";
import { applyDebuff } from "../debuff/debuff.js";
import { createDebuffSlow } from "../debuff/debuffSlow.js";
import { getNextId } from "../game.js";
import { Position, Game, IdCounter } from "../gameModel.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, UpgradeOptionAbility, detectSomethingToCharacterHit } from "./ability.js";

type AbilityIce = Ability & {
    damage: number,
    radius: number,
    slowFactor: number,
    tickInterval: number,
    nextTickTime?: number,
}
const ABILITY_NAME_ICE = "Ice";

export function addIceAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_ICE] = {
        tickAbility: tickAbilityIce,
        createAbiltiyUpgradeOptions: createAbilityIceUpgradeOptions,
        paintAbility: paintAbilityIce,
        setAbilityToLevel: setAbilityIceToLevel,
        createAbility: createAbilityIce,
        setAbilityToBossLevel: setAbilityIceToBossLevel,
        isPassive: true,
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
        name: ABILITY_NAME_ICE,
        damage: damage,
        radius: radius,
        slowFactor: slowFactor,
        passive: true,
        tickInterval: 250,
    };
}

function setAbilityIceToLevel(ability: Ability, level: number){
    let abilityIce = ability as AbilityIce;
    abilityIce.damage = level * 100;
    abilityIce.radius = 30 + level * 10;
    abilityIce.slowFactor = 1 + 0.25 * level;
}

function setAbilityIceToBossLevel(ability: Ability, level: number){
    let abilityIce = ability as AbilityIce;
    abilityIce.damage = level * 10;
    abilityIce.radius = 60 + level * 12;
    abilityIce.slowFactor = 2;
}

function paintAbilityIce(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    let abilityIce = ability as AbilityIce;
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let paintX = Math.floor(abilityOwner.x - cameraPosition.x + centerX);
    let paintY = Math.floor(abilityOwner.y - cameraPosition.y + centerY);

    ctx.globalAlpha = 0.30;
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(
        paintX,
        paintY,
        abilityIce.radius, 0, 2 * Math.PI
    );
    ctx.fill();
    ctx.globalAlpha = 1;
}

function onHitEffect(target: Character, abilityIce: AbilityIce, game: Game): boolean{
    let debuffSlow = createDebuffSlow(abilityIce.slowFactor, 1000, game.state.time);
    applyDebuff(debuffSlow, target, game);
    return true;
}

function tickAbilityIce(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilityIce = ability as AbilityIce;

    if(abilityIce.nextTickTime === undefined) abilityIce.nextTickTime = game.state.time + abilityIce.tickInterval;
    if(abilityIce.nextTickTime <= game.state.time){
        detectSomethingToCharacterHit(
            game.state.map,
            abilityOwner,
            abilityIce.radius*2,
            abilityOwner.faction,
            abilityIce.damage,
            game.state.players,
            game.state.bossStuff.bosses,
            (c: Character) => onHitEffect(c, abilityIce, game),
            game
        );

        abilityIce.nextTickTime += abilityIce.tickInterval;
        if(abilityIce.nextTickTime <= game.state.time){
            abilityIce.nextTickTime = game.state.time + abilityIce.tickInterval;
        }
    }
}

function createAbilityIceUpgradeOptions(): UpgradeOptionAbility[] {
    let upgradeOptions: UpgradeOptionAbility[] = [];
    upgradeOptions.push({
        name: "IceDamage+50", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilityIce;
            as.damage += 50;
        }
    });
    upgradeOptions.push({
        name: "IceRadius+", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilityIce;
            as.radius += 10;
        }
    });

    return upgradeOptions;
}
