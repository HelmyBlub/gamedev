import { ABILITIES_FUNCTIONS } from "../../ability/ability.js";
import { getNextId } from "../../game.js";
import { IdCounter, Game, Position } from "../../gameModel.js";
import { GAME_IMAGES, loadImage } from "../../imageLoad.js";
import { determineClosestCharacter, determineEnemyHitsPlayer, determineEnemyMoveDirection, getPlayerCharacters, moveCharacterTick } from "../character.js";
import { Character, createCharacter } from "../characterModel.js";
import { getPathingCache, PathingCache } from "../pathing.js";

export type BossEnemyCharacter = Character & {
}
export const CHARACTER_TYPE_BOSS_ENEMY = "BossEnemyCharacter";

export function createBossWithLevel(idCounter: IdCounter, level: number, game: Game): BossEnemyCharacter {
    let bossSize = 40;
    let color = "black";
    let moveSpeed = 1 + level * 1;
    let hp = 100 * Math.pow(level, 4);
    let damage = 1 + level;
    let experienceWorth = level * 100;
    let x = 0;
    let y = 0;

    let enemy = createCharacter(getNextId(idCounter), x, y, bossSize, bossSize, color, moveSpeed, hp, damage, "enemy", CHARACTER_TYPE_BOSS_ENEMY, experienceWorth);
    return enemy;
}

export function tickBossCharacters(characters: Character[], game: Game) {
    let pathingCache = getPathingCache(game);
    for (let i = characters.length - 1; i >= 0; i--) {
        if(characters[i].type === CHARACTER_TYPE_BOSS_ENEMY){
            tickBossEnemyCharacter(characters[i], game, pathingCache);
        }
    }
}

export function tickBossEnemyCharacter(enemy: BossEnemyCharacter, game: Game, pathingCache: PathingCache) {
    if (enemy.isDead) return;
    let playerCharacters = getPlayerCharacters(game.state.players);
    let closest = determineClosestCharacter(enemy, playerCharacters);
    determineEnemyMoveDirection(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time);
    determineEnemyHitsPlayer(enemy, closest.minDistanceCharacter);
    moveCharacterTick(enemy, game.state.map, game.state.idCounter, false);

    for (let ability of enemy.abilities) {
        ABILITIES_FUNCTIONS[ability.name].tickAbility(enemy, ability, game);
    }
}

export function paintBossCharacters(ctx: CanvasRenderingContext2D, cameraPosition: Position, game: Game){
    for(let character of game.state.bosses){
        paintBossEnemyCharacter(ctx, character, cameraPosition);
    }
}

function paintBossEnemyCharacter(ctx: CanvasRenderingContext2D, character: BossEnemyCharacter, cameraPosition: Position){
    if (character.isDead) return;
    let characterImageId = "slime";
    let characterImage = GAME_IMAGES[characterImageId];
    if (characterImage) {
        if (characterImage.imagePath !== undefined) {
            loadImage(characterImage, character.color, character.randomizedCharacterImage);
            if (characterImage.properties?.canvas) {
                let centerX = ctx.canvas.width / 2;
                let centerY = ctx.canvas.height / 2;
                let paintX = character.x - cameraPosition.x + centerX;
                let paintY = character.y - cameraPosition.y + centerY;
            
                let spriteAnimation = Math.floor(performance.now() / 250) % 2;
                let spriteColor = characterImage.properties.colorToSprite!.indexOf(character.color);
                let spriteWidth = characterImage.spriteRowWidths[0];
                let spriteHeight = characterImage.spriteRowHeights[0];
                let characterX =  Math.floor(paintX - character.width / 2);
                let characterY = Math.floor(paintY - character.height / 2);
                ctx.drawImage(
                    characterImage.properties.canvas!,
                    0 + spriteAnimation * (spriteWidth + 1),
                    0 + spriteColor * (spriteHeight + 1),
                    spriteWidth, spriteHeight,
                    characterX,
                    characterY,
                    character.width, character.height
                );
                paintBossHpBar(ctx, character, {x: characterX, y: characterY});
            }
        }
    }
}

function paintBossHpBar(ctx: CanvasRenderingContext2D, character: BossEnemyCharacter, topLeftPaint: Position){
    let fillAmount = Math.max(0, character.hp / character.maxHp);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.fillRect(topLeftPaint.x, topLeftPaint.y - 6, Math.ceil(40 * fillAmount), 6);
    ctx.beginPath();
    ctx.rect(topLeftPaint.x, topLeftPaint.x, 40, 6);
    ctx.stroke();
}
