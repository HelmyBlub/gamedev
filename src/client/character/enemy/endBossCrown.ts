import { calculateDirection, calculateDistance, endGame, getNextId } from "../../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../gameModel.js";
import { moveCharacterTick } from "../character.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, createCharacter } from "../characterModel.js";
import { paintCharacterDefault } from "../characterPaint.js";
import { PathingCache } from "../pathing.js";
import { EndBossEnemyCharacter, IMAGE_CROWN } from "./endBossEnemy.js";

export const CHARACTER_TYPE_END_BOSS_CROWN_ENEMY = "EndBossCrownEnemyCharacter";
export function addEndBossCrownType() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_END_BOSS_CROWN_ENEMY] = {
        tickFunction: tickCrown,
        paintCharacterType: paintCrown,
    }
}

export function createEndBossCrownCharacter(idCounter: IdCounter, spawn: Position): EndBossEnemyCharacter {
    const crownSize = 20;
    const color = "black";
    const moveSpeed = 2;
    const hp = 1;
    const experienceWorth = 0;
    const crownCharacter = createCharacter(getNextId(idCounter), spawn.x, spawn.y, crownSize, crownSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_END_BOSS_CROWN_ENEMY, experienceWorth);
    crownCharacter.paint.image = IMAGE_CROWN;
    crownCharacter.isMoving = true;
    crownCharacter.isImmune = true;
    return crownCharacter;
}

function tickCrown(enemy: Character, game: Game, pathingCache: PathingCache | null) {
    if (enemy.isDead) return;
    const targetCharacter = game.state.players[0].character;
    const targetPos = {
        x: targetCharacter.x,
        y: targetCharacter.y - targetCharacter.height / 2
    }
    if (calculateDistance(enemy, targetPos) <= enemy.moveSpeed) {
        endGame(game, true);
    } else {
        enemy.moveDirection = calculateDirection(enemy, targetPos);
        moveCharacterTick(enemy, game.state.map, game.state.idCounter);
    }
}

function paintCrown(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    paintCharacterDefault(ctx, character, cameraPosition, game);
}

