import { Game, IdCounter, Position, Rectangle, SkillPoints } from "../../gameModel.js"
import { Character, CHARACTER_TYPE_FUNCTIONS } from "../characterModel.js"
import { CharacterUpgrades } from "../upgrades/characterUpgrades.js"
import { UpgradeOption, UpgradeOptionAndProbability } from "../upgrade.js"
import { addBallClass } from "./characterClassBall.js"
import { Leveling } from "./levelingCharacter.js"
import { addSniperClass } from "./characterClassSniper.js"
import { addTamerClass } from "./tamer/characterClassTamer.js"
import { addTowerClass } from "./characterClassTower.js"
import { addMusicianClass } from "./characterClassMusician.js"
import { Player } from "../../player.js"
import { paintTextWithOutline } from "../../gamePaint.js"
import { calculateDistance, getTimeSinceFirstKill } from "../../game.js"
import { getMapMidlePosition } from "../../map/map.js"
import { Ability } from "../../ability/ability.js"
import { TAMER_PET_CHARACTER, TamerPetCharacter } from "./tamer/tamerPetCharacter.js"
import { getNextBossSpawnDistance, getNextBossSpawnTime } from "../enemy/bossEnemy.js"
import { Curse } from "../../curse/curse.js"
import { GAME_MODE_BASE_DEFENSE, paintGameModeBaseDefeseWave } from "../../gameModeBaseDefense.js"

export type PlayerCharacterClassFunctions = {
    changeCharacterToThisClass: (character: Character, idCounter: IdCounter, game: Game) => void,
    createBossBasedOnClassAndCharacter?: (basedOnCharacter: Character, level: number, spawn: Position, game: Game) => Character,
    createUpgradeOptions?: (character: Character, characterClass: CharacterClass, game: Game) => UpgradeOptionAndProbability[],
    createBossUpgradeOptions?: (character: Character, game: Game) => UpgradeOptionAndProbability[],
    executeUpgradeOption?: (character: Character, upgradeOptionChoice: UpgradeOption, game: Game) => void,
    getMoreInfosText?: () => string[],
    kingModification?: (character: Character, characterClass: CharacterClass) => void,
    paintLevelUI: (ctx: CanvasRenderingContext2D, character: Character, charClass: CharacterClass, topLeft: Position, width: number, height: number, game: Game) => void,
    preventMultiple?: boolean,
}

export function addPlayerCharacterType() {
    CHARACTER_TYPE_FUNCTIONS[PLAYER_CHARACTER_TYPE] = {
        onCharacterKill: onCharacterKill,
    }
}


export type CharacterClass = {
    id: number,
    className: string,
    level?: Leveling,
    gifted?: boolean,
    capped?: boolean,
    curses?: Curse[],
    legendary?: {
        levelCap: number,
        blessings: string[],
    },
    availableSkillPoints?: SkillPoints,
    characterClassUpgrades?: CharacterUpgrades,
}

export type PlayerCharacterLevelUI = {
    charClassRefId: number,
    levelUI: LevelUI[],
}

export type AbilityUiRectangle = Rectangle & {
    abilityRefId: number,
    positionNotRequired?: boolean,
}

export type PlayerCharacterAbilityUI = {
    charClassRefId: number,
    abilityVisualizedCounter: number,
    abilityVisualizeStartTime?: number,
    selectedRectangleIndex?: number,
    rectangles?: AbilityUiRectangle[],
}

export type LevelUI = {
    idRef: number,
    lastPaintedLevel: number,
    lastPaintedTime: number,
    lastPaintedPerCent: number,
}

export type PlayerCharacterClassesFunctions = {
    [key: string]: PlayerCharacterClassFunctions,
}

export const PLAYER_CHARACTER_TYPE = "PlayerCharacter";
export const PLAYER_CHARACTER_CLASSES_FUNCTIONS: PlayerCharacterClassesFunctions = {};

export function onDomLoadSetCharacterClasses() {
    addSniperClass();
    addTowerClass();
    addTamerClass();
    addBallClass();
    addMusicianClass();
}

export function paintPlayerCharacterUI(ctx: CanvasRenderingContext2D, player: Player, topLeft: Position, width: number, height: number, game: Game) {
    if (game.state.bossStuff.areaSpawnFightStartedTime !== undefined || game.state.bossStuff.kingFightStartedTime !== undefined) {
        for (let boss of game.state.bossStuff.bosses) {
            const charFunctions = CHARACTER_TYPE_FUNCTIONS[boss.type];
            if (charFunctions && charFunctions.paintBigUiHpBarOnSpecialFight) {
                charFunctions.paintBigUiHpBarOnSpecialFight(ctx, boss, game);
            }
        }
        return;
    }

    const aplha = 0.75;
    ctx.globalAlpha *= aplha;

    const tempTopLeft = { x: topLeft.x, y: topLeft.y };
    const horizontalSpacing = 3;
    let tempWidth = width;
    const character = player.character;

    if (game.state.gameMode === GAME_MODE_BASE_DEFENSE) {
        const distancePaintWidth = paintGameModeBaseDefeseWave(ctx, player, tempTopLeft, height, game) + horizontalSpacing;
        tempTopLeft.x += distancePaintWidth;
        tempWidth -= distancePaintWidth;
    } else {
        const distancePaintWidth = paintPlayerDistance(ctx, player, tempTopLeft, height, game) + horizontalSpacing;
        tempTopLeft.x += distancePaintWidth;
        tempWidth -= distancePaintWidth;
    }

    const bossTimerPaintWidth = paintBossTimer(ctx, player, tempTopLeft, height, game) + horizontalSpacing;
    tempTopLeft.x += bossTimerPaintWidth;
    tempWidth -= bossTimerPaintWidth;

    const moneyPaintWidth = paintMoney(ctx, player, tempTopLeft, height, game) + horizontalSpacing;
    tempTopLeft.x += moneyPaintWidth;
    tempWidth -= moneyPaintWidth;


    paintCharacterClassLevels(ctx, character, tempTopLeft, tempWidth, height, game);
    ctx.globalAlpha /= aplha;
}

export function playerCharacterGetLevelClassText(character: Character, charClass: CharacterClass): string {
    return `${charClass.className} level ${Math.floor(playerCharacterClassGetAverageLevel(character, charClass))}`;
}

export function getAverageLevelOfAbilitiesPetsCharClassId(charClassId: number, abilities?: Ability[], pets?: Character[]): number {
    let averageLevel = 0;
    let counter = 0;
    if (abilities) {
        for (let ability of abilities) {
            if (ability.classIdRef === charClassId && ability.level) {
                counter++;
                averageLevel += (ability.level.level - averageLevel) / counter;
            }
        }
    }
    if (pets) {
        for (let pet of pets) {
            if (pet.type !== TAMER_PET_CHARACTER) continue;
            const tamerPet = pet as TamerPetCharacter;
            if (tamerPet.classIdRef === charClassId && pet.level) {
                counter++;
                averageLevel += (pet.level.level - averageLevel) / counter;
            }
        }
    }
    return averageLevel;
}

export function playerCharacterChangeToKingModification(king: Character) {
    if (!king.characterClasses) return;
    for (let kingClass of king.characterClasses) {
        const classFunctions = PLAYER_CHARACTER_CLASSES_FUNCTIONS[kingClass.className];
        if (classFunctions && classFunctions.kingModification) classFunctions.kingModification(king, kingClass);
    }
}

export function playerCharacterClassGetAverageLevel(character: Character, charClass: CharacterClass): number {
    let averageLevel = 0;
    let counter = 0;
    if (charClass.level) {
        counter++;
        averageLevel += (charClass.level.level - averageLevel) / counter;
    }
    for (let ability of character.abilities) {
        if (ability.classIdRef === charClass.id && ability.level) {
            counter++;
            averageLevel += (ability.level.level - averageLevel) / counter;
        }
    }
    if (character.pets) {
        for (let pet of character.pets) {
            if (pet.type !== TAMER_PET_CHARACTER) continue;
            const tamerPet = pet as TamerPetCharacter;
            if (tamerPet.classIdRef === charClass.id && pet.level) {
                counter++;
                averageLevel += (pet.level.level - averageLevel) / counter;
            }
        }
    }
    return averageLevel;
}

export function paintPlayerAbilityLevelUI(ctx: CanvasRenderingContext2D, ability: Ability, topLeft: Position, width: number, height: number, game: Game) {
    if (!ability.level || ability.classIdRef === undefined) return;
    const text = ability.name + ": ";
    let capped: number | undefined = undefined;
    if (ability.legendary) capped = ability.legendary.levelCap;
    paintPlayerLevelUI(ctx, ability.level, ability.classIdRef, ability.id, topLeft, width, height, text, game, capped);
}

export function paintPlayerPetLevelUI(ctx: CanvasRenderingContext2D, pet: TamerPetCharacter, topLeft: Position, width: number, height: number, game: Game) {
    if (!pet.level || pet.classIdRef === undefined) return;
    const text = pet.paint.color ? `${pet.paint.color}:` : "";
    let capped: number | undefined = undefined;
    if (pet.legendary) capped = pet.legendary.levelCap;
    paintPlayerLevelUI(ctx, pet.level, pet.classIdRef, pet.id, topLeft, width, height, text, game, capped);
}

export function initPlayerCharacterChoiceOptions(character: Character) {
    const options: UpgradeOption[] = createCharacterChooseUpgradeOptions();
    for (let i = 0; i < 5; i++) {
        if (options.length > i) {
            character.upgradeChoices.choices.push(options[i]);
        }
    }
    character.upgradeChoices.displayText = "Choose Main Class:";
}

export function createCharacterChooseUpgradeOptions(): UpgradeOption[] {
    const upgradeOptions: UpgradeOption[] = [];
    const keys = Object.keys(PLAYER_CHARACTER_CLASSES_FUNCTIONS);

    for (let key of keys) {
        let option: UpgradeOption = {
            displayText: key,
            type: "ChooseClass",
            identifier: key
        };
        let functions = PLAYER_CHARACTER_CLASSES_FUNCTIONS[key];
        if (functions && functions.getMoreInfosText) {
            option.displayMoreInfoText = functions.getMoreInfosText();
        }
        upgradeOptions.push(option);
    }

    return upgradeOptions;
}

export function shareCharactersTradeablePreventedMultipleClass(fromCharacter: Character, toCharacter: Character): boolean {
    if (!fromCharacter.characterClasses) return false;
    const giftingClass = findMainCharacterClass(fromCharacter);
    if (!giftingClass) return false;
    return hasCharacterPreventedMultipleClass(giftingClass.className, toCharacter);
}

export function hasCharacterPreventedMultipleClass(newCharacterClassName: string, toCharacter: Character): boolean {
    const newCharacterClassFunctions = PLAYER_CHARACTER_CLASSES_FUNCTIONS[newCharacterClassName];
    if (newCharacterClassFunctions && !newCharacterClassFunctions.preventMultiple) return false;
    if (toCharacter.characterClasses) {
        const overtaken = toCharacter.characterClasses.find(c => c.className === newCharacterClassName);
        if (overtaken) return true;
    }
    return false;
}

export function findMainCharacterClass(character: Character): CharacterClass | undefined {
    if (character.characterClasses) {
        for (let charClass of character.characterClasses) {
            if (!charClass.gifted && !charClass.legendary) return charClass;
        }
    }
    return undefined;
}

export function hasPlayerChoosenStartClassUpgrade(character: Character): boolean {
    if (character.upgradeChoices.choices.length > 0 && character.upgradeChoices.choices[0].type === "ChooseClass") {
        return false;
    }
    return true;
}

export function paintPlayerLevelUI(ctx: CanvasRenderingContext2D, leveling: Leveling, classIdRef: number, idRef: number, topLeft: Position, width: number, height: number, text: string, game: Game, levelCap: number | undefined = undefined) {
    if (leveling.leveling === undefined) return;
    const level = leveling.level;
    const levelXpPerCent = leveling.leveling.experience / leveling.leveling.experienceForLevelUp;
    let levelUI = game.UI.playerCharacterLevelUI;
    if (levelUI === undefined || levelUI.charClassRefId !== classIdRef) {
        levelUI = {
            charClassRefId: classIdRef,
            levelUI: [],
        }
        game.UI.playerCharacterLevelUI = levelUI;
    }
    let lastDisplayed = levelUI.levelUI.find(a => a.idRef === idRef);
    if (lastDisplayed === undefined) {
        lastDisplayed = {
            idRef: idRef,
            lastPaintedLevel: level,
            lastPaintedPerCent: levelXpPerCent,
            lastPaintedTime: game.state.time
        }
        levelUI.levelUI.push(lastDisplayed);
    }
    const timeDiff = game.state.time - lastDisplayed.lastPaintedTime;
    const maxPerCentGrow = Math.min(timeDiff / 200, 1);
    let displayedLevel = lastDisplayed.lastPaintedLevel;
    let displayLevelPerCent = lastDisplayed.lastPaintedPerCent;
    if (level > displayedLevel) {
        let tempPerCentChange = 0;
        if (level > displayedLevel + 1) {
            tempPerCentChange = 1;
        } else {
            tempPerCentChange = levelXpPerCent + 1 - lastDisplayed.lastPaintedPerCent;
        }
        if (tempPerCentChange > maxPerCentGrow) tempPerCentChange = maxPerCentGrow;
        if (lastDisplayed.lastPaintedPerCent + tempPerCentChange >= 1) {
            displayedLevel += 1;
            displayLevelPerCent -= 1;
        }
        displayLevelPerCent += tempPerCentChange;
    } else {
        let tempPerCentChange = levelXpPerCent - displayLevelPerCent;
        if (tempPerCentChange > maxPerCentGrow) {
            tempPerCentChange = maxPerCentGrow;
        }
        displayLevelPerCent += tempPerCentChange;
    }

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(topLeft.x, topLeft.y, width, height);
    ctx.stroke();
    ctx.fillStyle = "black";
    ctx.fillRect(topLeft.x, topLeft.y, width * displayLevelPerCent, height);
    const fontSize = height - 2;
    ctx.font = `${fontSize}px Arial`;
    let displayedText = `${text}${displayedLevel.toFixed(0)}`;
    if (levelCap && displayedLevel >= levelCap) displayedText += " (capped)";
    paintTextWithOutline(ctx, "white", "black", displayedText, topLeft.x, topLeft.y + fontSize - 1, false, 2);

    lastDisplayed.lastPaintedLevel = displayedLevel;
    lastDisplayed.lastPaintedPerCent = displayLevelPerCent;
    lastDisplayed.lastPaintedTime = game.state.time;
}

function onCharacterKill(character: Character, game: Game) {
    character.state = "dying";
    character.deathAnimationStartTimer = game.state.time;
    character.deathAnimationDuration = 2000;
}

function paintCharacterClassLevels(ctx: CanvasRenderingContext2D, character: Character, topLeft: Position, width: number, height: number, game: Game) {
    if (!character.characterClasses) return;
    let classPaintCounter = 0;
    const tempTopLeft = { x: topLeft.x, y: topLeft.y };
    for (let charClass of character.characterClasses) {
        if (charClass.gifted) continue;
        classPaintCounter++;
    }
    const heightPerClass = Math.max(Math.floor(height / classPaintCounter), 1);

    for (let charClass of character.characterClasses) {
        if (charClass.gifted) continue;
        let charClassFunctions = PLAYER_CHARACTER_CLASSES_FUNCTIONS[charClass.className];
        charClassFunctions.paintLevelUI(ctx, character, charClass, tempTopLeft, width, heightPerClass, game);
        tempTopLeft.y += heightPerClass;
    }
}

function paintMoney(ctx: CanvasRenderingContext2D, player: Player, topLeft: Position, height: number, game: Game): number {
    let fontSize = height;
    ctx.font = `${fontSize}px Arial`;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.lineWidth = 2;
    const margin = 1;
    const moneyText = "$ " + Math.floor(player.permanentData.money);
    let moneyPaintWidth = ctx.measureText(moneyText).width + margin * 2;
    const maxMoneyWidth = 100;
    if (moneyPaintWidth > maxMoneyWidth) {
        const shrinkFaktor = maxMoneyWidth / moneyPaintWidth;
        moneyPaintWidth = Math.floor(moneyPaintWidth * shrinkFaktor);
        fontSize = Math.floor(fontSize * shrinkFaktor);
        ctx.font = `${fontSize}px Arial`;
    }
    if (player.permanentData.money > 0) {
        ctx.fillRect(topLeft.x, topLeft.y, moneyPaintWidth, height);
        ctx.beginPath();
        ctx.rect(topLeft.x, topLeft.y, moneyPaintWidth, height);
        ctx.stroke();
        paintTextWithOutline(ctx, "white", "black", moneyText, topLeft.x + margin, topLeft.y + fontSize - 2 + Math.floor((height - fontSize) / 2));
    }
    return moneyPaintWidth;
}


function paintBossTimer(ctx: CanvasRenderingContext2D, player: Player, topLeft: Position, height: number, game: Game): number {
    const fontSize = Math.floor(height / 3);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.lineWidth = 2;
    const margin = 1;
    const timerDisplayText = `Boss ${game.state.bossStuff.bossLevelCounter}`;
    const timerPaintWidth = ctx.measureText(timerDisplayText).width + margin * 2;
    if (game.state.timeFirstKill !== undefined) {
        const timeUntiLNextBossMS = getNextBossSpawnTime(game.state.bossStuff) - getTimeSinceFirstKill(game.state);
        const timeUntilNextBossSeconds = Math.round(timeUntiLNextBossMS / 1000);

        const distanceUntiLNextBoss = getNextBossSpawnDistance(game.state.bossStuff);
        ctx.fillRect(topLeft.x, topLeft.y, timerPaintWidth, height);
        ctx.beginPath();
        ctx.rect(topLeft.x, topLeft.y, timerPaintWidth, height);
        ctx.stroke();
        paintTextWithOutline(ctx, "white", "black", timerDisplayText, topLeft.x + margin, topLeft.y + fontSize);

        paintTextWithOutline(ctx, "white", "black", `${distanceUntiLNextBoss}`, topLeft.x + Math.floor(timerPaintWidth / 2), topLeft.y + fontSize * 2 - 1, true);
        paintTextWithOutline(ctx, "white", "black", `or ${timeUntilNextBossSeconds}s`, topLeft.x + Math.floor(timerPaintWidth / 2), topLeft.y + height - 1, true);
    }
    return timerPaintWidth;
}

function paintPlayerDistance(ctx: CanvasRenderingContext2D, player: Player, topLeft: Position, height: number, game: Game): number {
    const distance = Math.round(calculateDistance(player.character, getMapMidlePosition(game.state.map)));
    const fontSize = Math.floor(height / 2);
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.lineWidth = 2;
    ctx.font = `${fontSize}px Arial`;
    const margin = 1;
    const distanceDisplayText = `Distance`;
    const distanceDisplayPaintTextWidth = ctx.measureText(distanceDisplayText).width;
    const distanceValuePaintWidth = ctx.measureText(distance.toFixed(0)).width
    const distancePaintWidth = Math.max(distanceDisplayPaintTextWidth, distanceValuePaintWidth) + margin * 2;
    ctx.fillRect(topLeft.x, topLeft.y, distancePaintWidth, height);
    ctx.beginPath();
    ctx.rect(topLeft.x, topLeft.y, distancePaintWidth, height);
    ctx.stroke();
    paintTextWithOutline(ctx, "white", "black", distanceDisplayText, topLeft.x + margin, topLeft.y + fontSize);
    paintTextWithOutline(ctx, "white", "black", `${distance}`, topLeft.x + Math.floor(distancePaintWidth / 2), topLeft.y + height - 1, true);
    return distancePaintWidth;
}
