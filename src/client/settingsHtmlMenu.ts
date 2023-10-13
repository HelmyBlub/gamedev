import { playerCharactersAddBossSkillPoints } from "./character/character.js";
import { createBossWithLevel } from "./character/enemy/bossEnemy.js";
import { gameRestart } from "./game.js";
import { Debugging, Game } from "./gameModel.js";
import { createMap } from "./map/map.js";

export function addHTMLDebugMenusToSettings(game: Game) {
    let settingsElement = document.getElementById("settings");
    if (!settingsElement) return;
    addSettingCheckbox("takeTimeMeasures", game);
    addSettingCheckbox("paintTileXYNumbers", game);
    addSettingCheckbox("paintMarkActiveChunks", game);
    addBossSkillPointButton(game);
    addCloseBossAreaButton(game);
    addTankyButton(game);
    addSpawnBossButton(game);
    addClearLocalStorageButton(game);
}

function addSettingCheckbox(checkboxName: keyof Debugging, game: Game) {
    const settingsElement = document.getElementById("settings");
    if (!settingsElement) return;
    const debug: any = game.debug;
    let checkbox: HTMLInputElement = document.getElementById(checkboxName) as HTMLInputElement;
    if (!checkbox) {
        let canvasHTML = `
            <input type="checkbox" id="${checkboxName}" name="${checkboxName}">
            <label for="debug">${checkboxName}</label><br>
        `;
        settingsElement.insertAdjacentHTML("beforeend", canvasHTML);
        checkbox = document.getElementById(checkboxName) as HTMLInputElement;
    }
    if (checkbox) {
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                debug[checkboxName] = true;
                game.performance = {};
            } else {
                debug[checkboxName] = false;
                game.performance = {};
            }
        });
    }
}

function addCloseBossAreaButton(game: Game) {
    const buttonName = "closeEasyEndBossArea";
    addSettingButton(buttonName);
    const button = document.getElementById(buttonName) as HTMLButtonElement;
    if (button) {
        button.addEventListener('click', () => {
            if (!game.multiplayer.websocket) {
                const lastSeed = game.state.map.seed;
                game.state.map = createMap(1000);
                game.state.map.seed = lastSeed;
                gameRestart(game);
            }
        });
    }
}

function addClearLocalStorageButton(game: Game) {
    const buttonName = "clear local storage";
    addSettingButton(buttonName);
    const button = document.getElementById(buttonName) as HTMLButtonElement;
    if (button) {
        button.addEventListener('click', () => {
            localStorage.clear();
        });
    }
}

function addSpawnBossButton(game: Game) {
    const buttonName = "next boss spawn";
    addSettingButton(buttonName);
    const button = document.getElementById(buttonName) as HTMLButtonElement;
    if (button) {
        button.addEventListener('click', () => {
            if (!game.multiplayer.websocket) {
                game.state.bossStuff.bosses.push(createBossWithLevel(game.state.idCounter, game.state.bossStuff.bossLevelCounter, game));
                game.state.bossStuff.bossLevelCounter++;
            }
        });
    }
}

function addTankyButton(game: Game) {
    const buttonName = "Very Tanky";
    addSettingButton(buttonName);
    const button = document.getElementById(buttonName) as HTMLButtonElement;
    if (button) {
        button.addEventListener('click', () => {
            if (!game.multiplayer.websocket) {
                game.state.players[0].character.maxHp = 10000000;
                game.state.players[0].character.hp = game.state.players[0].character.maxHp;
            }
        });
    }
}

function addBossSkillPointButton(game: Game) {
    const buttonName = "addBossSkillPoint";
    addSettingButton(buttonName);
    const button = document.getElementById(buttonName) as HTMLButtonElement;
    if (button) {
        button.addEventListener('click', () => {
            if (!game.multiplayer.websocket) playerCharactersAddBossSkillPoints(game);
        });
    }
}

function addSettingButton(buttonName: string) {
    const settingsElement = document.getElementById("settings");
    if (!settingsElement) return;
    const button: HTMLButtonElement = document.getElementById(buttonName) as HTMLButtonElement;
    if (!button) {
        let canvasHTML = `
            <button type="button" id="${buttonName}" name="${buttonName}">${buttonName}</button><br>
        `;
        settingsElement.insertAdjacentHTML("beforeend", canvasHTML);
    }
}