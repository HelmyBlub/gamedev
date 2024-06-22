import { ABILITIES_FUNCTIONS, Ability } from "../ability/ability.js";
import { FACTION_PLAYER, Game, Position } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
import { GAME_IMAGES, getImage, loadImage } from "../imageLoad.js";
import { randomizedCharacterImageToKey } from "../randomizedCharacterImage.js";
import { MoreInfoPart, createMoreInfosPart } from "../moreInfo.js";
import { getCharacterMoveSpeed, getPlayerCharacters } from "./character.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, IMAGE_PLAYER_PARTS, IMAGE_SLIME } from "./characterModel.js";
import { CHARACTER_TYPE_KING_ENEMY } from "./enemy/kingEnemy.js";
import { CharacterClass, getAverageLevelOfAbilitiesPetsCharClassId, playerCharacterClassGetAverageLevel } from "./playerCharacters/playerCharacters.js";
import { pushCharacterClassUpgradesUiTexts } from "./upgrades/characterUpgrades.js";
import { TamerPetCharacter } from "./playerCharacters/tamer/tamerPetCharacter.js";

export function paintCharacters(ctx: CanvasRenderingContext2D, characters: (Character | undefined)[], cameraPosition: Position, game: Game) {
    for (let i = 0; i < characters.length; i++) {
        const character = characters[i];
        if (!character) continue;
        const characterFunctions = CHARACTER_TYPE_FUNCTIONS[character.type];
        if (characterFunctions && characterFunctions.paintCharacterType) {
            characterFunctions.paintCharacterType(ctx, character, cameraPosition, game);
        } else {
            paintCharacterWithAbilitiesDefault(ctx, character, cameraPosition, game);
        }
    }
}

export function paintCharacterHpBarAboveCharacter(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, offsetY: number = 0) {
    const paintPos = getPointPaintPosition(ctx, character, cameraPosition);
    if (paintPos.x < -character.width || paintPos.x > ctx.canvas.width
        || paintPos.y < -character.height || paintPos.y > ctx.canvas.height) return;

    let heightFactor = 1;
    if (character.isPet) heightFactor = 0.5;
    const hpBarX = Math.floor(paintPos.x - character.width / 2);
    const hpBarY = Math.floor(paintPos.y - character.height / 2 * heightFactor);
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
    if (character.shield > 0) {
        let shieldStackCounter = Math.floor(character.shield / character.maxHp);
        const shieldStackColors = ["lightblue", "blue", "darkblue"];
        let shieldFillAmount = Math.max(0, (character.shield % character.maxHp) / character.maxHp);
        if (shieldStackCounter >= shieldStackColors.length) {
            shieldFillAmount = 1;
            shieldStackCounter = shieldStackColors.length - 1;
        }
        if (shieldStackCounter > 0) {
            ctx.fillStyle = shieldStackColors[shieldStackCounter - 1];
            ctx.fillRect(topLeftPaint.x, topLeftPaint.y - hpBarHeight, Math.ceil(bossWidth), hpBarHeight);
        }
        ctx.fillStyle = shieldStackColors[shieldStackCounter];
        ctx.fillRect(topLeftPaint.x, topLeftPaint.y - hpBarHeight, Math.ceil(bossWidth * shieldFillAmount), hpBarHeight);
    }
    ctx.beginPath();
    ctx.rect(topLeftPaint.x, topLeftPaint.y - hpBarHeight, bossWidth, hpBarHeight);
    ctx.stroke();
}

export function createCharacterMoreInfos(ctx: CanvasRenderingContext2D, character: Character): MoreInfoPart {
    const textLines: string[] = [
        `Character Stats:`,
        `HP: ${Math.ceil(character.hp).toLocaleString()}/${Math.ceil(character.maxHp).toLocaleString()}`,
        `Movement Speed: ${getCharacterMoveSpeed(character).toFixed(2)}`,
        `Type: ${character.type}`,
    ];
    if (character.type === CHARACTER_TYPE_KING_ENEMY) {
        textLines.push(`  Kings abilities get stronger the lower his HP`);
    }
    if (character.shield > 0) {
        textLines.splice(2, 0, `Shield: ${character.shield.toFixed(0)}/${(character.maxHp * character.maxShieldFactor).toFixed(0)}`);
    }
    if (character.characterClasses) {
        textLines.push(``);
        addCharacterClassMoreInfosTextLines(character.characterClasses, character.abilities, character.pets, textLines);
    }
    return createMoreInfosPart(ctx, textLines);
}

export function createCharacterClassMoreInfos(ctx: CanvasRenderingContext2D, characterClasses: CharacterClass[], abilities: Ability[] | undefined, pets: TamerPetCharacter[] | undefined): MoreInfoPart {
    const textLines: string[] = [];
    addCharacterClassMoreInfosTextLines(characterClasses, abilities, pets, textLines);
    return createMoreInfosPart(ctx, textLines);
}

export function paintCharatersPets(ctx: CanvasRenderingContext2D, characters: (Character | undefined)[], cameraPosition: Position, game: Game) {
    for (let character of characters) {
        if (!character || character.isDead) continue;
        paintCharacterPets(ctx, character, cameraPosition, game);
    }
}

export function paintCharacterWithAbilitiesDefault(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game, preventDefaultCharacterPaint: boolean | undefined = undefined) {
    if (character.isDead) return;
    paintCharacterDefault(ctx, character, cameraPosition, game, preventDefaultCharacterPaint);
    paintCharacterAbilties(ctx, character, cameraPosition, game);
}

export function paintCharacterAbilties(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    for (let ability of character.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions.paintAbility !== undefined) {
            abilityFunctions.paintAbility(ctx, character, ability, cameraPosition, game);
        }
    }
}

export function paintCharacterDefault(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game, preventDefaultCharacterPaint: boolean | undefined = undefined) {
    let tempPreventDefaultCharacterPaint = preventDefaultCharacterPaint;
    if (tempPreventDefaultCharacterPaint === undefined) {
        tempPreventDefaultCharacterPaint = character.paint.preventDefaultCharacterPaint;
    }
    if (!tempPreventDefaultCharacterPaint) {
        if (character.paint.image) {
            if (character.paint.image === IMAGE_SLIME) {
                slimePaint(ctx, character, cameraPosition, game);
                paintCharatersPets(ctx, [character], cameraPosition, game);
            } else {
                paintCharacterImage(ctx, character, cameraPosition, game);
            }
        } else if (character.paint.randomizedCharacterImage) {
            randomizedCharacterImagePaint(ctx, character, cameraPosition, game);
        } else {
            paintCharacterColoredCircle(ctx, character, cameraPosition);
        }
    }
}


export function paintPlayerCharacters(ctx: CanvasRenderingContext2D, cameraPosition: Position, game: Game) {
    const playerCharacters = getPlayerCharacters(game.state.players);
    paintCharatersPets(ctx, playerCharacters, cameraPosition, game);
    paintCharatersPets(ctx, game.state.pastPlayerCharacters.characters, cameraPosition, game);
    paintCharacters(ctx, playerCharacters, cameraPosition, game);
    for (let playerChar of playerCharacters) {
        if (playerChar.hp !== playerChar.maxHp || playerChar.shield > 0) {
            paintCharacterHpBarAboveCharacter(ctx, playerChar, cameraPosition);
            paintPlayerNameOverCharacter(ctx, playerChar, cameraPosition, game, +9);
        } else {
            paintPlayerNameOverCharacter(ctx, playerChar, cameraPosition, game);
        }
    }
    paintCharacters(ctx, game.state.pastPlayerCharacters.characters, cameraPosition, game);
}

function addCharacterClassMoreInfosTextLines(characterClasses: CharacterClass[], abilities: Ability[] | undefined, pets: TamerPetCharacter[] | undefined, textLines: string[]) {
    let first: boolean = true;
    let hasLegendary = false;
    for (let charClass of characterClasses) {
        if (first) {
            first = false;
        } else {
            textLines.push(``);
        }
        textLines.push(`Class: ${charClass.className}`);
        const classTextLine = textLines.length - 1;
        if (charClass.capped) {
            textLines[classTextLine] += " (capped)";
            textLines.push(`Capped: Abilities can now longer get stronger`);
        }
        if (charClass.gifted) textLines[classTextLine] += ` (gifted)`;
        if (charClass.legendary) {
            hasLegendary = true;
            textLines[classTextLine] += " (legendary)";
            textLines.push(`Legendary: Class levels and upgrades are permanent`);
            if (charClass.level) {
                textLines.push(`  Level Cap: ${charClass.legendary.levelCap}`);
                let blessings = "  Blessings: ";
                if (charClass.legendary.blessings.length === 0) {
                    blessings += "none";
                } else {
                    for (let i = 0; i < charClass.legendary.blessings.length; i++) {
                        if (i > 0) blessings += ", ";
                        blessings += charClass.legendary.blessings[i];
                    }
                }
                textLines.push(blessings);
            }
        };
        if (charClass.level) {
            let levelCap = "";
            if (charClass.legendary && charClass.legendary.levelCap) {
                levelCap = `/${charClass.legendary.levelCap}`;
            }
            textLines.push(`Level: ${charClass.level.level}${levelCap}`);
            if (charClass.level.leveling && !charClass.gifted) {
                textLines.push(`XP: ${Math.floor(charClass.level.leveling.experience)}/${Math.floor(charClass.level.leveling.experienceForLevelUp)}`);
                textLines.push(`Gains XP for every enemy killed by anyone.`);
            }
        } else {
            const avgLevel = getAverageLevelOfAbilitiesPetsCharClassId(charClass.id, abilities, pets);
            let levelCapText = "";
            if (charClass.legendary) {

            }
            textLines.push(`Level: ${avgLevel.toFixed()}${levelCapText}`);
        }
        if (charClass.availableSkillPoints) textLines.push(`SkillPoints: ${charClass.availableSkillPoints.available}`);
        pushCharacterClassUpgradesUiTexts(textLines, charClass);
    }
    if (hasLegendary) {
        textLines.push(``);
        textLines.push(`Legendary levels and upgrades are permanent,`);
        textLines.push(`but they are cappped. Cap can be increased`);
        textLines.push(`by gaining blessing from defeating a king`);
        textLines.push(`of each celestial direction.`);
    }
}

function paintCharacterImage(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    const paintPos = getPointPaintPosition(ctx, character, cameraPosition);
    const characterImage = getImage(character.paint.image!);
    if (characterImage) {
        ctx.drawImage(characterImage, paintPos.x - characterImage.width / 2, paintPos.y - characterImage.height / 2);
    }
}

function paintCharacterColoredCircle(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position) {
    const paintPos = getPointPaintPosition(ctx, character, cameraPosition);
    if (paintPos.x < -character.width || paintPos.x > ctx.canvas.width
        || paintPos.y < -character.height || paintPos.y > ctx.canvas.height) return;
    ctx.fillStyle = character.paint.color ?? "black";
    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        character.width, 0, 2 * Math.PI);
    ctx.fill();
}

function randomizedCharacterImagePaint(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    const characterImage = GAME_IMAGES[IMAGE_PLAYER_PARTS];
    loadImage(characterImage, character.paint.color, character.paint.randomizedCharacterImage);
    if (characterImage.properties?.canvases
        && characterImage.properties?.canvases[randomizedCharacterImageToKey(character.paint.randomizedCharacterImage!)]) {
        const paintPos = getPointPaintPosition(ctx, character, cameraPosition);
        if (paintPos.x < -character.width || paintPos.x > ctx.canvas.width
            || paintPos.y < -character.height || paintPos.y > ctx.canvas.height) return;

        const spriteWidth = characterImage.spriteRowWidths[0];
        const spriteHeight = 40;
        const widthIndex = moveDirectionToSpriteIndex(character);
        let animationY = 0;
        if (character.isMoving) {
            animationY = Math.floor(game.state.time / 150) % 4;
            if (animationY === 2) animationY = 0;
            if (animationY === 3) animationY = 2;
        }
        let heightFactor = 1;
        if (character.isPet) heightFactor = 0.5;
        const characterPaintX = Math.floor(paintPos.x - character.width / 2);
        const characterPaintY = Math.floor(paintPos.y - character.height / 2 * heightFactor);
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
    const characterImage = GAME_IMAGES[IMAGE_SLIME];
    loadImage(characterImage, character.paint.color, undefined);
    if (characterImage.properties?.canvas) {
        const paintPos = getPointPaintPosition(ctx, character, cameraPosition);
        if (paintPos.x < -character.width || paintPos.x > ctx.canvas.width
            || paintPos.y < -character.height || paintPos.y > ctx.canvas.height) return;
        const spriteAnimation = Math.floor(game.state.time / 250) % 2;
        const spriteColor = characterImage.properties.colorToSprite!.indexOf(character.paint.color);
        const spriteWidth = characterImage.spriteRowWidths[0];
        const spriteHeight = characterImage.spriteRowHeights[0];
        ctx.drawImage(
            characterImage.properties.canvas!,
            0 + spriteAnimation * (spriteWidth + 1),
            0 + spriteColor * (spriteHeight + 1),
            spriteWidth, spriteHeight,
            Math.floor(paintPos.x - character.width / 2),
            Math.floor(paintPos.y - character.height / 2),
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
    const paintPos = getPointPaintPosition(ctx, character, cameraPosition);
    if (paintPos.x < -character.width || paintPos.x > ctx.canvas.width
        || paintPos.y < -character.height || paintPos.y > ctx.canvas.height) return;

    let heightFactor = 1;
    if (character.isPet) heightFactor = 0.5;
    const nameX = Math.floor(paintPos.x - character.width / 2);
    const nameY = Math.floor(paintPos.y - character.height / 2 * heightFactor) - offsetY;
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