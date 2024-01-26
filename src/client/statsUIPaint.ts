import { Ability, createStatsUisAbilities } from "./ability/ability.js";
import { findMyCharacter } from "./character/character.js";
import { Character } from "./character/characterModel.js";
import { createCharacterClassStatsUI, createCharacterStatsUI } from "./character/characterPaint.js";
import { TamerPetCharacter, createTamerPetsCharacterStatsUI } from "./character/playerCharacters/tamer/tamerPetCharacter.js";
import { findClosestInteractable } from "./game.js";
import { Game } from "./gameModel.js";
import { createStatsUIForMabObject } from "./map/mapObjects.js";

export type StatsUI = {
    texts: string[],
    fontSize: number,
    width: number,
    height: number
}

export function createStatsUI(ctx: CanvasRenderingContext2D, texts: string[], fontSize: number = 14): StatsUI {
    ctx.font = fontSize + "px Arial";
    let width = 0;
    for (let text of texts) {
        let currentWidth = ctx.measureText(text).width + 4;
        if (currentWidth > width) width = currentWidth;
    }
    const height = texts.length * fontSize + 6;
    return {
        fontSize: fontSize,
        height: height,
        texts: texts,
        width: width,
    }
}

export function createRequiredStatsUis(ctx: CanvasRenderingContext2D, game: Game): StatsUI[] {
    let character = findMyCharacter(game);
    if (!character) return [];
    let result: StatsUI[] = [];
    const closest = findClosestInteractable(game);
    if (closest) {
        if (closest.pastCharacter) {
            character = closest.pastCharacter;
            if (character.characterClasses) {
                for (let charClass of character.characterClasses)
                    if (!charClass.gifted) {
                        result.push(createCharacterClassStatsUI(ctx, [charClass]));
                    }
            }

            if (character.pets) {
                let pets: TamerPetCharacter[] = [];
                for (let pet of character.pets) {
                    if (!pet.gifted) pets.push(pet);
                }
                result.push(...createTamerPetsCharacterStatsUI(ctx, pets));
            }
            let abilities: Ability[] = [];
            for (let ability of character.abilities) {
                if (!ability.gifted) abilities.push(ability);
            }
            result.push(...createStatsUisAbilities(ctx, abilities, game));

        } else if (closest.mapObject) {
            result.push(...createStatsUIForMabObject(closest.mapObject, game));
        }
    }
    if (result.length === 0) {
        result.push(createGameRulesStatsUI(ctx));
        result.push(createCharacterStatsUI(ctx, character));
        result.push(...createTamerPetsCharacterStatsUI(ctx, character.pets));
        result.push(...createStatsUisAbilities(ctx, character.abilities, game));
    }
    return result;
}

export function paintStatsUis(ctx: CanvasRenderingContext2D, statsUIs: StatsUI[]) {
    let paintX = 10;
    let paintY = 60;
    let horizontalSpacing = 5;
    for (let statsUi of statsUIs) {
        paintStatsUI(ctx, statsUi, paintX, paintY);
        paintX += statsUi.width + horizontalSpacing;
    }
}

function paintStatsUI(ctx: CanvasRenderingContext2D, statsUI: StatsUI, drawStartX: number, drawStartY: number) {
    const verticalSpacing = 1;
    ctx.font = statsUI.fontSize + "px Arial";
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, statsUI.width, statsUI.height);
    ctx.fillStyle = "black";
    for (let i = 0; i < statsUI.texts.length; i++) {
        ctx.fillText(statsUI.texts[i], drawStartX + 2, drawStartY + statsUI.fontSize * (i + verticalSpacing) + 2);
    }
}

function createGameRulesStatsUI(ctx: CanvasRenderingContext2D): StatsUI {
    const textLines: string[] = [
        `Game Rules:`,
        `Game timer starts when first enemy is killed.`,
        `On 30seconds a expanding death zone`,
        `beginns to grow.`,
        `Every minute one boss enemy spawns.`,
    ];
    return createStatsUI(ctx, textLines);
}
