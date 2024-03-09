import { characterTakeDamage, determineClosestCharacter, getPlayerCharacters } from "../../character.js";
import { getCameraPosition, getNextId } from "../../../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition, paintTextWithOutline } from "../../../gamePaint.js";
import { RandomSeed, nextRandom } from "../../../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, PaintOrderAbility } from "../../../ability/ability.js";
import { GodAbility } from "./godAbility.js";
import { Character } from "../../characterModel.js";
import { applyExponentialStackingDamageTakenDebuff } from "./godEnemy.js";


export const ABILITY_NAME_MOVING_FIRE = "Moving Fire";
export type AbilityMovingFire = GodAbility & {
    cooldown: number,
    cooldownFinishedTime: number,
    fireSpawnCount: number,
}

export type AbilityObjectMovingFire = AbilityObject & {
    tickInterval: number,
    nextTickTime?: number,
    moveSpeed: number,
    size: number,
}

export function addGodAbilityMovingFire() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_MOVING_FIRE] = {
        createAbility: createAbility,
        deleteAbilityObject: deleteObject,
        paintAbilityObject: paintAbilityObject,
        paintAbility: paintAbility,
        setAbilityToBossLevel: setAbilityToBossLevel,
        tickAbilityObject: tickAbilityObject,
        tickBossAI: tickBossAI,
    };
}

function createAbility(
    idCounter: IdCounter,
    playerInputBinding?: string,
): AbilityMovingFire {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_MOVING_FIRE,
        cooldown: 1000,
        cooldownFinishedTime: 0,
        fireSpawnCount: 1,
        passive: false,
        playerInputBinding: playerInputBinding,
        upgrades: {},
        pickedUp: false,
    };
}

function createAbilityObject(position: Position, randomSeed: RandomSeed): AbilityObjectMovingFire {
    return {
        type: ABILITY_NAME_MOVING_FIRE,
        x: position.x,
        y: position.y,
        size: 40,
        moveSpeed: 1 + nextRandom(randomSeed) * 2,
        color: "black",
        damage: 10,
        faction: FACTION_ENEMY,
        tickInterval: 100,
    }
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const abilityMovingFire = ability as AbilityMovingFire;
    abilityMovingFire.fireSpawnCount = level * 2;
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abiltiyMovingFire = ability as AbilityMovingFire;
    const position: Position | undefined = abiltiyMovingFire.pickedUp ? undefined : abiltiyMovingFire.pickUpPosition;
    if (!position) return;
    const paintPos = getPointPaintPosition(ctx, position, cameraPosition);
    ctx.fillStyle = "20px Arial";
    paintTextWithOutline(ctx, "white", "black", "MovingFire", paintPos.x, paintPos.y, true);
}

function paintAbilityObject(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    const abilityObjectFireCircle = abilityObject as AbilityObjectMovingFire;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition);

    if (paintOrder === "beforeCharacterPaint") {
        ctx.beginPath();
        ctx.fillStyle = abilityObject.color;
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.rect(paintPos.x, paintPos.y, abilityObjectFireCircle.size, abilityObjectFireCircle.size);
        ctx.fill();
        ctx.stroke();
    }
}

function tickBossAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const movingFire = ability as AbilityMovingFire;
    if (!movingFire.pickedUp) return;
    if (movingFire.cooldownFinishedTime < game.state.time) {
        movingFire.cooldownFinishedTime = game.state.time + movingFire.cooldown;
        const map = game.state.map;
        const godArea = map.godArea;
        if (!godArea || godArea.spawnTopLeftChunk === undefined) return;
        for (let i = 0; i < movingFire.fireSpawnCount; i++) {
            const spawnPosition = {
                x: godArea.spawnTopLeftChunk.x * map.chunkLength * map.tileSize,
                y: godArea.spawnTopLeftChunk.y * map.chunkLength * map.tileSize,
            }
            if (nextRandom(game.state.randomSeed) > 0.5) {
                if (nextRandom(game.state.randomSeed) > 0.5) {
                    spawnPosition.x += godArea.size * map.chunkLength * map.tileSize - map.tileSize;
                }
                spawnPosition.y += nextRandom(game.state.randomSeed) * (godArea.size * map.chunkLength * map.tileSize - map.tileSize);
            } else if (nextRandom(game.state.randomSeed) > 0.5) {
                if (nextRandom(game.state.randomSeed) > 0.5) {
                    spawnPosition.y += godArea.size * map.chunkLength * map.tileSize - map.tileSize;
                }
                spawnPosition.x += nextRandom(game.state.randomSeed) * (godArea.size * map.chunkLength * map.tileSize - map.tileSize);
            }
            const seekerFollow = createAbilityObject(spawnPosition, game.state.randomSeed);
            game.state.abilityObjects.push(seekerFollow);
        }
    }
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    const movingFire = abilityObject as AbilityObjectMovingFire;
    if (movingFire.nextTickTime === undefined) movingFire.nextTickTime = game.state.time + movingFire.tickInterval;
    const playerCharacters = getPlayerCharacters(game.state.players);
    if (movingFire.nextTickTime <= game.state.time) {
        movingFire.nextTickTime += movingFire.tickInterval;
        for (let char of playerCharacters) {
            if (char.x > movingFire.x && char.x < movingFire.x + movingFire.size
                && char.y > movingFire.y && char.y < movingFire.y + movingFire.size
            ) {
                characterTakeDamage(char, movingFire.damage, game, undefined, movingFire.type);
                applyExponentialStackingDamageTakenDebuff(char, game);
            }
        }

    }
    const closest = determineClosestCharacter(movingFire, playerCharacters);
    if (!closest.minDistanceCharacter) return;
    const direction = closest.minDistanceCharacter.moveDirection + Math.PI;
    movingFire.x = movingFire.x + Math.cos(direction) * movingFire.moveSpeed;
    movingFire.y = movingFire.y + Math.sin(direction) * movingFire.moveSpeed;
}

function deleteObject(abilityObject: AbilityObject, game: Game): boolean {
    const movingFire = abilityObject as AbilityObjectMovingFire;
    const godArea = game.state.map.godArea;
    if (!godArea || godArea.spawnTopLeftChunk === undefined) return true;
    const godAreaLength = godArea.size * game.state.map.chunkLength * game.state.map.tileSize;
    const godAreaTopLeftPosition = {
        x: godArea.spawnTopLeftChunk.x * game.state.map.chunkLength * game.state.map.tileSize,
        y: godArea.spawnTopLeftChunk.y * game.state.map.chunkLength * game.state.map.tileSize,
    }
    if (movingFire.x < godAreaTopLeftPosition.x || movingFire.x > godAreaTopLeftPosition.x + godAreaLength
        || movingFire.y < godAreaTopLeftPosition.y || movingFire.y > godAreaTopLeftPosition.y + godAreaLength
    ) {
        return true;
    }
    return false;
}

