import { Ability, createMoreInfosAbilities } from "./ability/ability.js";
import { createAchievementsMoreInfo } from "./achievements/achievements.js";
import { findMyCharacter } from "./character/character.js";
import { Character } from "./character/characterModel.js";
import { createCharacterClassMoreInfos, createCharacterMoreInfos } from "./character/characterPaint.js";
import { getCelestialDirection } from "./character/enemy/bossEnemy.js";
import { fixPositionRespawnEnemyCreateMoreInfos } from "./character/enemy/fixPositionRespawnEnemy.js";
import { godCreateMoreInfos } from "./character/enemy/god/godEnemy.js";
import { kingCreateMoreInfos } from "./character/enemy/kingEnemy.js";
import { TamerPetCharacter, createTamerPetsCharacterMoreInfos } from "./character/playerCharacters/tamer/tamerPetCharacter.js";
import { createCombatLogMoreInfo, createDamageMeterMoreInfo } from "./combatlog.js";
import { findClosestInteractable, getRelativeMousePoistion } from "./game.js";
import { Game, Position } from "./gameModel.js";
import { createHighscoresMoreInfos } from "./highscores.js";
import { createMoreInfosForMabObject } from "./map/mapObjects.js";
import { createMoreInfoMoney, createMoreInfoMoneyGainedPart, findPlayerById } from "./player.js";

export type MoreInfoPart = {
    texts: string[],
    fontSize: number,
    width: number,
    height: number,
    group?: string,
}

export type MoreInfosPartContainers = {
    selected?: number,
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

export function createMoreInfosPart(ctx: CanvasRenderingContext2D, texts: string[], group: string | undefined = undefined, fontSize: number = 14): MoreInfoPart {
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
        group: group,
    }
}

export function createDefaultEmptyMoreInfos(): MoreInfos {
    return {
        containers: { containers: [] },
        paintStartX: 10,
        paintStartY: 60,
        headingFontSize: 26,
        headingBottomPadding: 8,
        headingHorizontalSpacing: 5,
    };
}

export function moreInfosHandleMouseClick(event: MouseEvent, game: Game): boolean {
    if (!game.UI.displayMoreInfos) return false;
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
                return true;
            }
            paintX += container.headingWidth + moreInfos.headingHorizontalSpacing;
        }
    } else {
        let currentSubContainers = moreInfos.containers;
        let containerY = moreInfos.paintStartY;
        while (currentSubContainers.containers.length > 0) {
            let selectedContainer = currentSubContainers.containers[currentSubContainers.selected!];
            containerY += moreInfos.headingFontSize + moreInfos.headingBottomPadding + 4;
            if (containerY <= mouseClickPos.y
                && containerY + moreInfos.headingFontSize + moreInfos.headingBottomPadding >= mouseClickPos.y
            ) {
                let paintX = moreInfos.paintStartX;
                for (let i = 0; i < selectedContainer.subContainer.containers.length; i++) {
                    const container = selectedContainer.subContainer.containers[i];
                    if (paintX <= mouseClickPos.x
                        && paintX + container.headingWidth >= mouseClickPos.x
                    ) {
                        selectedContainer.subContainer.selected = i;
                        return true;
                    }
                    paintX += container.headingWidth + moreInfos.headingHorizontalSpacing;
                }

                return false;
            }
            currentSubContainers = selectedContainer.subContainer;
        }
    }
    return false;
}

export function createEndScreenMoreInfos(game: Game): MoreInfoPart[] {
    const ctx = game.ctx;
    if (!ctx) return [];
    const parts: MoreInfoPart[] = [];
    const moneyGained = createMoreInfoMoneyGainedPart(ctx, game);
    if (moneyGained) parts.push(moneyGained);
    const highscores = createHighscoresMoreInfos(ctx, game.state.highscores);
    parts.push(...highscores);
    return parts;
}

export function createRequiredMoreInfos(game: Game): MoreInfos {
    const ctx = game.ctx;
    const lastSelectedContainer = game.UI.moreInfos.containers.selected !== undefined ? game.UI.moreInfos.containers.containers[game.UI.moreInfos.containers.selected].heading : undefined;
    const moreInfos: MoreInfos = createDefaultEmptyMoreInfos();
    if (!ctx) return moreInfos;
    const playerChar = findMyCharacter(game);
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
            if (lastSelectedContainer === undefined) moreInfos.containers.selected = moreInfos.containers.containers.length - 1;
            const selectedSub = moreInfos.containers.containers[moreInfos.containers.containers.length - 1];
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

    const closest = findClosestInteractable(playerChar, game);
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
        if (playerChar) {
            const celestialDirection = getCelestialDirection(playerChar, game.state.map);
            if (game.state.bossStuff.godFightStarted) {
                const godMoreInfosContainer = godCreateMoreInfos(game, `God`);
                if (godMoreInfosContainer) {
                    moreInfos.containers.containers.push(godMoreInfosContainer);
                }
            } else {
                const kingMoreInfosContainer = kingCreateMoreInfos(game, celestialDirection, `King of the ${celestialDirection}`);
                if (kingMoreInfosContainer) {
                    moreInfos.containers.containers.push(kingMoreInfosContainer);
                }
            }
        }
    }
    const enemyMoreInfoContainer = fixPositionRespawnEnemyCreateMoreInfos(game, "Enemy");
    if (enemyMoreInfoContainer) moreInfos.containers.containers.push(enemyMoreInfoContainer);

    const highscoreContainer = createDefaultMoreInfosContainer(ctx, "Highscores", moreInfos.headingFontSize);
    moreInfos.containers.containers.push(highscoreContainer);
    paintX += highscoreContainer.headingWidth + moreInfos.headingHorizontalSpacing;
    highscoreContainer.moreInfoParts.push(...createHighscoresMoreInfos(ctx, game.state.highscores));
    paintX += highscoreContainer.headingWidth + moreInfos.headingHorizontalSpacing;

    const moneyContainer = createMoreInfoMoney(moreInfos, game);
    if (moneyContainer) {
        moreInfos.containers.containers.push(moneyContainer);
        paintX += moneyContainer.headingWidth + moreInfos.headingHorizontalSpacing;
    }

    const combatlogContainer = createCombatLogMoreInfo(ctx, moreInfos, findMyCharacter(game)?.combatlog);
    if (combatlogContainer) {
        moreInfos.containers.containers.push(combatlogContainer);
        paintX += combatlogContainer.headingWidth + moreInfos.headingHorizontalSpacing;
    }
    const damageMeterContainer = createDamageMeterMoreInfo(ctx, moreInfos, game.UI.damageMeter, game);
    if (damageMeterContainer) {
        moreInfos.containers.containers.push(damageMeterContainer);
        paintX += damageMeterContainer.headingWidth + moreInfos.headingHorizontalSpacing;
    }
    if (moreInfos.containers.selected === undefined) {
        for (let i = 0; i < moreInfos.containers.containers.length; i++) {
            const container = moreInfos.containers.containers[i]
            if (lastSelectedContainer === container.heading) {
                moreInfos.containers.selected = i;
                break;
            }
        }
        if (moreInfos.containers.selected === undefined) {
            moreInfos.containers.selected = 1;
        }
    }
    const achievemntsContainer = createAchievementsMoreInfo(ctx, moreInfos, game.state.achievements);
    moreInfos.containers.containers.push(achievemntsContainer);
    paintX += achievemntsContainer.headingWidth + moreInfos.headingHorizontalSpacing;

    return moreInfos;
}

export function paintMoreInfos(ctx: CanvasRenderingContext2D, moreInfos: MoreInfos, game: Game) {
    if (!game.UI.displayMoreInfos) return;
    let paintX = moreInfos.paintStartX;
    let paintY = moreInfos.paintStartY;
    paintY = paintMoreInfosContainers(ctx, moreInfos.containers, moreInfos, paintY);
    if (moreInfos.containers.containers.length > 0) {
        paintMoreInfosPartsContainer(ctx, moreInfos.containers.containers[moreInfos.containers.selected!], paintX, paintY);
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
            const classNameWithTypes = `${charClass.className}${charClass.gifted ? "(gifted)" : ""}${charClass.legendary ? "(legendary)" : ""}`;
            const subContainer = createDefaultMoreInfosContainer(ctx, classNameWithTypes, moreInfos.headingFontSize);
            subHeadingPaintX += subContainer.headingWidth + moreInfos.headingHorizontalSpacing;
            characterContainer.subContainer.containers.push(subContainer);
            if (character.pets) {
                const charClassPets: TamerPetCharacter[] = [];
                for (let pet of character.pets) {
                    if (pet.classIdRef === charClass.id) charClassPets.push(pet);
                }
                subContainer.moreInfoParts.push(...createTamerPetsCharacterMoreInfos(ctx, charClassPets, game));
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
        characterContainer.moreInfoParts.push(...createTamerPetsCharacterMoreInfos(ctx, classlessPets, game));
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
    if (containers.containers[containers.selected!].subContainer.containers.length > 0) {
        subPaintY = paintMoreInfosContainers(ctx, containers.containers[containers.selected!].subContainer, moreInfos, subPaintY);
    }
    return subPaintY;
}

export function paintMoreInfosPartsContainer(ctx: CanvasRenderingContext2D, moreInfosPartsContainer: MoreInfosPartContainer, drawStartX: number = 10, drawStartY: number = 60) {
    let paintX = drawStartX;
    let paintY = drawStartY;
    const horizontalSpacing = 5;
    const verticalSpacing = 5;
    const groupOffsets: { [key: string]: Position } = {};
    for (let part of moreInfosPartsContainer.moreInfoParts) {
        if (part.group) {
            if (!groupOffsets[part.group]) {
                groupOffsets[part.group] = { x: paintX, y: paintY };
                let maxWidth = 0;
                for (let part2 of moreInfosPartsContainer.moreInfoParts) {
                    if (part2.group === part.group) {
                        if (part2.width > maxWidth) maxWidth = part2.width;
                    }
                }
                paintX += maxWidth + horizontalSpacing;
            }
            const groupOffset = groupOffsets[part.group];
            paintMoreInfosPart(ctx, part, groupOffset.x, groupOffset.y);
            groupOffset.y += part.height + verticalSpacing;
        } else {
            paintMoreInfosPart(ctx, part, paintX, paintY);
            paintX += part.width + horizontalSpacing;
        }
    }
    if (moreInfosPartsContainer.subContainer.containers.length > 0) {
        paintMoreInfosPartsContainer(ctx, moreInfosPartsContainer.subContainer.containers[moreInfosPartsContainer.subContainer.selected!], paintX, paintY);
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
    moreInfosPartContainer.moreInfoParts.push(createMoreInfosPart(ctx, pastCharacterDefaultTexts))
    if (pastCharacter.characterClasses) {
        for (let charClass of pastCharacter.characterClasses)
            if (!charClass.gifted) {
                moreInfosPartContainer.moreInfoParts.push(createCharacterClassMoreInfos(ctx, [charClass], pastCharacter.abilities, pastCharacter.pets));
            }
    }

    if (pastCharacter.pets) {
        let pets: TamerPetCharacter[] = [];
        for (let pet of pastCharacter.pets) {
            if (pet.tradable) pets.push(pet);
        }
        moreInfosPartContainer.moreInfoParts.push(...createTamerPetsCharacterMoreInfos(ctx, pets, game));
    }
    let abilities: Ability[] = [];
    for (let ability of pastCharacter.abilities) {
        if (ability.tradable) abilities.push(ability);
    }
    moreInfosPartContainer.moreInfoParts.push(...createMoreInfosAbilities(ctx, abilities, game));
    if (moreInfosPartContainer.moreInfoParts.length <= 1) {
        moreInfosPartContainer.moreInfoParts.push(createMoreInfosPart(ctx, [`This Character has nothing to gift.`]))
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
    return createMoreInfosPart(ctx, textLines);
}
