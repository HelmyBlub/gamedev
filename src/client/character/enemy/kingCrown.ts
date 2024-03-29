import { calculateDirection, calculateDistance, endGame, getNextId } from "../../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../gameModel.js";
import { getCharacterMoveSpeed, moveCharacterTick } from "../character.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, createCharacter } from "../characterModel.js";
import { paintCharacterWithAbilitiesDefault } from "../characterPaint.js";
import { PathingCache } from "../pathing.js";
import { KingEnemyCharacter, IMAGE_CROWN } from "./kingEnemy.js";

export const CHARACTER_TYPE_END_BOSS_CROWN_ENEMY = "KingCrownEnemyCharacter";
export function addKingCrownType() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_END_BOSS_CROWN_ENEMY] = {
        tickFunction: tickCrown,
        paintCharacterType: paintCrown,
    }
}

export function createKingCrownCharacter(idCounter: IdCounter, spawn: Position): KingEnemyCharacter {
    const crownSize = 20;
    const color = "black";
    const moveSpeed = 2;
    const hp = 1;
    const experienceWorth = 0;
    const crownCharacter = createCharacter(getNextId(idCounter), spawn.x, spawn.y, crownSize, crownSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_END_BOSS_CROWN_ENEMY, experienceWorth);
    crownCharacter.paint.image = IMAGE_CROWN;
    crownCharacter.isMoving = true;
    crownCharacter.isDamageImmune = true;
    crownCharacter.isDebuffImmune = true;
    return crownCharacter;
}

function tickCrown(enemy: Character, game: Game, pathingCache: PathingCache | null) {
    if (enemy.isDead) return;
    let targetCharacter: Character | undefined = undefined;
    for (let player of game.state.players) {
        if (!player.character.isDead && !player.character.isPet) {
            targetCharacter = player.character;
            break;
        }
    }
    if (!targetCharacter) return;
    const targetPos = {
        x: targetCharacter.x,
        y: targetCharacter.y - targetCharacter.height / 2
    }
    if (calculateDistance(enemy, targetPos) <= getCharacterMoveSpeed(enemy) + 2) {
        endGame(game, true, false);
    } else {
        enemy.moveDirection = calculateDirection(enemy, targetPos);
        moveCharacterTick(enemy, game.state.map, game.state.idCounter, game);
    }
}

function paintCrown(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    paintCharacterWithAbilitiesDefault(ctx, character, cameraPosition, game);
}

