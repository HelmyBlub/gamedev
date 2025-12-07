import { onDomLoadSetAbilitiesFunctions } from "./ability/ability.js";
import { onDomLoadSetCharacterUpgradeFunctions } from "./character/upgrades/characterUpgrades.js";
import { onDomLoadSetCharacterClasses } from "./character/playerCharacters/playerCharacters.js";
import { handleCommand } from "./commands.js";
import { onDomLoadSetDebuffsFunctions } from "./debuff/debuff.js";
import { runner, setRelativeMousePosition } from "./game.js";
import { createDefaultGameData, Game, GameVersion } from "./gameModel.js";
import { addMapObjectsFunctions } from "./map/mapObjects.js";
import { keyDown, keyUp, mouseDown, mouseUp, mouseWheel } from "./input/playerInput.js";
import { addHTMLDebugMenusToSettings } from "./settingsHtmlMenu.js";
import { localStorageLoad } from "./permanentData.js";
import { addUpgradeBuildingsFunctions } from "./map/buildings/upgradeBuilding.js";
import { onDomLoadImagesLoad } from "./imageLoad.js";
import { onDomLoadMapTiles } from "./map/map.js";
import { onDomLoadSetAchievementsFunctions } from "./achievements/achievements.js";
import { onDomLoadMapModifiers } from "./map/modifiers/mapModifier.js";
import { touchStart, touchMove, touchEnd } from "./input/inputTouch.js";
import { onDomLoadSetCharactersFunctions } from "./character/character.js";
import { onDomLoadCurses } from "./curse/curse.js";
import { addMapAreaSpawnOnDistanceFunctions } from "./map/mapAreaSpawnOnDistance.js";

var gameCount: number = 0;
export const GAME_VERSION: GameVersion = {
    major: 0,
    minor: 4,
    patch: 418,
}

export function start() {
    const game = createGame("myCanvas");
}

export function startMore() {
    const nextCssId = "myCanvas_" + gameCount;
    gameCount++;
    const canvasHTML = `<canvas id="${nextCssId}" width="400" height="300" style="border:1px solid #000000;"></canvas>`;
    document.body.insertAdjacentHTML("beforeend", canvasHTML);
    createGame(nextCssId);
}

export function createGame(canvasElementId: string | undefined, forTesting: boolean = false): Game {
    let game: Game;
    if (!forTesting && canvasElementId) {
        const c: HTMLCanvasElement | null = document.getElementById(canvasElementId) as HTMLCanvasElement;
        if (c == null) throw new DOMException("canvas element not found");
        const ctx: CanvasRenderingContext2D | null = c.getContext("2d");
        if (ctx == null) throw new DOMException("CanvasRenderingContext2D element not found");
        game = createDefaultGameData(c, ctx);
        document.addEventListener('keydown', (e) => keyDown(e, game), false);
        document.addEventListener('keyup', (e) => keyUp(e, game), false);
        c.addEventListener('mousedown', (e) => mouseDown(e, game));
        c.addEventListener('mousemove', (e) => setRelativeMousePosition(e, game));
        c.addEventListener('mouseup', (e) => mouseUp(e, game));
        c.addEventListener('wheel', (e) => mouseWheel(e, game), { passive: false });
        c.addEventListener("touchstart", (e) => touchStart(e, game), { passive: false });
        c.addEventListener("touchmove", (e) => touchMove(e, game), { passive: false });
        c.addEventListener("touchcancel", (e) => touchEnd(e, game), false);
        c.addEventListener("touchend", (e) => touchEnd(e, game), false);

        addEventListener("resize", (event) => {
            c!.height = window.innerHeight - 2;
            c!.width = window.innerWidth - 2;
        });
        c.height = window.innerHeight - 2;
        c.width = window.innerWidth - 2;
        addHTMLDebugMenusToSettings(game);
        // makes a double restart on game start to setup recording of replay, which is required to start with a "restart" command
        const commandRestart = {
            command: "restart",
            clientId: game.multiplayer.myClientId,
            recordInputs: true,
            replay: false,
            testMapSeed: game.state.map.seed,
            testRandomStartSeed: game.state.randomSeed.seed,
            testEnemyTypeDirectionSeed: game.state.enemyTypeDirectionSeed,
        };
        localStorageLoad(game);
        handleCommand(game, commandRestart);
    } else {
        game = createDefaultGameData(undefined, undefined);
    }
    runner(game);
    return game;
}

document.addEventListener("DOMContentLoaded", function () {
    onDomLoadMapTiles();
    onDomLoadSetCharacterClasses();
    onDomLoadSetCharactersFunctions();
    addMapObjectsFunctions();
    addMapAreaSpawnOnDistanceFunctions();
    addUpgradeBuildingsFunctions();
    onDomLoadSetAbilitiesFunctions();
    onDomLoadSetDebuffsFunctions();
    onDomLoadSetCharacterUpgradeFunctions();
    onDomLoadSetAchievementsFunctions();
    onDomLoadMapModifiers();
    onDomLoadCurses();

    onDomLoadImagesLoad(); // should be the last load
    start();
});

