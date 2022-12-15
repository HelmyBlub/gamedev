import { getNextId } from "../game.js";
import { Position, Game } from "../gameModel.js";
import { isPositionBlocking } from "../map/map.js";
import { nextRandom } from "../randomNumberGenerator.js";
import { getPlayerCharacters } from "./character.js";
import { createLevelingCharacter } from "./levelingCharacterModel.js";

export const PLAYER_FACTION = "player";
export const ENEMY_FACTION = "enemy";
export type Character = Position & {
    id: number,
    size: number,
    color: string,
    moveSpeed: number,
    moveDirection: number,
    isMoving: boolean,
    hp: number,
    maxHp: number,
    damage: number,
    faction: string,
    experienceWorth: number,
}

function createCharacter(
    game: Game,
    x: number,
    y: number,
    size: number,
    color: string,
    moveSpeed: number,
    hp: number,
    damage: number,
    faction: string,
    isMoving: boolean = false,
): Character {
    return {
        id: getNextId(game.state),
        x: x,
        y: y,
        size: size,
        color: color,
        moveSpeed: moveSpeed,
        moveDirection: 0,
        isMoving: isMoving,
        hp: hp,
        maxHp: hp,
        damage: damage,
        faction: faction,
        experienceWorth: 1,
    };
}

export function createPlayerCharacter(game: Game, pos: Position): Character {
    return createLevelingCharacter(game, pos.x, pos.y, 10, "blue", 2, 200, 10, PLAYER_FACTION);
}

export function createRandomEnemy(game: Game) {
    if (game.state.characters.length > 50) return;

    let pos: Position = { x: 0, y: 0 };
    let hp = Math.ceil(game.state.time / 1000);
    let spawnDistance = 150;
    let playerCharacter = getPlayerCharacters(game.state.characters);

    for (let i = 0; i < playerCharacter.length; i++) {
        let center: Position = playerCharacter[i];

        if (nextRandom(game.state) < 0.5) {
            pos.x = center.x + (Math.round(nextRandom(game.state)) * 2 - 1) * spawnDistance;
            pos.y = center.y + (nextRandom(game.state) - 0.5) * spawnDistance * 2;
        } else {
            pos.x = center.x + (nextRandom(game.state) - 0.5) * spawnDistance * 2;
            pos.y = center.y + (Math.round(nextRandom(game.state)) * 2 - 1) * spawnDistance;
        }
        if (!isPositionBlocking(pos, game.state.map)) {
            game.state.characters.push(createEnemy(game, pos.x, pos.y, hp));
        }
    }
}

function createEnemy(game: Game, x: number, y: number, hp: number): Character {
    return createCharacter(game, x, y, 5, "black", 0.5, hp, 1, ENEMY_FACTION, true);
}
