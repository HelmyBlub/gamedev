import { Ability, createStatsUisAbilities } from "./ability/ability.js";
import { findMyCharacter } from "./character/character.js";
import { Character } from "./character/characterModel.js";
import { createCharacterClassStatsUI, createCharacterStatsUI } from "./character/characterPaint.js";
import { TamerPetCharacter, createTamerPetsCharacterStatsUI } from "./character/playerCharacters/tamer/tamerPetCharacter.js";
import { findClosestInteractable, getRelativeMousePoistion } from "./game.js";
import { Game } from "./gameModel.js";
import { createHighscoresStatsUIs } from "./highscores.js";
import { createStatsUIForMabObject } from "./map/mapObjects.js";

export type StatsUIPart = {
    texts: string[],
    fontSize: number,
    width: number,
    height: number
}

export type StatsUIsPartContainers = {
    selected: string | undefined,
    containers: { [type: string]: StatsUIsPartContainer }
}

export type StatsUIsPartContainer = {
    heading: string,
    headingWidth: number,
    headingPaintX: number,
    statsUIs: StatsUIPart[],
    subContainer: StatsUIsPartContainers,
}

export type StatsUIs = {
    paintStartX: number,
    paintStartY: number,
    headingFontSize: number,
    headingBottomPadding: number,
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
        containers: { containers: {}, selected: undefined },
        paintStartX: 10,
        paintStartY: 60,
        headingFontSize: 26,
        headingBottomPadding: 8,
    };
}

export function statsUIsHandleMouseClick(event: MouseEvent, game: Game) {
    if (!game.UI.displayLongInfos) return;
    const statsUi = game.UI.statsUi;
    let mouseClickPos = getRelativeMousePoistion(event);
    if (statsUi.paintStartY <= mouseClickPos.y
        && statsUi.paintStartY + statsUi.headingFontSize + statsUi.headingBottomPadding >= mouseClickPos.y
    ) {
        const containerKeys = Object.keys(statsUi.containers.containers);
        for (let key of containerKeys) {
            const container = statsUi.containers.containers[key];
            if (container.headingPaintX <= mouseClickPos.x
                && container.headingPaintX + container.headingWidth >= mouseClickPos.x
            ) {
                statsUi.containers.selected = key;
                return;
            }
        }
    } else if (statsUi.containers.selected) {
        let containerY = statsUi.paintStartY + statsUi.headingFontSize + statsUi.headingBottomPadding + 4;
        if (containerY <= mouseClickPos.y
            && containerY + statsUi.headingFontSize + statsUi.headingBottomPadding >= mouseClickPos.y
        ) {
            const selectedContainer = statsUi.containers.containers[statsUi.containers.selected];
            const containerKeys = Object.keys(selectedContainer.subContainer.containers);
            for (let key of containerKeys) {
                const container = selectedContainer.subContainer.containers[key];
                if (container.headingPaintX <= mouseClickPos.x
                    && container.headingPaintX + container.headingWidth >= mouseClickPos.x
                ) {
                    selectedContainer.subContainer.selected = key;
                    return;
                }
            }
        }
    }
}

export function createRequiredStatsUis(ctx: CanvasRenderingContext2D, game: Game): StatsUIs {
    const character = findMyCharacter(game);
    const statsUIs: StatsUIs = createDefaultEmptyStatsUis();
    const horizontalHeadingSpacing = 5;
    let paintX = statsUIs.paintStartX;
    let containerHeading: string = "";
    if (!character) return statsUIs;

    containerHeading = "Game Rules";
    statsUIs.containers.containers[containerHeading] = createDefaultStatsUiContainer(ctx, containerHeading, statsUIs.headingFontSize, paintX);
    paintX += statsUIs.containers.containers[containerHeading].headingWidth + horizontalHeadingSpacing;
    statsUIs.containers.containers[containerHeading].statsUIs.push(createGameRulesStatsUI(ctx));

    containerHeading = "Character";
    statsUIs.containers.selected = containerHeading;
    statsUIs.containers.containers[containerHeading] = createDefaultStatsUiContainer(ctx, containerHeading, statsUIs.headingFontSize, paintX);
    paintX += statsUIs.containers.containers[containerHeading].headingWidth + horizontalHeadingSpacing;

    let subPaintX = statsUIs.paintStartX;
    const subContainerPets = createDefaultStatsUiContainer(ctx, "Pets", statsUIs.headingFontSize, subPaintX);
    subPaintX += subContainerPets.headingWidth + horizontalHeadingSpacing;
    statsUIs.containers.containers[containerHeading].subContainer.containers[subContainerPets.heading] = subContainerPets;
    const subContainerAbility = createDefaultStatsUiContainer(ctx, "Ability", statsUIs.headingFontSize, subPaintX);
    statsUIs.containers.containers[containerHeading].subContainer.containers[subContainerAbility.heading] = subContainerAbility;

    statsUIs.containers.containers[containerHeading].statsUIs.push(createCharacterStatsUI(ctx, character));
    subContainerPets.statsUIs.push(...createTamerPetsCharacterStatsUI(ctx, character.pets));
    subContainerAbility.statsUIs.push(...createStatsUisAbilities(ctx, character.abilities, game));

    const closest = findClosestInteractable(game);
    if (closest) {
        if (closest.pastCharacter) {
            const statsUIContainer = createPastCharacterStatsUI(ctx, closest.pastCharacter, statsUIs, paintX, game);
            statsUIs.containers.containers[statsUIContainer.heading] = statsUIContainer;
            statsUIs.containers.selected = statsUIContainer.heading;
            paintX += statsUIContainer.headingWidth + horizontalHeadingSpacing;

        } else if (closest.mapObject) {
            containerHeading = closest.mapObject.name;
            statsUIs.containers.selected = containerHeading;
            statsUIs.containers.containers[containerHeading] = createDefaultStatsUiContainer(ctx, containerHeading, statsUIs.headingFontSize, paintX);
            paintX += statsUIs.containers.containers[containerHeading].headingWidth + horizontalHeadingSpacing;
            statsUIs.containers.containers[containerHeading].statsUIs.push(...createStatsUIForMabObject(closest.mapObject, game));
        }
    }

    containerHeading = "Highscores";
    statsUIs.containers.containers[containerHeading] = createDefaultStatsUiContainer(ctx, containerHeading, statsUIs.headingFontSize, paintX);
    paintX += statsUIs.containers.containers[containerHeading].headingWidth + horizontalHeadingSpacing;
    statsUIs.containers.containers[containerHeading].statsUIs.push(...createHighscoresStatsUIs(ctx, game.state.highscores));

    return statsUIs;
}

export function paintStatsUis(ctx: CanvasRenderingContext2D, statsUIs: StatsUIs) {
    let paintX = statsUIs.paintStartX;
    let paintY = statsUIs.paintStartY;
    paintY = paintStatsUisContainers(ctx, statsUIs.containers, statsUIs, paintY);
    if (statsUIs.containers.selected) {
        paintStatsUIiPartsContainer(ctx, statsUIs.containers.containers[statsUIs.containers.selected], paintX, paintY);
    }
}

function paintStatsUisContainers(ctx: CanvasRenderingContext2D, containers: StatsUIsPartContainers, statsUIs: StatsUIs, paintY: number): number {
    const containerKeys = Object.keys(containers.containers);
    let subPaintY = paintY;
    if (containers.selected === undefined) {
        containers.selected = containerKeys[0];
    }
    const fontSize = statsUIs.headingFontSize;
    ctx.font = fontSize + "px Arial";

    for (let key of containerKeys) {
        const container = containers.containers[key];
        ctx.fillStyle = "white";
        ctx.fillRect(container.headingPaintX, paintY, container.headingWidth, fontSize + statsUIs.headingBottomPadding);
        ctx.fillStyle = key === containers.selected ? "black" : "gray";
        ctx.fillText(
            container.heading,
            container.headingPaintX,
            paintY + fontSize + 2
        );
    }
    subPaintY += fontSize + statsUIs.headingBottomPadding + 4;
    if (Object.keys(containers.containers[containers.selected].subContainer.containers).length > 0) {
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
    if (statsUIPartsContainer.subContainer.selected) {
        paintStatsUIiPartsContainer(ctx, statsUIPartsContainer.subContainer.containers[statsUIPartsContainer.subContainer.selected], paintX, paintY);
    }
}

function createPastCharacterStatsUI(ctx: CanvasRenderingContext2D, pastCharacter: Character, statsUIs: StatsUIs, paintX: number, game: Game): StatsUIsPartContainer {
    const containerHeading = "Past Character";
    const statsUIsPartContainer = createDefaultStatsUiContainer(ctx, containerHeading, statsUIs.headingFontSize, paintX);
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
    return statsUIsPartContainer;
}

function createDefaultStatsUiContainer(ctx: CanvasRenderingContext2D, heading: string, fontSize: number, paintX: number): StatsUIsPartContainer {
    ctx.font = `${fontSize}px Arial`;
    const width = ctx.measureText(heading).width;
    return {
        heading: heading,
        headingPaintX: paintX,
        headingWidth: width + 4,
        statsUIs: [],
        subContainer: { selected: undefined, containers: {} },
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
