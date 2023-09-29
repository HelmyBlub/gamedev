import { ABILITIES_FUNCTIONS, paintDefaultAbilityStatsUI } from "../ability/ability.js";
import { FACTION_PLAYER, Game, Position } from "../gameModel.js";
import { GAME_IMAGES, getImage, loadImage } from "../imageLoad.js";
import { randomizedCharacterImageToKey } from "../randomizedCharacterImage.js";
import { getPlayerCharacters } from "./character.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, IMAGE_PLAYER_PARTS, IMAGE_SLIME } from "./characterModel.js";
import { ABILITY_LEVELING_CHARACTER, AbilityLevelingCharacter } from "./playerCharacters/abilityLevelingCharacter.js";
import { LEVELING_CHARACTER, LevelingCharacter } from "./playerCharacters/levelingCharacterModel.js";

export function paintCharacters(ctx: CanvasRenderingContext2D, characters: (Character | undefined)[], cameraPosition: Position, game: Game) {
    for (let i = 0; i < characters.length; i++) {
        const character = characters[i];
        if(!character) continue;
        const characterFunctions = CHARACTER_TYPE_FUNCTIONS[character.type];
        if (characterFunctions && characterFunctions.paintCharacterType) {
            characterFunctions.paintCharacterType(ctx, character, cameraPosition, game);
        } else {
            paintCharacterDefault(ctx, character, cameraPosition, game);
        }
    }
}

export function paintCharacterHpBarAboveCharacter(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, offsetY: number = 0) {
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let paintX = character.x - cameraPosition.x + centerX;
    let paintY = character.y - cameraPosition.y + centerY;
    if (paintX < -character.width || paintX > ctx.canvas.width
        || paintY < -character.height || paintY > ctx.canvas.height) return;

    let heightFactor = 1;
    if (character.isPet) heightFactor = 0.5;
    let hpBarX = Math.floor(paintX - character.width / 2);
    let hpBarY = Math.floor(paintY - character.height / 2 * heightFactor);
    paintCharacterHpBar(ctx, character, { x: hpBarX, y: hpBarY + offsetY });
}


export function paintCharacterHpBar(ctx: CanvasRenderingContext2D, character: Character, topLeftPaint: Position) {
    if (character.isPet) return;
    const fillAmount = Math.max(0, character.hp / character.maxHp);
    const bossWidth = character.width;
    const hpBarHeight = 6;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.fillRect(topLeftPaint.x, topLeftPaint.y - hpBarHeight, Math.ceil(bossWidth * fillAmount), hpBarHeight);
    ctx.beginPath();
    ctx.rect(topLeftPaint.x, topLeftPaint.y - hpBarHeight, bossWidth, hpBarHeight);
    ctx.stroke();
}

export function paintCharacterStatsUI(ctx: CanvasRenderingContext2D, character: Character, drawStartX: number, drawStartY: number, game: Game): { width: number, height: number } {
    const textLines: string[] = [
        `Character Stats:`,
        `HP: ${character.hp.toFixed(0)}/${character.maxHp.toFixed(0)}`,
        `Movement Speed: ${character.moveSpeed.toFixed(2)}`,
        `Type: ${character.type}`,
    ];
    if (character.type === LEVELING_CHARACTER) {
        let levelingCharacter = character as LevelingCharacter;
        textLines.push(
            `XP: ${Math.floor(levelingCharacter.leveling.experienceForLevelUp)}/${Math.floor(levelingCharacter.leveling.experience)}`,
            `Gains XP for every enemy killed by anyone.`,
            `Gains Skill Points after enough XP`,
            `for LevelUp is reached.`
        );

    } else if (character.type === ABILITY_LEVELING_CHARACTER) {
        let levelingCharacter = character as AbilityLevelingCharacter;
        textLines.push(
            `Abilities gain XP only for its own kills.`,
            `On Level up Abilties become stronger.`,
            `Abilities gain Skill Points for boss kills`,
        );
    }
    return paintDefaultAbilityStatsUI(ctx, textLines, drawStartX, drawStartY);
}

export function paintCharatersPets(ctx: CanvasRenderingContext2D, characters: (Character | undefined)[], cameraPosition: Position, game: Game){
    for(let character of characters){
        if (!character || character.isDead) continue;
        paintCharacterPets(ctx, character, cameraPosition, game);
    }
}

export function paintCharacterDefault(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    if (character.isDead) return;

    if (character.paint.image) {
        if (character.paint.image === IMAGE_SLIME) {
            slimePaint(ctx, character, cameraPosition, game);
        } else {
            paintCharacterImage(ctx, character, cameraPosition, game);
        }
    } else if (character.paint.randomizedCharacterImage) {
        randomizedCharacterImagePaint(ctx, character, cameraPosition, game);
    } else {
        paintCharacterColoredCircle(ctx, character, cameraPosition);
    }
    for (let ability of character.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions.paintAbility !== undefined) {
            abilityFunctions.paintAbility(ctx, character, ability, cameraPosition, game);
        }
    }
}

export function paintPlayerCharacters(ctx: CanvasRenderingContext2D, cameraPosition: Position, game: Game) {
    const playerCharacters = getPlayerCharacters(game.state.players);
    paintCharatersPets(ctx, playerCharacters, cameraPosition, game);
    paintCharatersPets(ctx, game.state.pastPlayerCharacters.characters, cameraPosition, game);
    paintCharacters(ctx, playerCharacters, cameraPosition, game);
    for (let playerChar of playerCharacters) {
        paintCharacterHpBarAboveCharacter(ctx, playerChar, cameraPosition);
        paintPlayerNameOverCharacter(ctx, playerChar, cameraPosition, game, -6);
    }
    paintCharacters(ctx, game.state.pastPlayerCharacters.characters, cameraPosition, game);
}

function paintCharacterImage(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let paintX = Math.floor(character.x - cameraPosition.x + centerX);
    let paintY = Math.floor(character.y - cameraPosition.y + centerY);

    let characterImage = getImage(character.paint.image!);
    if (characterImage) {
        ctx.drawImage(characterImage, paintX - characterImage.width / 2, paintY - characterImage.height / 2);
    }
}

function paintCharacterColoredCircle(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position) {
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let paintX = character.x - cameraPosition.x + centerX;
    let paintY = character.y - cameraPosition.y + centerY;
    if (paintX < -character.width || paintX > ctx.canvas.width
        || paintY < -character.height || paintY > ctx.canvas.height) return;
    ctx.fillStyle = character.paint.color ?? "black";
    ctx.beginPath();
    ctx.arc(
        paintX,
        paintY,
        character.width, 0, 2 * Math.PI);
    ctx.fill();
}

function randomizedCharacterImagePaint(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    let characterImage = GAME_IMAGES[IMAGE_PLAYER_PARTS];
    loadImage(characterImage, character.paint.color, character.paint.randomizedCharacterImage);
    if (characterImage.properties?.canvases
        && characterImage.properties?.canvases[randomizedCharacterImageToKey(character.paint.randomizedCharacterImage!)]) {
        let centerX = ctx.canvas.width / 2;
        let centerY = ctx.canvas.height / 2;
        let paintX = character.x - cameraPosition.x + centerX;
        let paintY = character.y - cameraPosition.y + centerY;
        if (paintX < -character.width || paintX > ctx.canvas.width
            || paintY < -character.height || paintY > ctx.canvas.height) return;

        let spriteWidth = characterImage.spriteRowWidths[0];
        let spriteHeight = 40;
        let widthIndex = moveDirectionToSpriteIndex(character);
        let animationY = 0;
        if (character.isMoving) {
            animationY = Math.floor(performance.now() / 150) % 4;
            if (animationY === 2) animationY = 0;
            if (animationY === 3) animationY = 2;
        }
        let heightFactor = 1;
        if (character.isPet) heightFactor = 0.5;
        let characterPaintX = Math.floor(paintX - character.width / 2);
        let characterPaintY = Math.floor(paintY - character.height / 2 * heightFactor);
        ctx.drawImage(
            characterImage.properties.canvases[randomizedCharacterImageToKey(character.paint.randomizedCharacterImage!)],
            widthIndex * spriteWidth,
            animationY * spriteHeight,
            spriteWidth,
            spriteHeight,
            characterPaintX,
            characterPaintY,
            character.width,
            character.height * heightFactor
        );
    }
}

function slimePaint(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    let characterImage = GAME_IMAGES[IMAGE_SLIME];
    loadImage(characterImage, character.paint.color, undefined);
    if (characterImage.properties?.canvas) {
        let centerX = ctx.canvas.width / 2;
        let centerY = ctx.canvas.height / 2;
        let paintX = character.x - cameraPosition.x + centerX;
        let paintY = character.y - cameraPosition.y + centerY;
        if (paintX < -character.width || paintX > ctx.canvas.width
            || paintY < -character.height || paintY > ctx.canvas.height) return;
        let spriteAnimation = Math.floor(game.state.time / 250) % 2;
        let spriteColor = characterImage.properties.colorToSprite!.indexOf(character.paint.color);
        let spriteWidth = characterImage.spriteRowWidths[0];
        let spriteHeight = characterImage.spriteRowHeights[0];
        ctx.drawImage(
            characterImage.properties.canvas!,
            0 + spriteAnimation * (spriteWidth + 1),
            0 + spriteColor * (spriteHeight + 1),
            spriteWidth, spriteHeight,
            Math.floor(paintX - character.width / 2),
            Math.floor(paintY - character.height / 2),
            character.width, character.height
        );
    }
}

function paintCharacterPets(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    if (character.pets !== undefined) {
        paintCharacters(ctx, character.pets, cameraPosition, game);
    }
}

function paintPlayerNameOverCharacter(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game, offsetY: number = 0) {
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let paintX = character.x - cameraPosition.x + centerX;
    let paintY = character.y - cameraPosition.y + centerY;
    if (paintX < -character.width || paintX > ctx.canvas.width
        || paintY < -character.height || paintY > ctx.canvas.height) return;

    let heightFactor = 1;
    if (character.isPet) heightFactor = 0.5;
    let nameX = Math.floor(paintX - character.width / 2);
    let nameY = Math.floor(paintY - character.height / 2 * heightFactor) - offsetY;
    paintPlayerName(ctx, character, { x: nameX, y: nameY }, game);
}


function paintPlayerName(ctx: CanvasRenderingContext2D, character: Character, paintTopLeft: Position, game: Game) {
    if (character.faction !== FACTION_PLAYER) return;
    const fontSize = 12;
    const playerOfCharacter = game.state.players.find((e) => e.character === character);
    if (!playerOfCharacter) return;
    const clientInfo = game.state.clientInfos.find((e) => e.id === playerOfCharacter.clientId);
    if (!clientInfo || !clientInfo.name) return;
    if (clientInfo.id === game.multiplayer.myClientId) return;

    ctx.fillStyle = "black";
    ctx.font = fontSize + "px Arial";

    ctx.fillText(
        clientInfo.name,
        paintTopLeft.x - clientInfo.name.length * fontSize / 4 + character.width / 2,
        paintTopLeft.y - 2
    );
}

function moveDirectionToSpriteIndex(character: Character): number {
    return (Math.floor(character.moveDirection / Math.PI / 2 * 4) + 3) % 4;
}