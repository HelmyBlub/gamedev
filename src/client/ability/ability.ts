import { determineCharactersInDistance } from "../character/character.js"
import { Character } from "../character/characterModel.js"
import { calculateDistance } from "../game.js"
import { Game, Position } from "../gameModel.js"
import { GameMap } from "../map/map.js"
import { Player } from "../player.js"
import { Projectile } from "./projectile.js"

export type Ability = {
    name: string,
    passive: boolean,
    playerInputBinding?: string,
}
export type PaintOrder = "beforeCharacterPaint" | "afterCharacterPaint";
export type AbilityObject = Position & {
    type: string,
    size: number,
    color: string,
    damage: number,
    faction: string,
    paintOrder: PaintOrder,
}

export type AbilityFunctions = {
    tickAbility: (character: Character, ability: Ability, game: Game) => void,
    createAbiltiyUpgradeOptions: () => UpgradeOptionAbility[],
    paintAbility?: (ctx: CanvasRenderingContext2D, character: Character, ability: Ability, cameraPosition: Position) => void,
    activeAbilityCast?: (character: Character,  ability: Ability, castPosition: Position, game: Game) => void,
    tickAbilityObject?: (abilityObject: AbilityObject, game: Game) => void,
    deleteAbilityObject?: (abilityObject: AbilityObject, game: Game) => boolean,
}

export type AbilitiesFunctions = {
    [key:string]: AbilityFunctions,
}

export type UpgradeOptionAbility = {
    name: string,
    upgrade: (ability: Ability) => void,
}

export const ABILITIES_FUNCTIONS: AbilitiesFunctions = {};

export function addAbilityToCharacter(character: Character, ability: Ability){
    character.abilities.push(ability);
    if(!ability.passive){
        ability.playerInputBinding = "ability1";
    }
}

export function paintAbilityObjects(ctx:CanvasRenderingContext2D, abilityObjects: AbilityObject[], cameraPosition: Position, paintOrder: PaintOrder){
    for(let abilityObject of abilityObjects){
        if(abilityObject.paintOrder === paintOrder){
            paintDefault(ctx, abilityObject, cameraPosition);
        }
    }
}

export function tickAbilityObjects(abilityObjects: AbilityObject[], game: Game){
    for(let i = abilityObjects.length - 1; i >= 0; i--){
        let abilityFunctions = ABILITIES_FUNCTIONS[abilityObjects[i].type];
        if(abilityFunctions.tickAbilityObject !== undefined){
            abilityFunctions.tickAbilityObject(abilityObjects[i], game);
        }else{
            throw new Error("tickAbilityObject not defined for " + abilityObjects[i].type);
        }
        if(abilityFunctions.deleteAbilityObject !== undefined){
            if(abilityFunctions.deleteAbilityObject(abilityObjects[i], game)){
                abilityObjects.splice(i,1);
            }
        }else{
            throw new Error("deleteAbilityObject not defined for " + abilityObjects[i].type);
        }
    }
}

function paintDefault(ctx:CanvasRenderingContext2D, abilityObject: AbilityObject, cameraPosition: Position){
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;

    ctx.fillStyle = abilityObject.color;
    ctx.beginPath();
    ctx.arc(
        abilityObject.x - cameraPosition.x + centerX,
        abilityObject.y - cameraPosition.y + centerY,
        abilityObject.size / 2, 0, 2 * Math.PI
    );
    ctx.fill();

}

export function detectAbilityObjectToCharacterHit(map: GameMap, abilityObject: AbilityObject, players: Player[]) {
    let maxEnemySizeEstimate = 40;

    let characters = determineCharactersInDistance(abilityObject, map, players, abilityObject.size + maxEnemySizeEstimate);
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        let c = characters[charIt];
        if (c.isDead || c.faction === abilityObject.faction) continue;
        let distance = calculateDistance(c, abilityObject);
        if (distance < abilityObject.size / 2 + c.width / 2) {
            c.hp -= abilityObject.damage;
            c.wasHitRecently = true;
            if(abilityObject.type === "Projectile"){
                let projectile = abilityObject as Projectile;
                projectile.pierceCount--;
                if (projectile.pierceCount < 0) break;
            }
        }
    }
}
