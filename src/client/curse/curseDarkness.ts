import { getPlayerCharacters, resetCharacter } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { CHARACTER_TYPE_BOSS_CLONE_ENEMY, setCharacterToBossLevel } from "../character/enemy/bossEnemy.js";
import { CHARACTER_PET_TYPE_CLONE, CharacterPetClone } from "../character/playerCharacters/characterPetTypeClone.js";
import { TAMER_PET_CHARACTER } from "../character/playerCharacters/tamer/tamerPetCharacter.js";
import { changeCharacterAndAbilityIds, deepCopy, getCameraPosition } from "../game.js";
import { FACTION_ENEMY, Game } from "../gameModel.js";
import { getPointPaintPosition, paintTextWithOutline } from "../gamePaint.js";
import { Curse, CURSES_FUNCTIONS } from "./curse.js";

export const CURSE_DARKNESS = "Darkness";
const TIME_TO_TURN_EVIL = 15000;
const CLONE_SPAWN_INTERVAL = 1000;
const EVIL_TRANSFORM_TIME = 3000;

export type CurseDarkness = Curse & {
    cloneCounter: number,
    turnEvilTime?: number,
    evilIdRefs: number[],
    nextCloneSpawnTime?: number,
    visualizeFadeTimer?: number,
}

export function addCurseDarkness() {
    CURSES_FUNCTIONS[CURSE_DARKNESS] = {
        tick: tickDarkness,
        paint: paintCurse,
        reset: reset,
    };
}

export function createCurseDarkness(): CurseDarkness {
    return {
        level: 1,
        type: CURSE_DARKNESS,
        cloneCounter: 0,
        evilIdRefs: [],
    };
}

export function curseDarknessCloneKillCheck(clone: Character, game: Game) {
    const playerCharacters = getPlayerCharacters(game.state.players);
    for (let char of playerCharacters) {
        if (char.curses === undefined) continue;
        const curse = char.curses.find(c => c.type === CURSE_DARKNESS);
        if (!curse) continue;
        const darkness = curse as CurseDarkness;
        const idIndex = darkness.evilIdRefs.findIndex(id => id === clone.id);
        if (idIndex === -1) continue;
        darkness.evilIdRefs.splice(idIndex, 1);
        return;
    }
}

function reset(curse: Curse) {
    const darkness = curse as CurseDarkness;
    darkness.visualizeFadeTimer = undefined;
    darkness.turnEvilTime = undefined;
    darkness.nextCloneSpawnTime = undefined;
}

function paintCurse(ctx: CanvasRenderingContext2D, curse: Curse, target: Character, game: Game) {
    const darkness = curse as CurseDarkness;
    if (darkness.visualizeFadeTimer !== undefined && darkness.visualizeFadeTimer > game.state.time) {
        const cameraPosition = getCameraPosition(game);
        const paintPos = getPointPaintPosition(ctx, target, cameraPosition, game.UI.zoom);
        ctx.font = "30px Arial";
        paintTextWithOutline(ctx, "white", "black", `Curse Darkness Level ${Math.floor(curse.level)}`, paintPos.x, paintPos.y - 30, true, 3);
    }
}

function createClone(original: Character, game: Game): Character {
    const clone: Character = deepCopy(original);
    if (clone.pets) {
        for (let i = clone.pets.length - 1; i >= 0; i--) {
            if (clone.pets[i].type === TAMER_PET_CHARACTER) continue;
            clone.pets.splice(i, 1);
        }
    }
    if (clone.curses) clone.curses = undefined;
    clone.type = CHARACTER_PET_TYPE_CLONE;
    resetCharacter(clone, game);
    changeCharacterAndAbilityIds(clone, game.state.idCounter);

    return clone;
}

function spawnClone(darkness: CurseDarkness, target: Character, game: Game) {
    const maxClones = Math.ceil(darkness.level / 10);
    if (darkness.evilIdRefs.length > 0 || maxClones <= darkness.cloneCounter) return;
    if (darkness.nextCloneSpawnTime !== undefined && darkness.nextCloneSpawnTime > game.state.time) return;
    darkness.nextCloneSpawnTime = game.state.time + CLONE_SPAWN_INTERVAL;
    const clone = createClone(target, game);
    if (!target.pets) target.pets = [];
    let cloneDamageFactor = 1;
    let cloneSizeFactor = 1;
    if (maxClones - 1 === darkness.cloneCounter) {
        cloneDamageFactor = 1 - (maxClones - (darkness.level / 10));
        cloneSizeFactor = 0.5 + (cloneDamageFactor / 2);
    }
    clone.damageDoneFactor *= cloneDamageFactor;
    clone.width *= cloneSizeFactor;
    clone.height *= cloneSizeFactor;
    target.pets.push(clone);
    darkness.cloneCounter++;
    if (darkness.turnEvilTime === undefined) darkness.turnEvilTime = game.state.time + TIME_TO_TURN_EVIL;
}

function startTurnEvil(darkness: CurseDarkness, target: Character, game: Game) {
    if (darkness.turnEvilTime === undefined || !target.pets) return;
    if (darkness.turnEvilTime > game.state.time) return;
    for (let i = target.pets.length - 1; i >= 0; i--) {
        const pet = target.pets[i];
        if (pet.type !== CHARACTER_PET_TYPE_CLONE) continue;
        const clone = pet as CharacterPetClone;
        if (clone.turnEvilStartedTime !== undefined) return;
        clone.turnEvilDuration = EVIL_TRANSFORM_TIME;
        clone.turnEvilStartedTime = game.state.time;
        createDarkCharacterPaint(clone);
    }
}

function createDarkCharacterPaint(clone: CharacterPetClone) {
    if (clone.paint.randomizedCharacterImage) {
        const orig = clone.paint.randomizedCharacterImage;
        clone.tempDarkCharacterImage = {
            chestIndex: orig.chestIndex,
            clothColor: "black",
            headIndex: orig.headIndex,
            legsIndex: orig.legsIndex,
            skinColor: "black"
        }
    }
}

function turnEvil(darkness: CurseDarkness, target: Character, game: Game) {
    if (darkness.turnEvilTime === undefined || !target.pets) return;
    if (darkness.turnEvilTime + EVIL_TRANSFORM_TIME > game.state.time) return;
    for (let i = target.pets.length - 1; i >= 0; i--) {
        const pet = target.pets[i];
        if (pet.type !== CHARACTER_PET_TYPE_CLONE) continue;
        const clone = target.pets.splice(i, 1)[0] as CharacterPetClone;
        clone.faction = FACTION_ENEMY;
        clone.type = CHARACTER_TYPE_BOSS_CLONE_ENEMY;
        const level = game.state.bossStuff.bossLevelCounter + Math.floor(darkness.level / 5);
        clone.paint.randomizedCharacterImage = clone.tempDarkCharacterImage;
        clone.tempDarkCharacterImage = undefined;
        setCharacterToBossLevel(clone, level);
        game.state.bossStuff.bosses.push(clone);
        darkness.evilIdRefs.push(clone.id);
    }
    darkness.turnEvilTime = undefined;
    darkness.cloneCounter = 0;
}

function tickDarkness(curse: Curse, target: Character, game: Game) {
    const darkness = curse as CurseDarkness;
    spawnClone(darkness, target, game);
    startTurnEvil(darkness, target, game);
    turnEvil(darkness, target, game);
}

