import { onDomLoadSetAbilitiesFunctions } from "./ability/ability.js";
import { resetCharacter } from "./character/character.js";
import { addBossType } from "./character/enemy/bossEnemy.js";
import { addEndBossCrownType } from "./character/enemy/endBossCrown.js";
import { addEndBossType } from "./character/enemy/endBossEnemy.js";
import { onDomLoadSetCharacterClasses } from "./character/playerCharacters/playerCharacters.js";
import { handleCommand } from "./commands.js";
import { onDomLoadSetDebuffsFunctions } from "./debuff/debuff.js";
import { runner, setRelativeMousePosition } from "./game.js";
import { createDefaultGameData, Game, LOCALSTORAGE_NEXTENDBOSSES, LOCALSTORAGE_PASTCHARACTERS } from "./gameModel.js";
import { keyDown, keyUp, mouseDown, mouseUp } from "./playerInput.js";
import { addHTMLDebugMenusToSettings } from "./settingsHtmlMenu.js";

var gameCount: number = 0;

export function start() {
    const game = createGame("myCanvas");
    const pastCharactersString = localStorage.getItem(LOCALSTORAGE_PASTCHARACTERS);
    if(pastCharactersString){
        game.state.pastPlayerCharacters = JSON.parse(pastCharactersString);
        for(let pastChar of game.state.pastPlayerCharacters.characters){
            if(!pastChar) continue;
            resetCharacter(pastChar);
        }
    }
    const nextEndbossesString = localStorage.getItem(LOCALSTORAGE_NEXTENDBOSSES);
    if(nextEndbossesString){
        game.state.bossStuff.nextEndbosses = JSON.parse(nextEndbossesString);
    }
}

export function startMore() {
    let nextCssId = "myCanvas_" + gameCount;
    gameCount++;
    let canvasHTML = `<canvas id="${nextCssId}" width="400" height="300" style="border:1px solid #000000;"></canvas>`;
    document.body.insertAdjacentHTML("beforeend", canvasHTML);
    createGame(nextCssId);
}

export function createGame(canvasElementId: string | undefined, forTesting: boolean = false): Game {
    let game: Game;
    if (!forTesting && canvasElementId) {
        let c: HTMLCanvasElement | null = document.getElementById(canvasElementId) as HTMLCanvasElement;
        if (c == null) throw new DOMException("canvas element not found");
        let ctx: CanvasRenderingContext2D | null = c.getContext("2d");
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
            testRandomStartSeed: game.state.randomSeed.seed
        };
        handleCommand(game, commandRestart);
    } else {
        game = createDefaultGameData(undefined, undefined);
    }
    runner(game);
    return game;
}

document.addEventListener("DOMContentLoaded", function () {
    onDomLoadSetCharacterClasses();
    addBossType();
    addEndBossType();
    addEndBossCrownType();
    onDomLoadSetAbilitiesFunctions();
    onDomLoadSetDebuffsFunctions();

    start();
});
