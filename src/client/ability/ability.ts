import { determineCharactersInDistance, characterTakeDamage } from "../character/character.js"
import { Character } from "../character/characterModel.js"
import { BossEnemyCharacter } from "../character/enemy/bossEnemy.js"
import { calculateDistance, getCameraPosition, takeTimeMeasure } from "../game.js"
import { Game, Position } from "../gameModel.js"
import { GameMap } from "../map/map.js"
import { findPlayerByCharacterId, findPlayerById, Player } from "../player.js"
import { addDeathCircleAbility } from "./abilityDeathCircle.js"
import { addFireCircleAbility } from "./abilityFireCircle.js"
import { addLeshAbility } from "./abilityLeash.js"
import { addTowerAbility } from "./abilityTower.js"
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
}

export type AbilityOwner = Position & {
    faction: string,
    id: number,
    moveSpeed?: number,
    moveDirection?: number,
    width?: number,
}

export type AbilityFunctions = {
    tickAbility: (abilityOwner: AbilityOwner, ability: Ability, game: Game) => void,
    createAbility: () => Ability,
    createAbiltiyUpgradeOptions: () => UpgradeOptionAbility[],
    activeAbilityCast?: (abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, game: Game) => void,
    tickAbilityObject?: (abilityObject: AbilityObject, game: Game) => void,
    deleteAbilityObject?: (abilityObject: AbilityObject, game: Game) => boolean,
    paintAbility?: (ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) => void,
    paintAbilityObject?: (ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrder, game: Game) => void,
    paintAbilityUI?: (ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) => void,
    paintAbilityStatsUI?: (ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, game: Game) => {width: number, height: number},
    onHitAndReturnIfContinue?: (abilityObject: AbilityObject) => boolean,
    setAbilityToLevel?: (ability: Ability, level: number) => void,
    setAbilityToBossLevel?: (ability: Ability, level: number) => void,
    notInheritable?: boolean,
    canBeUsedByBosses?: boolean,
    isPassive: boolean,
    hasAutoCast?: boolean,
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
    addTowerAbility();
    addDeathCircleAbility();
    addLeshAbility();
}

export function addAbilityToCharacter(character: Character, ability: Ability) {
    character.abilities.push(ability);
}

export function paintAbilityObjects(ctx: CanvasRenderingContext2D, abilityObjects: AbilityObject[], game: Game, paintOrder: PaintOrder) {
    paintAbilityObjectsForFaction(ctx, abilityObjects, game, paintOrder, "player");
    paintAbilityObjectsForFaction(ctx, abilityObjects, game, paintOrder, "enemy");
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

export function detectAbilityObjectToCharacterHit(map: GameMap, abilityObject: AbilityObject, players: Player[], bosses: BossEnemyCharacter[]) {
    let maxEnemySizeEstimate = 40;

    let characters = determineCharactersInDistance(abilityObject, map, players, bosses, abilityObject.size + maxEnemySizeEstimate);
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        let c = characters[charIt];
        if (c.isDead || c.faction === abilityObject.faction) continue;
        let distance = calculateDistance(c, abilityObject);
        if (distance < abilityObject.size / 2 + c.width / 2) {
            characterTakeDamage(c, abilityObject.damage);
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

function paintAbilityObjectsForFaction(ctx: CanvasRenderingContext2D, abilityObjects: AbilityObject[], game: Game, paintOrder: PaintOrder, faction: string) {
    for (let abilityObject of abilityObjects) {
        if(abilityObject.faction === faction){
            let abilityFunctions = ABILITIES_FUNCTIONS[abilityObject.type];
            if (abilityFunctions?.paintAbilityObject !== undefined) {
                abilityFunctions.paintAbilityObject(ctx, abilityObject, paintOrder, game);
            } else {
                paintDefault(ctx, abilityObject, getCameraPosition(game), paintOrder);
            }
        }
    }
}

function paintDefault(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, cameraPosition: Position, paintOrder: PaintOrder) {
    if(paintOrder === "afterCharacterPaint"){
        let centerX = ctx.canvas.width / 2;
        let centerY = ctx.canvas.height / 2;
    
        ctx.fillStyle = abilityObject.faction === "enemy" ? "black" : abilityObject.color;
        ctx.beginPath();
        ctx.arc(
            abilityObject.x - cameraPosition.x + centerX,
            abilityObject.y - cameraPosition.y + centerY,
            abilityObject.size / 2, 0, 2 * Math.PI
        );
        ctx.fill();
    }
}
