import { Ability, createStatsUisAbilities } from "./ability/ability.js";
import { findMyCharacter } from "./character/character.js";
import { Character } from "./character/characterModel.js";
import { createCharacterClassStatsUI, createCharacterStatsUI } from "./character/characterPaint.js";
import { TamerPetCharacter, createTamerPetsCharacterStatsUI } from "./character/playerCharacters/tamer/tamerPetCharacter.js";
import { findClosestInteractable, getRelativeMousePoistion } from "./game.js";
import { Game } from "./gameModel.js";
import { createHighscoresStatsUIs } from "./highscores.js";
import { createStatsUIForMabObject } from "./map/mapObjects.js";
import { findPlayerById } from "./player.js";

export type StatsUIPart = {
    texts: string[],
    fontSize: number,
    width: number,
    height: number
}

export type StatsUIsPartContainers = {
    selected: number,
    containers: StatsUIsPartContainer[],
}

export type StatsUIsPartContainer = {
    heading: string,
    headingWidth: number,
    statsUIs: StatsUIPart[],
    subContainer: StatsUIsPartContainers,
}

export type StatsUIs = {
    paintStartX: number,
    paintStartY: number,
    headingFontSize: number,
    headingBottomPadding: number,
    headingHorizontalSpacing: number,
    containers: StatsUIsPartContainers,
}

export function createStatsUI(ctx: CanvasRenderingContext2D, texts: string[], fontSize: number = 14): StatsUIPart {
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

export function createDefaultEmptyStatsUis(): StatsUIs {
    return {
        containers: { containers: [], selected: 0 },
        paintStartX: 10,
        paintStartY: 60,
        headingFontSize: 26,
        headingBottomPadding: 8,
        headingHorizontalSpacing: 5,
    };
}

export function statsUIsHandleMouseClick(event: MouseEvent, game: Game) {
    if (!game.UI.displayLongInfos) return;
    const statsUIs = game.UI.statsUIs;
    let mouseClickPos = getRelativeMousePoistion(event);
    if (statsUIs.paintStartY <= mouseClickPos.y
        && statsUIs.paintStartY + statsUIs.headingFontSize + statsUIs.headingBottomPadding >= mouseClickPos.y
    ) {
        let paintX = statsUIs.paintStartX;
        for (let i = 0; i < statsUIs.containers.containers.length; i++) {
            const container = statsUIs.containers.containers[i];
            if (paintX <= mouseClickPos.x
                && paintX + container.headingWidth >= mouseClickPos.x
            ) {
                statsUIs.containers.selected = i;
                return;
            }
            paintX += container.headingWidth + statsUIs.headingHorizontalSpacing;
        }
    } else {
        let containerY = statsUIs.paintStartY + statsUIs.headingFontSize + statsUIs.headingBottomPadding + 4;
        if (containerY <= mouseClickPos.y
            && containerY + statsUIs.headingFontSize + statsUIs.headingBottomPadding >= mouseClickPos.y
        ) {
            const selectedContainer = statsUIs.containers.containers[statsUIs.containers.selected];
            let paintX = statsUIs.paintStartX;
            for (let i = 0; i < statsUIs.containers.containers.length; i++) {
                const container = selectedContainer.subContainer.containers[i];
                if (paintX <= mouseClickPos.x
                    && paintX + container.headingWidth >= mouseClickPos.x
                ) {
                    selectedContainer.subContainer.selected = i;
                    return;
                }
                paintX += container.headingWidth + statsUIs.headingHorizontalSpacing;
            }
        }
    }
}

export function createRequiredStatsUis(game: Game): StatsUIs {
    const ctx = game.ctx;
    const statsUIs: StatsUIs = createDefaultEmptyStatsUis();
    if (!ctx) return statsUIs;
    let paintX = statsUIs.paintStartX;

    const gameRuleContainer = createDefaultStatsUiContainer(ctx, "Game Rules", statsUIs.headingFontSize);
    statsUIs.containers.containers.push(gameRuleContainer);
    paintX += gameRuleContainer.headingWidth + statsUIs.headingHorizontalSpacing;
    gameRuleContainer.statsUIs.push(createGameRulesStatsUI(ctx));


    for (let client of game.state.clientInfos) {
        const player = findPlayerById(game.state.players, client.id);
        if (!player) continue;
        let heading = client.name ? client.name : "Character";
        const characterContainer = createCharacterStatsUIPartContainer(ctx, player.character, statsUIs, game, heading);
        statsUIs.containers.containers.push(characterContainer);
        if (game.multiplayer.myClientId === client.id) {
            statsUIs.containers.selected = statsUIs.containers.containers.length - 1;
            const selectedSub = statsUIs.containers.containers[statsUIs.containers.selected];
            if (selectedSub.subContainer.containers.length > 0
                && player.character.upgradeChoices.length > 0
                && player.character.characterClasses
            ) {
                const charClassId = player.character.upgradeChoices[0].classIdRef;
                for (let i = 0; i < player.character.characterClasses.length; i++) {
                    if (charClassId === player.character.characterClasses[i].id) {
                        if (i < selectedSub.subContainer.containers.length) {
                            selectedSub.subContainer.selected = i;
                        }
                        break;
                    }
                }
            }
        }
        paintX += characterContainer.headingWidth + statsUIs.headingHorizontalSpacing;
    }

    const closest = findClosestInteractable(game);
    if (closest) {
        if (closest.pastCharacter) {
            const statsUIContainer = createPastCharacterStatsUI(ctx, closest.pastCharacter, statsUIs, game);
            statsUIs.containers.containers.push(statsUIContainer);
            statsUIs.containers.selected = statsUIs.containers.containers.length - 1;
            paintX += statsUIContainer.headingWidth + statsUIs.headingHorizontalSpacing;

        } else if (closest.mapObject) {
            const statsUIContainer = createStatsUIForMabObject(closest.mapObject, game);
            if (statsUIContainer) {
                statsUIs.containers.containers.push(statsUIContainer);
                statsUIs.containers.selected = statsUIs.containers.containers.length - 1;
                paintX += statsUIContainer.headingWidth + statsUIs.headingHorizontalSpacing;
            }
        }
    }

    const highscoreContainer = createDefaultStatsUiContainer(ctx, "Highscores", statsUIs.headingFontSize);
    statsUIs.containers.containers.push(highscoreContainer);
    paintX += highscoreContainer.headingWidth + statsUIs.headingHorizontalSpacing;
    highscoreContainer.statsUIs.push(...createHighscoresStatsUIs(ctx, game.state.highscores));

    return statsUIs;
}

export function paintStatsUis(ctx: CanvasRenderingContext2D, statsUIs: StatsUIs, game: Game) {
    if (!game.UI.displayLongInfos) return;
    let paintX = statsUIs.paintStartX;
    let paintY = statsUIs.paintStartY;
    paintY = paintStatsUisContainers(ctx, statsUIs.containers, statsUIs, paintY);
    if (statsUIs.containers.containers.length > 0) {
        paintStatsUIiPartsContainer(ctx, statsUIs.containers.containers[statsUIs.containers.selected], paintX, paintY);
    }
}

export function createCharacterStatsUIPartContainer(ctx: CanvasRenderingContext2D, character: Character, statsUIs: StatsUIs, game: Game, heading: string = "Character"): StatsUIsPartContainer {
    const characterContainer = createDefaultStatsUiContainer(ctx, heading, statsUIs.headingFontSize);
    characterContainer.statsUIs.push(createCharacterStatsUI(ctx, character));

    let subHeadingPaintX = statsUIs.paintStartX;
    let hasMoreThanOneCharacterClass = false;
    if (character.characterClasses && character.characterClasses.length > 1) {
        hasMoreThanOneCharacterClass = true;
        for (let charClass of character.characterClasses) {
            const subContainer = createDefaultStatsUiContainer(ctx, charClass.className, statsUIs.headingFontSize);
            subHeadingPaintX += subContainer.headingWidth + statsUIs.headingHorizontalSpacing;
            characterContainer.subContainer.containers.push(subContainer);
            if (character.pets) {
                const charClassPets: TamerPetCharacter[] = [];
                for (let pet of character.pets) {
                    if (pet.classIdRef === charClass.id) charClassPets.push(pet);
                }
                subContainer.statsUIs.push(...createTamerPetsCharacterStatsUI(ctx, charClassPets));
            }
            const charClassAbilities: Ability[] = [];
            for (let ability of character.abilities) {
                if (ability.classIdRef === charClass.id) charClassAbilities.push(ability);
            }
            subContainer.statsUIs.push(...createStatsUisAbilities(ctx, charClassAbilities, game));
        }
    }
    if (character.pets) {
        const classlessPets: TamerPetCharacter[] = [];
        for (let pet of character.pets) {
            if (pet.classIdRef === undefined || !hasMoreThanOneCharacterClass) classlessPets.push(pet);
        }
        characterContainer.statsUIs.push(...createTamerPetsCharacterStatsUI(ctx, classlessPets));
    }
    const classlessAbilities: Ability[] = [];
    for (let ability of character.abilities) {
        if (ability.classIdRef === undefined || !hasMoreThanOneCharacterClass) classlessAbilities.push(ability);
    }
    characterContainer.statsUIs.push(...createStatsUisAbilities(ctx, classlessAbilities, game));
    return characterContainer;
}

function paintStatsUisContainers(ctx: CanvasRenderingContext2D, containers: StatsUIsPartContainers, statsUIs: StatsUIs, paintY: number): number {
    let subPaintY = paintY;
    const fontSize = statsUIs.headingFontSize;
    ctx.font = fontSize + "px Arial";

    let paintX = statsUIs.paintStartX;
    for (let i = 0; i < containers.containers.length; i++) {
        const container = containers.containers[i];
        ctx.fillStyle = "white";
        ctx.fillRect(paintX, paintY, container.headingWidth, fontSize + statsUIs.headingBottomPadding);
        ctx.fillStyle = i === containers.selected ? "black" : "gray";
        ctx.fillText(
            container.heading,
            paintX,
            paintY + fontSize + 2
        );
        paintX += container.headingWidth + statsUIs.headingHorizontalSpacing;
    }
    subPaintY += fontSize + statsUIs.headingBottomPadding + 4;
    if (containers.containers[containers.selected].subContainer.containers.length > 0) {
        subPaintY = paintStatsUisContainers(ctx, containers.containers[containers.selected].subContainer, statsUIs, subPaintY);
    }
    return subPaintY;
}

export function paintStatsUIiPartsContainer(ctx: CanvasRenderingContext2D, statsUIPartsContainer: StatsUIsPartContainer, drawStartX: number = 10, drawStartY: number = 60) {
    let paintX = drawStartX;
    let paintY = drawStartY;
    let horizontalSpacing = 5;
    for (let part of statsUIPartsContainer.statsUIs) {
        paintStatsUIPart(ctx, part, paintX, paintY);
        paintX += part.width + horizontalSpacing;
    }
    if (statsUIPartsContainer.subContainer.containers.length > 0) {
        paintStatsUIiPartsContainer(ctx, statsUIPartsContainer.subContainer.containers[statsUIPartsContainer.subContainer.selected], paintX, paintY);
    }
}

function createPastCharacterStatsUI(ctx: CanvasRenderingContext2D, pastCharacter: Character, statsUIs: StatsUIs, game: Game): StatsUIsPartContainer {
    const containerHeading = "Past Character";
    const statsUIsPartContainer = createDefaultStatsUiContainer(ctx, containerHeading, statsUIs.headingFontSize);
    const pastCharacterDefaultTexts: string[] = [
        `Past Characters are the characters which you`,
        `played before.`,
        ``,
        `They can gift their original Abilities.`,
        `Abilities can only be gifted once.`,
    ]
    statsUIsPartContainer.statsUIs.push(createStatsUI(ctx, pastCharacterDefaultTexts))
    if (pastCharacter.characterClasses) {
        for (let charClass of pastCharacter.characterClasses)
            if (!charClass.gifted) {
                statsUIsPartContainer.statsUIs.push(createCharacterClassStatsUI(ctx, [charClass]));
            }
    }

    if (pastCharacter.pets) {
        let pets: TamerPetCharacter[] = [];
        for (let pet of pastCharacter.pets) {
            if (pet.tradable) pets.push(pet);
        }
        statsUIsPartContainer.statsUIs.push(...createTamerPetsCharacterStatsUI(ctx, pets));
    }
    let abilities: Ability[] = [];
    for (let ability of pastCharacter.abilities) {
        if (ability.tradable) abilities.push(ability);
    }
    statsUIsPartContainer.statsUIs.push(...createStatsUisAbilities(ctx, abilities, game));
    if (statsUIsPartContainer.statsUIs.length <= 1) {
        statsUIsPartContainer.statsUIs.push(createStatsUI(ctx, [`This Character has nothing to gift.`]))
    }
    return statsUIsPartContainer;
}

export function createDefaultStatsUiContainer(ctx: CanvasRenderingContext2D, heading: string, fontSize: number): StatsUIsPartContainer {
    ctx.font = `${fontSize}px Arial`;
    const width = ctx.measureText(heading).width;
    return {
        heading: heading,
        headingWidth: width + 4,
        statsUIs: [],
        subContainer: { selected: 0, containers: [] },
    };
}

export function paintStatsUIPart(ctx: CanvasRenderingContext2D, statsUIPart: StatsUIPart, drawStartX: number = 10, drawStartY: number = 60) {
    const verticalSpacing = 1;
    ctx.font = statsUIPart.fontSize + "px Arial";
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, statsUIPart.width, statsUIPart.height);
    ctx.fillStyle = "black";
    for (let i = 0; i < statsUIPart.texts.length; i++) {
        ctx.fillText(statsUIPart.texts[i], drawStartX + 2, drawStartY + statsUIPart.fontSize * (i + verticalSpacing) + 2);
    }
}

function createGameRulesStatsUI(ctx: CanvasRenderingContext2D): StatsUIPart {
    const textLines: string[] = [
        `Game timer starts when first enemy is killed.`,
        `On 30seconds a expanding death zone`,
        `beginns to grow.`,
        `Every minute one boss enemy spawns.`,
    ];
    return createStatsUI(ctx, textLines);
}
