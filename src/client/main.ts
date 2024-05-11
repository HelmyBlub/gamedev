import { onDomLoadSetAbilitiesFunctions } from "./ability/ability.js";
import { onDomLoadSetCharacterUpgradeFunctions } from "./character/upgrades/characterUpgrades.js";
import { addBossType } from "./character/enemy/bossEnemy.js";
import { addKingCrownType } from "./character/enemy/kingCrown.js";
import { addKingType } from "./character/enemy/kingEnemy.js";
import { onDomLoadSetCharacterClasses } from "./character/playerCharacters/playerCharacters.js";
import { handleCommand } from "./commands.js";
import { onDomLoadSetDebuffsFunctions } from "./debuff/debuff.js";
import { runner, setRelativeMousePosition } from "./game.js";
import { createDefaultGameData, Game, GameVersion } from "./gameModel.js";
import { addMapObjectsFunctions } from "./map/mapObjects.js";
import { keyDown, keyUp, mouseDown, mouseUp } from "./playerInput.js";
import { addHTMLDebugMenusToSettings } from "./settingsHtmlMenu.js";
import { localStorageLoad } from "./permanentData.js";
import { addUpgradeBuildingsFunctions } from "./map/buildings/upgradeBuilding.js";
import { onDomLoadImagesLoad } from "./imageLoad.js";
import { onDomLoadMapTiles } from "./map/map.js";
import { addGodEnemyType } from "./character/enemy/god/godEnemy.js";

var gameCount: number = 0;
export const GAME_VERSION: GameVersion = {
    major: 0,
    minor: 1,
    patch: 239,
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
        addEventListener("resize", (event) => {
            c!.height = window.innerHeight - 2;
            c!.width = window.innerWidth - 2;
        });
        c.height = window.innerHeight - 2;
        c.width = window.innerWidth - 2;
        addHTMLDebugMenusToSettings(game);
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
    addBossType();
    addKingType();
    addGodEnemyType();
    addKingCrownType();
    addMapObjectsFunctions();
    addUpgradeBuildingsFunctions();
    onDomLoadSetAbilitiesFunctions();
    onDomLoadSetDebuffsFunctions();
    onDomLoadSetCharacterUpgradeFunctions();

    onDomLoadImagesLoad(); // should be the last load
    start();
});

