import { ABILITIES_FUNCTIONS, createAbility } from "../../ability/ability.js";
import { tickCharacterDebuffs } from "../../debuff/debuff.js";
import { getNextId } from "../../game.js";
import { IdCounter, Game, Position, FACTION_ENEMY } from "../../gameModel.js";
import { determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, getPlayerCharacters, moveCharacterTick } from "../character.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, IMAGE_SLIME, createCharacter } from "../characterModel.js";
import { paintCharacterWithAbilitiesDefault, paintCharatersPets } from "../characterPaint.js";
import { PathingCache } from "../pathing.js";
import { paintKingHpBar } from "./kingEnemy.js";
import { GameMapGodArea, getGodAreaMiddlePosition } from "../../map/mapGodArea.js";
import { ABILITY_NAME_SEEKER } from "../../ability/god/abilitySeeker.js";

export type GodEnemyCharacter = Character;
export const CHARACTER_TYPE_GOD_ENEMY = "GodEnemyCharacter";

export function addGodEnemyType() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_GOD_ENEMY] = {
        tickFunction: tickEnemyCharacter,
        paintCharacterType: paint,
    }
}

export function spawnGodEnemy(godArea: GameMapGodArea, game: Game) {
    const spawn: Position = getGodAreaMiddlePosition(godArea, game.state.map)!;
    const king = createGodEnemy(game.state.idCounter, spawn, game);
    game.state.bossStuff.bosses.push(king);
}

function createGodEnemy(idCounter: IdCounter, spawnPosition: Position, game: Game): GodEnemyCharacter {
    const bossSize = 60;
    const color = "black";
    const moveSpeed = 1;
    const hp = 5 * 1000 * 1000 * 1000;
    const experienceWorth = 0;
    const godCharacter = createCharacter(getNextId(idCounter), spawnPosition.x, spawnPosition.y, bossSize, bossSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_GOD_ENEMY, experienceWorth);
    const seeker = createAbility(ABILITY_NAME_SEEKER, game.state.idCounter);
    godCharacter.abilities.push(seeker);
    godCharacter.paint.image = IMAGE_SLIME;
    if (game.debug.lowKingHp) {
        godCharacter.hp = 500;
        godCharacter.maxHp = 500;
    }
    return godCharacter;
}

function tickEnemyCharacter(enemy: GodEnemyCharacter, game: Game, pathingCache: PathingCache | null) {
    if (enemy.isDead) return;
    const playerCharacters = getPlayerCharacters(game.state.players);
    const closest = determineClosestCharacter(enemy, playerCharacters);

    calculateAndSetMoveDirectionToPositionWithPathing(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time, game);
    moveCharacterTick(enemy, game.state.map, game.state.idCounter, game);

    for (let ability of enemy.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions) {
            if (abilityFunctions.tickBossAI) abilityFunctions.tickBossAI(enemy, ability, game);
        }
    }
    tickCharacterDebuffs(enemy, game);
}

function paint(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    if (character.isDead) return;
    paintCharatersPets(ctx, [character], cameraPosition, game);
    paintCharacterWithAbilitiesDefault(ctx, character, cameraPosition, game);
    paintKingHpBar(ctx, character);
}
