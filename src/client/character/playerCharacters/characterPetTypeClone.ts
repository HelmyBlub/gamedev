import { ABILITIES_FUNCTIONS } from "../../ability/ability.js";
import { calculateDirection, calculateDistance } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { RandomizedCharacterImage } from "../../randomizedCharacterImage.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { moveCharacterTick } from "../character.js";
import { Character, CHARACTER_TYPE_FUNCTIONS } from "../characterModel.js";
import { paintCharacterDefault, paintCharacterWithAbilitiesDefault } from "../characterPaint.js";
import { PathingCache } from "../pathing.js";

export type CharacterPetClone = Character & {
    originalWidth?: number,
    originalHeight?: number,
    spawnTime?: number,
    spawnDelay?: number,
    turnEvilStartTime?: number,
    turnEvilDuration?: number,
    tempDarkCharacterImage?: RandomizedCharacterImage,
    forcedMovePosition?: Position,
}

export const CHARACTER_PET_TYPE_CLONE = "CharacterPetTypeClone";

export function addPetTypeFollowAttackFunctions() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_PET_TYPE_CLONE] = {
        tickPetFunction: tick,
        paintCharacterType: paintCharacterType,
    }
}

function paintCharacterType(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    const clone = character as CharacterPetClone;
    if (clone.spawnTime! + clone.spawnDelay! >= game.state.time) {
        paintCharacterDefault(ctx, character, cameraPosition, game);
    } else {
        paintCharacterWithAbilitiesDefault(ctx, character, cameraPosition, game);
    }
    paintDarkCharacterPart(ctx, character, cameraPosition, game);
}

function paintDarkCharacterPart(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    const clone = character as CharacterPetClone;
    if (clone.turnEvilStartTime === undefined || clone.spawnTime === undefined) return;
    if (clone.paint.randomizedCharacterImage === undefined) return;
    if (clone.tempDarkCharacterImage === undefined) return;
    const friendlyTimer = clone.turnEvilStartTime - clone.spawnTime + 3000;
    const paintPos = getPointPaintPosition(ctx, character, cameraPosition, game.UI.zoom);
    const leftPaint = Math.floor(paintPos.x - character.width / 2);
    const factor = Math.min(1 - (clone.turnEvilStartTime - game.state.time) / friendlyTimer, 1);
    const height = Math.round(character.height * factor);
    const bottomPaint = Math.floor(paintPos.y + character.height / 2);

    let rectPath = new Path2D();
    rectPath.lineTo(leftPaint, bottomPaint);
    rectPath.lineTo(leftPaint + character.width, bottomPaint);
    rectPath.lineTo(leftPaint + character.width, bottomPaint - height);
    rectPath.lineTo(leftPaint, bottomPaint - height);
    rectPath.lineTo(leftPaint, bottomPaint);
    ctx.save();
    ctx.clip(rectPath);
    const origPaint = character.paint.randomizedCharacterImage;
    character.paint.randomizedCharacterImage = clone.tempDarkCharacterImage;
    if (clone.turnEvilStartTime < game.state.time) {
        ctx.translate(Math.floor(Math.random() * 6 - 3), Math.floor(Math.random() * 6 - 3));
    }
    paintCharacterDefault(ctx, character, cameraPosition, game);
    character.paint.randomizedCharacterImage = origPaint;
    ctx.restore();
}

function tick(character: Character, petOwner: Character, game: Game, pathingCache: PathingCache | null) {
    const clone = character as CharacterPetClone;
    if (clone.turnEvilStartTime === undefined || clone.turnEvilStartTime < game.state.time) return;
    if (clone.originalWidth === undefined) {
        clone.originalWidth = clone.width;
        clone.originalHeight = clone.height;
        clone.spawnTime = game.state.time;
        clone.spawnDelay = 3000;
        clone.width = 0;
        clone.height = 0;
        return;
    } else if (clone.spawnTime! + clone.spawnDelay! >= game.state.time) {
        const sizeFaktor = Math.min((game.state.time - clone.spawnTime!) / (clone.spawnDelay! - 50), 1);
        clone.width = clone.originalWidth * sizeFaktor;
        clone.height = clone.originalHeight! * sizeFaktor;
        return;
    }
    if (clone.forcedMovePosition) {
        const distance = calculateDistance(clone.forcedMovePosition, petOwner);
        if (distance > 160) clone.forcedMovePosition = undefined;
    }
    if (!clone.forcedMovePosition) {
        clone.forcedMovePosition = {
            x: petOwner.x + nextRandom(game.state.randomSeed) * 160 - 80,
            y: petOwner.y + nextRandom(game.state.randomSeed) * 160 - 80,
        }
    }
    const distance = calculateDistance(clone.forcedMovePosition, clone);
    if (distance > character.baseMoveSpeed * 5) {
        character.moveDirection = calculateDirection(character, clone.forcedMovePosition);
        character.isMoving = true;
        moveCharacterTick(character, game.state.map, game.state.idCounter, game);
    } else {
        character.isMoving = false;
    }

    for (let ability of character.abilities) {
        let functions = ABILITIES_FUNCTIONS[ability.name];
        if (functions.tickAI) functions.tickAI(character, ability, game);
    }
}
