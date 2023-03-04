import { determineCharactersInDistance } from "../character/character.js"
import { Character } from "../character/characterModel.js"
import { calculateDistance, takeTimeMeasure } from "../game.js"
import { Game, Position } from "../gameModel.js"
import { GameMap } from "../map/map.js"
import { findPlayerByCharacterId, findPlayerById, Player } from "../player.js"
import { addFireCircleAbility } from "./abilityFireCircle.js"
import { addRodAbility } from "./abilityRod.js"
import { addShootAbility } from "./abilityShoot.js"
import { addSwordAbility } from "./abilitySword.js"

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

export type AbilityOwner = Position & {
    faction: string
}

export type AbilityFunctions = {
    tickAbility: (abilityOwner: AbilityOwner, ability: Ability, game: Game) => void,
    createAbiltiyUpgradeOptions: () => UpgradeOptionAbility[],
    paintAbility?: (ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position) => void,
    activeAbilityCast?: (abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, game: Game) => void,
    tickAbilityObject?: (abilityObject: AbilityObject, game: Game) => void,
    deleteAbilityObject?: (abilityObject: AbilityObject, game: Game) => boolean,
    paintAbilityObject?: (ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, cameraPosition: Position) => void,
    paintAbilityUI?: (ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) => void,
    onHitAndReturnIfContinue?: (abilityObject: AbilityObject) => boolean,
    setAbilityToLevel?: (ability: Ability, level: number) => void,
    createAbility: () => Ability,
    isPassive: boolean,
}

export type AbilitiesFunctions = {
    [key: string]: AbilityFunctions,
}

export type UpgradeOptionAbility = {
    name: string,
    upgrade: (ability: Ability) => void,
}

export const ABILITIES_FUNCTIONS: AbilitiesFunctions = {};

export function onDomLoadSetAbilitiesFunctions() {
    addShootAbility();
    addFireCircleAbility();
    addSwordAbility();
    addRodAbility();
}

export function addAbilityToCharacter(character: Character, ability: Ability) {
    character.abilities.push(ability);
}

export function paintAbilityObjects(ctx: CanvasRenderingContext2D, abilityObjects: AbilityObject[], cameraPosition: Position, paintOrder: PaintOrder) {
    for (let abilityObject of abilityObjects) {
        if (abilityObject.paintOrder === paintOrder) {
            let abilityFunctions = ABILITIES_FUNCTIONS[abilityObject.type];
            if (abilityFunctions?.paintAbilityObject !== undefined) {
                abilityFunctions.paintAbilityObject(ctx, abilityObject, cameraPosition);
            } else {
                paintDefault(ctx, abilityObject, cameraPosition);
            }
        }
    }
}

export function tickAbilityObjects(abilityObjects: AbilityObject[], game: Game) {
    takeTimeMeasure(game.debug, "", "tickAbilityObjects");
    for (let i = abilityObjects.length - 1; i >= 0; i--) {
        let abilityFunctions = ABILITIES_FUNCTIONS[abilityObjects[i].type];
        if (abilityFunctions.tickAbilityObject !== undefined) {
            abilityFunctions.tickAbilityObject(abilityObjects[i], game);
        } else {
            throw new Error("tickAbilityObject not defined for " + abilityObjects[i].type);
        }
        if (abilityFunctions.deleteAbilityObject !== undefined) {
            if (abilityFunctions.deleteAbilityObject(abilityObjects[i], game)) {
                abilityObjects.splice(i, 1);
            }
        } else {
            throw new Error("deleteAbilityObject not defined for " + abilityObjects[i].type);
        }
    }
    takeTimeMeasure(game.debug, "tickAbilityObjects", "");
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
            let abilityFunction = ABILITIES_FUNCTIONS[abilityObject.type];
            if (abilityFunction.onHitAndReturnIfContinue) {
                let continueHitDetection = abilityFunction.onHitAndReturnIfContinue(abilityObject);
                if (!continueHitDetection) break;
            }
        }
    }
}

export function paintUiForAbilities(ctx: CanvasRenderingContext2D, game: Game) {
    if (game.camera.characterId === undefined) return;
    let player = findPlayerByCharacterId(game.state.players, game.camera.characterId);
    if (!player) return;

    let size = 40;
    let startX = ctx.canvas.width / 2 - 20;
    let startY = ctx.canvas.height - size - 2;
    for (let ability of player.character.abilities) {
        let abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions?.paintAbilityUI !== undefined) {
            abilityFunctions.paintAbilityUI(ctx, ability, startX, startY, size, game);
            startX += size;
        }
    }
}

function paintDefault(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, cameraPosition: Position) {
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
