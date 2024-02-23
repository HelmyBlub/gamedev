import { Ability, createMoreInfosAbilities } from "./ability/ability.js";
import { findMyCharacter } from "./character/character.js";
import { Character } from "./character/characterModel.js";
import { createCharacterClassMoreInfos, createCharacterMoreInfos } from "./character/characterPaint.js";
import { getCelestialDirection } from "./character/enemy/bossEnemy.js";
import { fixPositionRespawnEnemyCreateMoreInfos } from "./character/enemy/fixPositionRespawnEnemy.js";
import { kingCreateMoreInfos } from "./character/enemy/kingEnemy.js";
import { TamerPetCharacter, createTamerPetsCharacterMoreInfos } from "./character/playerCharacters/tamer/tamerPetCharacter.js";
import { findClosestInteractable, getRelativeMousePoistion } from "./game.js";
import { Game } from "./gameModel.js";
import { createHighscoresMoreInfos } from "./highscores.js";
import { createMoreInfosForMabObject } from "./map/mapObjects.js";
import { findPlayerById } from "./player.js";

export type MoreInfoPart = {
    texts: string[],
    fontSize: number,
    width: number,
    height: number
}

export type MoreInfosPartContainers = {
    selected: number,
    containers: MoreInfosPartContainer[],
}

export type MoreInfosPartContainer = {
    heading: string,
    headingWidth: number,
    moreInfoParts: MoreInfoPart[],
    subContainer: MoreInfosPartContainers,
}

export type MoreInfos = {
    paintStartX: number,
    paintStartY: number,
    headingFontSize: number,
    headingBottomPadding: number,
    headingHorizontalSpacing: number,
    containers: MoreInfosPartContainers,
}

export function createMoreInfosUI(ctx: CanvasRenderingContext2D, texts: string[], fontSize: number = 14): MoreInfoPart {
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

export function createDefaultEmptyMoreInfos(): MoreInfos {
    return {
        containers: { containers: [], selected: 0 },
        paintStartX: 10,
        paintStartY: 60,
        headingFontSize: 26,
        headingBottomPadding: 8,
        headingHorizontalSpacing: 5,
    };
}

export function moreInfosHandleMouseClick(event: MouseEvent, game: Game) {
    if (!game.UI.displayMoreInfos) return;
    const moreInfos = game.UI.moreInfos;
    let mouseClickPos = getRelativeMousePoistion(event);
    if (moreInfos.paintStartY <= mouseClickPos.y
        && moreInfos.paintStartY + moreInfos.headingFontSize + moreInfos.headingBottomPadding >= mouseClickPos.y
    ) {
        let paintX = moreInfos.paintStartX;
        for (let i = 0; i < moreInfos.containers.containers.length; i++) {
            const container = moreInfos.containers.containers[i];
            if (paintX <= mouseClickPos.x
                && paintX + container.headingWidth >= mouseClickPos.x
            ) {
                moreInfos.containers.selected = i;
                return;
            }
            paintX += container.headingWidth + moreInfos.headingHorizontalSpacing;
        }
    } else {
        let containerY = moreInfos.paintStartY + moreInfos.headingFontSize + moreInfos.headingBottomPadding + 4;
        if (containerY <= mouseClickPos.y
            && containerY + moreInfos.headingFontSize + moreInfos.headingBottomPadding >= mouseClickPos.y
        ) {
            const selectedContainer = moreInfos.containers.containers[moreInfos.containers.selected];
            let paintX = moreInfos.paintStartX;
            for (let i = 0; i < moreInfos.containers.containers.length; i++) {
                const container = selectedContainer.subContainer.containers[i];
                if (paintX <= mouseClickPos.x
                    && paintX + container.headingWidth >= mouseClickPos.x
                ) {
                    selectedContainer.subContainer.selected = i;
                    return;
                }
                paintX += container.headingWidth + moreInfos.headingHorizontalSpacing;
            }
        }
    }
}

export function createRequiredMoreInfos(game: Game): MoreInfos {
    const ctx = game.ctx;
    const moreInfos: MoreInfos = createDefaultEmptyMoreInfos();
    if (!ctx) return moreInfos;
    let paintX = moreInfos.paintStartX;

    const gameRuleContainer = createDefaultMoreInfosContainer(ctx, "Game Rules", moreInfos.headingFontSize);
    moreInfos.containers.containers.push(gameRuleContainer);
    paintX += gameRuleContainer.headingWidth + moreInfos.headingHorizontalSpacing;
    gameRuleContainer.moreInfoParts.push(createGameRulesMoreInfos(ctx));


    for (let client of game.state.clientInfos) {
        const player = findPlayerById(game.state.players, client.id);
        if (!player) continue;
        let heading = client.name ? client.name : "Character";
        const characterContainer = createCharacterMoreInfosPartContainer(ctx, player.character, moreInfos, game, heading);
        moreInfos.containers.containers.push(characterContainer);
        if (game.multiplayer.myClientId === client.id) {
            moreInfos.containers.selected = moreInfos.containers.containers.length - 1;
            const selectedSub = moreInfos.containers.containers[moreInfos.containers.selected];
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
        paintX += characterContainer.headingWidth + moreInfos.headingHorizontalSpacing;
    }

    const closest = findClosestInteractable(game);
    if (closest) {
        if (closest.pastCharacter) {
            const moreInfosContainer = createPastCharacterMoreInfos(ctx, closest.pastCharacter, moreInfos, game);
            moreInfos.containers.containers.push(moreInfosContainer);
            moreInfos.containers.selected = moreInfos.containers.containers.length - 1;
            paintX += moreInfosContainer.headingWidth + moreInfos.headingHorizontalSpacing;

        } else if (closest.mapObject) {
            const moreInfosContainer = createMoreInfosForMabObject(closest.mapObject, game);
            if (moreInfosContainer) {
                moreInfos.containers.containers.push(moreInfosContainer);
                moreInfos.containers.selected = moreInfos.containers.containers.length - 1;
                paintX += moreInfosContainer.headingWidth + moreInfos.headingHorizontalSpacing;
            }
        }
    } else {
        const playerChar = findMyCharacter(game);
        if (playerChar) {
            const celestialDirection = getCelestialDirection(playerChar, game.state.map);
            const moreInfosContainer = kingCreateMoreInfos(game, celestialDirection, `King of the ${celestialDirection}`);
            if (moreInfosContainer) {
                moreInfos.containers.containers.push(moreInfosContainer);
            }
        }
    }
    const enemyMoreInfoContainer = fixPositionRespawnEnemyCreateMoreInfos(game, "Enemy");
    if (enemyMoreInfoContainer) moreInfos.containers.containers.push(enemyMoreInfoContainer);

    const highscoreContainer = createDefaultMoreInfosContainer(ctx, "Highscores", moreInfos.headingFontSize);
    moreInfos.containers.containers.push(highscoreContainer);
    paintX += highscoreContainer.headingWidth + moreInfos.headingHorizontalSpacing;
    highscoreContainer.moreInfoParts.push(...createHighscoresMoreInfos(ctx, game.state.highscores));

    return moreInfos;
}

export function paintMoreInfos(ctx: CanvasRenderingContext2D, moreInfos: MoreInfos, game: Game) {
    if (!game.UI.displayMoreInfos) return;
    let paintX = moreInfos.paintStartX;
    let paintY = moreInfos.paintStartY;
    paintY = paintMoreInfosContainers(ctx, moreInfos.containers, moreInfos, paintY);
    if (moreInfos.containers.containers.length > 0) {
        paintMoreInfosPartsContainer(ctx, moreInfos.containers.containers[moreInfos.containers.selected], paintX, paintY);
    }
}

export function createCharacterMoreInfosPartContainer(ctx: CanvasRenderingContext2D, character: Character, moreInfos: MoreInfos, game: Game, heading: string = "Character"): MoreInfosPartContainer {
    const characterContainer = createDefaultMoreInfosContainer(ctx, heading, moreInfos.headingFontSize);
    characterContainer.moreInfoParts.push(createCharacterMoreInfos(ctx, character));

    let subHeadingPaintX = moreInfos.paintStartX;
    let hasMoreThanOneCharacterClass = false;
    if (character.characterClasses && character.characterClasses.length > 1) {
        hasMoreThanOneCharacterClass = true;
        for (let charClass of character.characterClasses) {
            const subContainer = createDefaultMoreInfosContainer(ctx, charClass.className, moreInfos.headingFontSize);
            subHeadingPaintX += subContainer.headingWidth + moreInfos.headingHorizontalSpacing;
            characterContainer.subContainer.containers.push(subContainer);
            if (character.pets) {
                const charClassPets: TamerPetCharacter[] = [];
                for (let pet of character.pets) {
                    if (pet.classIdRef === charClass.id) charClassPets.push(pet);
                }
                subContainer.moreInfoParts.push(...createTamerPetsCharacterMoreInfos(ctx, charClassPets));
            }
            const charClassAbilities: Ability[] = [];
            for (let ability of character.abilities) {
                if (ability.classIdRef === charClass.id) charClassAbilities.push(ability);
            }
            subContainer.moreInfoParts.push(...createMoreInfosAbilities(ctx, charClassAbilities, game));
        }
    }
    if (character.pets) {
        const classlessPets: TamerPetCharacter[] = [];
        for (let pet of character.pets) {
            if (pet.classIdRef === undefined || !hasMoreThanOneCharacterClass) classlessPets.push(pet);
        }
        characterContainer.moreInfoParts.push(...createTamerPetsCharacterMoreInfos(ctx, classlessPets));
    }
    const classlessAbilities: Ability[] = [];
    for (let ability of character.abilities) {
        if (ability.classIdRef === undefined || !hasMoreThanOneCharacterClass) classlessAbilities.push(ability);
    }
    characterContainer.moreInfoParts.push(...createMoreInfosAbilities(ctx, classlessAbilities, game));
    return characterContainer;
}

function paintMoreInfosContainers(ctx: CanvasRenderingContext2D, containers: MoreInfosPartContainers, moreInfos: MoreInfos, paintY: number): number {
    let subPaintY = paintY;
    const fontSize = moreInfos.headingFontSize;
    ctx.font = fontSize + "px Arial";

    let paintX = moreInfos.paintStartX;
    for (let i = 0; i < containers.containers.length; i++) {
        const container = containers.containers[i];
        ctx.fillStyle = "white";
        ctx.fillRect(paintX, paintY, container.headingWidth, fontSize + moreInfos.headingBottomPadding);
        ctx.fillStyle = i === containers.selected ? "black" : "gray";
        ctx.fillText(
            container.heading,
            paintX,
            paintY + fontSize + 2
        );
        paintX += container.headingWidth + moreInfos.headingHorizontalSpacing;
    }
    subPaintY += fontSize + moreInfos.headingBottomPadding + 4;
    if (containers.containers[containers.selected].subContainer.containers.length > 0) {
        subPaintY = paintMoreInfosContainers(ctx, containers.containers[containers.selected].subContainer, moreInfos, subPaintY);
    }
    return subPaintY;
}

export function paintMoreInfosPartsContainer(ctx: CanvasRenderingContext2D, moreInfosPartsContainer: MoreInfosPartContainer, drawStartX: number = 10, drawStartY: number = 60) {
    let paintX = drawStartX;
    let paintY = drawStartY;
    let horizontalSpacing = 5;
    for (let part of moreInfosPartsContainer.moreInfoParts) {
        paintMoreInfosPart(ctx, part, paintX, paintY);
        paintX += part.width + horizontalSpacing;
    }
    if (moreInfosPartsContainer.subContainer.containers.length > 0) {
        paintMoreInfosPartsContainer(ctx, moreInfosPartsContainer.subContainer.containers[moreInfosPartsContainer.subContainer.selected], paintX, paintY);
    }
}

function createPastCharacterMoreInfos(ctx: CanvasRenderingContext2D, pastCharacter: Character, moreInfos: MoreInfos, game: Game): MoreInfosPartContainer {
    const containerHeading = "Past Character";
    const moreInfosPartContainer = createDefaultMoreInfosContainer(ctx, containerHeading, moreInfos.headingFontSize);
    const pastCharacterDefaultTexts: string[] = [
        `Past Characters are the characters which you`,
        `played before.`,
        ``,
        `They can gift their original Abilities.`,
        `Abilities can only be gifted once.`,
    ]
    moreInfosPartContainer.moreInfoParts.push(createMoreInfosUI(ctx, pastCharacterDefaultTexts))
    if (pastCharacter.characterClasses) {
        for (let charClass of pastCharacter.characterClasses)
            if (!charClass.gifted) {
                moreInfosPartContainer.moreInfoParts.push(createCharacterClassMoreInfos(ctx, [charClass]));
            }
    }

    if (pastCharacter.pets) {
        let pets: TamerPetCharacter[] = [];
        for (let pet of pastCharacter.pets) {
            if (pet.tradable) pets.push(pet);
        }
        moreInfosPartContainer.moreInfoParts.push(...createTamerPetsCharacterMoreInfos(ctx, pets));
    }
    let abilities: Ability[] = [];
    for (let ability of pastCharacter.abilities) {
        if (ability.tradable) abilities.push(ability);
    }
    moreInfosPartContainer.moreInfoParts.push(...createMoreInfosAbilities(ctx, abilities, game));
    if (moreInfosPartContainer.moreInfoParts.length <= 1) {
        moreInfosPartContainer.moreInfoParts.push(createMoreInfosUI(ctx, [`This Character has nothing to gift.`]))
    }
    return moreInfosPartContainer;
}

export function createDefaultMoreInfosContainer(ctx: CanvasRenderingContext2D, heading: string, fontSize: number): MoreInfosPartContainer {
    ctx.font = `${fontSize}px Arial`;
    const width = ctx.measureText(heading).width;
    return {
        heading: heading,
        headingWidth: width + 4,
        moreInfoParts: [],
        subContainer: { selected: 0, containers: [] },
    };
}

export function paintMoreInfosPart(ctx: CanvasRenderingContext2D, moreInfosPart: MoreInfoPart, drawStartX: number = 10, drawStartY: number = 60) {
    const verticalSpacing = 1;
    ctx.font = moreInfosPart.fontSize + "px Arial";
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, moreInfosPart.width, moreInfosPart.height);
    ctx.fillStyle = "black";
    for (let i = 0; i < moreInfosPart.texts.length; i++) {
        ctx.fillText(moreInfosPart.texts[i], drawStartX + 2, drawStartY + moreInfosPart.fontSize * (i + verticalSpacing) + 2);
    }
}

function createGameRulesMoreInfos(ctx: CanvasRenderingContext2D): MoreInfoPart {
    const textLines: string[] = [
        `Game timer starts when first enemy is killed.`,
        `On 30seconds a expanding death zone`,
        `beginns to grow.`,
        `Every minute one boss enemy spawns.`,
    ];
    return createMoreInfosUI(ctx, textLines);
}
