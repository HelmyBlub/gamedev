import { characterTakeDamage, determineCharactersInDistance, getPlayerCharacters } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { TamerPetCharacter } from "../../character/playerCharacters/tamerPetCharacter.js";
import { calculateDistance, getCameraPosition, getNextId } from "../../game.js";
import { IdCounter, Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, AbilityUpgradeOption, PaintOrderAbility } from "../ability.js";

export type AbilityPetPainter = Ability & {
    damage: number,
    currentlyPainting?: Shape,
    paintPoints?: Position[],
    paintCircle?: {
        middle: Position,
        startAngle: number,
    }
}

export type AbilityObjectPetPainter = AbilityObject & {
    subType: Shape,
    range: number,
    damageDone: boolean,
    deleteTime: number,
}

export const ABILITY_NAME_PET_PAINTER = "Painter";
const FADETIME = 500;
type Shape = "Circle" | "Triangle" | "Square";

export function addAbilityPetPainter() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_PET_PAINTER] = {
        tickAbility: tickAbilityPetPainter,
        tickAbilityObject: tickAbilityObjectPetPainter,
        createAbilityUpgradeOptions: createAbiltiyPetPainterUpgradeOptions,
        createAbility: createAbilityPetPainter,
        paintAbility: paintAbilityPetPainter,
        paintAbilityObject: paintAbilityObjectPetPainter,
        deleteAbilityObject: deleteAbilityObjectPetPainter,
        isPassive: true,
    };
}

export function createAbilityPetPainter(idCounter: IdCounter): AbilityPetPainter {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_PET_PAINTER,
        damage: 500,
        passive: true,
        upgrades: {},
    }
}

function createAbilityObjectPetPainter(
    position: Position,
    size: number,
    damage: number,
    subType: Shape,
    abilityRefId: number,
    faction: string,
    range: number,
    gameTime: number
): AbilityObjectPetPainter {
    let abilityObjectPetPainter: AbilityObjectPetPainter = {
        type: ABILITY_NAME_PET_PAINTER,
        size: size,
        color: "",
        x: position.x,
        y: position.y,
        damage: damage,
        faction: faction,
        range: range,
        deleteTime: gameTime + FADETIME,
        damageDone: false,
        subType: subType,
        abilityRefId: abilityRefId,
    }

    return abilityObjectPetPainter;
}

function tickAbilityObjectPetPainter(abilityObject: AbilityObject, game: Game) {
    let petPainter = abilityObject as AbilityObjectPetPainter;
    detectAbilityObjectToCharacterHit(petPainter, game);
}

function detectAbilityObjectToCharacterHit(petPainter: AbilityObjectPetPainter, game: Game) {
    if (petPainter.damageDone) return;
    petPainter.damageDone = true;
    let maxEnemySizeEstimate = 40;
    let characters = determineCharactersInDistance(petPainter, game.state.map, [], game.state.bossStuff.bosses, petPainter.size + petPainter.range + maxEnemySizeEstimate);
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        let c = characters[charIt];
        if (c.isDead || c.faction === petPainter.faction) continue;
        let getHit = false;
        if (c.x >= petPainter.x - petPainter.range && c.x <= petPainter.x + petPainter.size + petPainter.range
            && c.y >= petPainter.y && c.y <= petPainter.y + petPainter.size) {
            getHit = true; //horizintal
        } else if (c.y >= petPainter.y - petPainter.range && c.y <= petPainter.y + petPainter.size + petPainter.range
            && c.x >= petPainter.x && c.x <= petPainter.x + petPainter.size) {
            getHit = true; //vertical
        }
        if (getHit) {
            characterTakeDamage(c, petPainter.damage, game, petPainter.abilityRefId);
        }
    }
}

function deleteAbilityObjectPetPainter(abilityObject: AbilityObject, game: Game) {
    const abilityObjectPetPainter = abilityObject as AbilityObjectPetPainter;
    return abilityObjectPetPainter.deleteTime <= game.state.time;
}

function paintAbilityObjectPetPainter(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    const cameraPosition = getCameraPosition(game);
    const petPainter = abilityObject as AbilityObjectPetPainter;
    if (petPainter.subType === "Square") {
        const paintPos = getPointPaintPosition(ctx, petPainter, cameraPosition);
        ctx.fillStyle = "red";
        ctx.globalAlpha = (petPainter.deleteTime - game.state.time) / FADETIME;
        ctx.fillRect(paintPos.x - petPainter.range, paintPos.y, petPainter.size + petPainter.range * 2, petPainter.size);
        ctx.fillRect(paintPos.x, paintPos.y - petPainter.range, petPainter.size, petPainter.size + petPainter.range * 2);
        ctx.globalAlpha = 1;
    }
}

function paintAbilityPetPainter(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    let abilityPetPainter = ability as AbilityPetPainter;
    if (!abilityPetPainter.currentlyPainting) return;

    if (abilityPetPainter.currentlyPainting === "Square") {
        if (!abilityPetPainter.paintPoints || abilityPetPainter.paintPoints.length === 0) return;
        const start = getPointPaintPosition(ctx, abilityPetPainter.paintPoints[0], cameraPosition);
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < abilityPetPainter.paintPoints!.length; i++) {
            const nextPoint = getPointPaintPosition(ctx, abilityPetPainter.paintPoints![i], cameraPosition);
            ctx.lineTo(nextPoint.x, nextPoint.y);
        }
        const petPoint = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
        ctx.lineTo(petPoint.x, petPoint.y);
        ctx.stroke();
    }
}

function createAbiltiyPetPainterUpgradeOptions(): AbilityUpgradeOption[] {
    let upgradeOptions: AbilityUpgradeOption[] = [];
    return upgradeOptions;
}

function getRandomStartPaintPosition(pet: TamerPetCharacter, game: Game): Position{
    let petOwner: Character = findPetOwnerInPlayers(pet, game)!;   
    const randomOffsetX = nextRandom(game.state.randomSeed) * 100 - 40;  
    const randomOffsetY = nextRandom(game.state.randomSeed) * 100 - 40;
    return { x: petOwner.x + randomOffsetX, y: petOwner.y + randomOffsetY };
}

function findPetOwnerInPlayers(pet: TamerPetCharacter, game: Game): Character | undefined{
    let playerCharacters = getPlayerCharacters(game.state.players);
    for(let character of playerCharacters){
        if(character.pets?.includes(pet)){
            return character;
        }
    }
    return undefined;
}

function tickAbilityPetPainter(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const size = 30;
    const abilityPetPainter = ability as AbilityPetPainter;
    const pet = abilityOwner as TamerPetCharacter;
    if (!abilityPetPainter.currentlyPainting) {
        abilityPetPainter.currentlyPainting = "Square";
        const startPoint = getRandomStartPaintPosition(pet, game);
        abilityPetPainter.paintPoints = [];
        pet.forcedMovePosition = { x: startPoint.x, y: startPoint.y };
    } else {
        if (abilityPetPainter.currentlyPainting === "Square") {
            const targetPos = pet.forcedMovePosition!;
            const distance = calculateDistance(pet, targetPos);
            if (distance < pet.moveSpeed) {
                switch (abilityPetPainter.paintPoints!.length) {
                    case 0:
                        abilityPetPainter.paintPoints!.push(targetPos);
                        pet.forcedMovePosition = { x: targetPos.x + size, y: targetPos.y };
                        break;
                    case 1:
                        abilityPetPainter.paintPoints!.push(targetPos);
                        pet.forcedMovePosition = { x: targetPos.x, y: targetPos.y + size };
                        break;
                    case 2:
                        abilityPetPainter.paintPoints!.push(targetPos);
                        pet.forcedMovePosition = { x: targetPos.x - size, y: targetPos.y };
                        break;
                    case 3:
                        abilityPetPainter.paintPoints!.push(targetPos);
                        pet.forcedMovePosition = { x: targetPos.x, y: targetPos.y - size };
                        break;
                    case 4:
                        abilityPetPainter.currentlyPainting = undefined;
                        pet.forcedMovePosition = undefined;
                        const range = 200;
                        const obj = createAbilityObjectPetPainter(abilityPetPainter.paintPoints![0], size, abilityPetPainter.damage, "Square", abilityPetPainter.id, abilityOwner.faction, range, game.state.time);
                        game.state.abilityObjects.push(obj);
                        break;
                }
            }
        }
    }
}

