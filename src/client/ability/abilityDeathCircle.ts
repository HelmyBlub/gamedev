import { getPlayerCharacters } from "../character/character.js";
import { calculateDistance, getCameraPosition } from "../game.js";
import { Game } from "../gameModel.js";
import { GameMap } from "../map/map.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, UpgradeOptionAbility } from "./ability.js";

export type AbilityDeathCircle = Ability & {
    damage: number,
    size: number,
    growSpeed: number,
}

export type AbilityObjectDeathCircle = AbilityObject & {
    growSpeed: number,
}

const ABILITY_NAME_DEATH_CIRCLE = "DeathCircle";
export function addDeathCircleAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_DEATH_CIRCLE] = {
        tickAbility: tickAbilityDeathCircle,
        createAbiltiyUpgradeOptions: createAbiltiyDeathCircleUpgradeOptions,
        tickAbilityObject: tickAbilityObjectDeathCircle,
        deleteAbilityObject: deleteObjectDeathCircle,
        createAbility: createAbilityDeathCircle,
        paintAbilityObject: paintAbilityObjectDeathCircle,
        isPassive: true,
        notInheritable: true,
    };
}
export function createAbilityDeathCircle(): AbilityDeathCircle {
    return {
        name: ABILITY_NAME_DEATH_CIRCLE,
        damage: 10,
        passive: true,
        growSpeed: 2,
        size: 0,
    }
}

export function createObjectDeathCircle(map: GameMap): AbilityObjectDeathCircle {
    let mapCenter = (map.tileSize * map.chunkLength) / 2;
    return {
        type: ABILITY_NAME_DEATH_CIRCLE,
        size: 0,
        color: "black",
        damage: 0.1,
        faction: "enemy",
        growSpeed: 0.5,
        x: mapCenter,
        y: mapCenter,
        paintOrder: "beforeCharacterPaint",
    }
}

function createAbiltiyDeathCircleUpgradeOptions(): UpgradeOptionAbility[] {
    let upgradeOptions: UpgradeOptionAbility[] = [];
    return upgradeOptions;
}

function deleteObjectDeathCircle(abilityObject: AbilityObject, game: Game): boolean {
    return false;
}

function tickAbilityDeathCircle(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
}

function tickAbilityObjectDeathCircle(abilityObject: AbilityObject, game: Game) {
    let abilityObjectDeathCircle = abilityObject as AbilityObjectDeathCircle;
    abilityObjectDeathCircle.size += abilityObjectDeathCircle.growSpeed;
    abilityObjectDeathCircle.damage = Math.max(0.1, abilityObjectDeathCircle.size / 4000);

    let playerCharacters = getPlayerCharacters(game.state.players);
    for(let playerCharacter of playerCharacters){
        let distance = calculateDistance(playerCharacter, abilityObject);
        if(distance < abilityObjectDeathCircle.size / 2){
            playerCharacter.hp -= abilityObject.damage;
        }
    }
}

function paintAbilityObjectDeathCircle(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, game: Game) {
    let cameraPosition = getCameraPosition(game);
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;

    ctx.fillStyle = abilityObject.color;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.arc(
        abilityObject.x - cameraPosition.x + centerX,
        abilityObject.y - cameraPosition.y + centerY,
        abilityObject.size / 2, 0, 2 * Math.PI
    );
    ctx.fill();
    ctx.globalAlpha = 1;
}