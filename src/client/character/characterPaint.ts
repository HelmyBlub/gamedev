import { ABILITIES_FUNCTIONS, paintDefaultAbilityStatsUI } from "../ability/ability.js";
import { FACTION_PLAYER, Game, Position } from "../gameModel.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { randomizedCharacterImageToKey } from "../randomizedCharacterImage.js";
import { CHARACTER_TYPE_FUNCTIONS, Character } from "./characterModel.js";
import { ABILITY_LEVELING_CHARACTER, AbilityLevelingCharacter } from "./playerCharacters/abilityLevelingCharacter.js";
import { LEVELING_CHARACTER, LevelingCharacter } from "./playerCharacters/levelingCharacterModel.js";
import { TAMER_PET_CHARACTER } from "./playerCharacters/tamer/tamerPetCharacter.js";

export function paintCharacters(ctx: CanvasRenderingContext2D, characters: Character[], cameraPosition: Position, game: Game) {
    for (let i = 0; i < characters.length; i++) {
        const character = characters[i];
        const characterFunctions = CHARACTER_TYPE_FUNCTIONS[character.type];
        if(characterFunctions && characterFunctions.paintCharacterType){
            characterFunctions.paintCharacterType(ctx, character, cameraPosition, game);
        }else{
            paintCharacter(ctx, character, cameraPosition, game);
        }
    }
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

export function paintCharacter(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    if (character.isDead) return;
    paintCharacterPets(ctx, character, cameraPosition, game);

    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let paintX = character.x - cameraPosition.x + centerX;
    let paintY = character.y - cameraPosition.y + centerY;
    if (paintX < -character.width || paintX > ctx.canvas.width
        || paintY < -character.height || paintY > ctx.canvas.height) return;

    let characterImageId = "slime";
    if (character.faction === FACTION_PLAYER && character.type !== TAMER_PET_CHARACTER) characterImageId = FACTION_PLAYER;
    let characterImage = GAME_IMAGES[characterImageId];
    if (characterImage) {
        if (characterImage.imagePath !== undefined) {
            loadImage(characterImage, character.color, character.randomizedCharacterImage);
            if (characterImage.properties?.canvas) {
                if (characterImageId === "slime") {
                    let spriteAnimation = Math.floor(game.state.time / 250) % 2;
                    let spriteColor = characterImage.properties.colorToSprite!.indexOf(character.color);
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
            } else if (characterImage.properties?.canvases
                && character.randomizedCharacterImage
                && characterImage.properties?.canvases[randomizedCharacterImageToKey(character.randomizedCharacterImage)]
            ) {
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
                    characterImage.properties.canvases[randomizedCharacterImageToKey(character.randomizedCharacterImage)],
                    widthIndex * spriteWidth,
                    animationY * spriteHeight,
                    spriteWidth,
                    spriteHeight,
                    characterPaintX,
                    characterPaintY,
                    character.width,
                    character.height * heightFactor
                );
                paintCharacterHpBar(ctx, character, { x: characterPaintX, y: characterPaintY });
                paintPlayerNameOverCharacter(ctx, character, { x: characterPaintX, y: characterPaintY - 6 }, game);
            }
        } else {
            console.log("missing image path for enemy", characterImageId);
        }
    } else {
        ctx.fillStyle = character.color;
        ctx.beginPath();
        ctx.arc(
            paintX,
            paintY,
            character.width, 0, 2 * Math.PI);
        ctx.fill();
    }
    for (let ability of character.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions.paintAbility !== undefined) {
            abilityFunctions.paintAbility(ctx, character, ability, cameraPosition, game);
        }
    }
}

function paintCharacterPets(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game){
    if (character.pets !== undefined) {
        paintCharacters(ctx, character.pets, cameraPosition, game);
    }
}

function paintPlayerNameOverCharacter(ctx: CanvasRenderingContext2D, character: Character, paintTopLeft: Position, game: Game) {
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