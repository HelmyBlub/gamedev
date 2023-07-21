import { getPlayerCharacters, characterTakeDamage } from "../character/character.js";
import { calculateDistance, getCameraPosition, getNextId } from "../game.js";
import { Game, IdCounter } from "../gameModel.js";
import { GameMap } from "../map/map.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, PaintOrderAbility, AbilityObjectCircle } from "./ability.js";

export type AbilityDeathCircle = Ability & {
    damage: number,
    radius: number,
    growSpeed: number,
}

export type AbilityObjectDeathCircle = AbilityObjectCircle & {
    growSpeed: number,
    tickInterval: number,
    nextTickTime?: number,
}

const ABILITY_NAME_DEATH_CIRCLE = "DeathCircle";
export function addAbilityDeathCircle() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_DEATH_CIRCLE] = {
        tickAbility: tickAbilityDeathCircle,
        tickAbilityObject: tickAbilityObjectDeathCircle,
        deleteAbilityObject: deleteObjectDeathCircle,
        createAbility: createAbilityDeathCircle,
        paintAbilityObject: paintAbilityObjectDeathCircle,
        isPassive: true,
        notInheritable: true,
    };
}
export function createAbilityDeathCircle(idCounter: IdCounter): AbilityDeathCircle {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_DEATH_CIRCLE,
        damage: 10,
        passive: true,
        growSpeed: 1,
        radius: 0,
        upgrades: {},
    }
}

export function createObjectDeathCircle(map: GameMap): AbilityObjectDeathCircle {
    let mapCenter = (map.tileSize * map.chunkLength) / 2;
    return {
        type: ABILITY_NAME_DEATH_CIRCLE,
        radius: 0,
        color: "black",
        damage: 0.1,
        faction: "enemy",
        growSpeed: 0.25,
        x: mapCenter,
        y: mapCenter,
        tickInterval: 250,
    }
}

function deleteObjectDeathCircle(abilityObject: AbilityObject, game: Game): boolean {
    return false;
}

function tickAbilityDeathCircle(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
}

function tickAbilityObjectDeathCircle(abilityObject: AbilityObject, game: Game) {
    let abilityObjectDeathCircle = abilityObject as AbilityObjectDeathCircle;
    abilityObjectDeathCircle.radius += abilityObjectDeathCircle.growSpeed;
    if(abilityObjectDeathCircle.nextTickTime === undefined) abilityObjectDeathCircle.nextTickTime = game.state.time + abilityObjectDeathCircle.tickInterval;
    if(abilityObjectDeathCircle.nextTickTime > game.state.time) return;

    abilityObjectDeathCircle.nextTickTime += abilityObjectDeathCircle.tickInterval;
    abilityObjectDeathCircle.damage = Math.max(1, abilityObjectDeathCircle.radius / 200);

    let playerCharacters = getPlayerCharacters(game.state.players);
    for(let playerCharacter of playerCharacters){
        let distance = calculateDistance(playerCharacter, abilityObject);
        if(distance < abilityObjectDeathCircle.radius){
            characterTakeDamage(playerCharacter, abilityObject.damage, game);
        }
    }
}

function paintAbilityObjectDeathCircle(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if(paintOrder === "beforeCharacterPaint"){
        let abilityObjectDeathCircle = abilityObject as AbilityObjectDeathCircle;
        let cameraPosition = getCameraPosition(game);
        let centerX = ctx.canvas.width / 2;
        let centerY = ctx.canvas.height / 2;
    
        ctx.fillStyle = abilityObject.color;
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        ctx.arc(
            abilityObject.x - cameraPosition.x + centerX,
            abilityObject.y - cameraPosition.y + centerY,
            abilityObjectDeathCircle.radius, 0, 2 * Math.PI
        );
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}