import { playerCharactersAddBossSkillPoints } from "./character/character.js";
import { gameRestart } from "./game.js";
import { Debugging, Game } from "./gameModel.js";
import { createMap } from "./map/map.js";
import { nextRandom } from "./randomNumberGenerator.js";

export function addHTMLDebugMenusToSettings(game: Game) {
    let settingsElement = document.getElementById("settings");
    if (!settingsElement) return;
    addSettingCheckbox("takeTimeMeasures", game);
    addSettingCheckbox("paintTileIJNumbers", game);
    addSettingCheckbox("paintMarkActiveChunks", game);
    addBossSkillPointButton(game);
    addCloseBossAreaButton(game);
}

function addSettingCheckbox(checkboxName: keyof Debugging, game: Game) {
    let settingsElement = document.getElementById("settings");
    if (!settingsElement) return;
    let debug: any = game.debug;
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
    if(button){
        button.addEventListener('click', () => {
            if(!game.multiplayer.websocket){
                const lastSeed = game.state.map.seed;
                game.state.map = createMap(1000);
                game.state.map.seed = lastSeed;
                gameRestart(game);
            }
        });
    }
}

function addBossSkillPointButton(game: Game) {
    const buttonName = "addBossSkillPoint";
    addSettingButton(buttonName);
    const button = document.getElementById(buttonName) as HTMLButtonElement;
    if(button){
        button.addEventListener('click', () => {
            if(!game.multiplayer.websocket) playerCharactersAddBossSkillPoints(game);
        });
    }
}

function addSettingButton(buttonName: string) {
    let settingsElement = document.getElementById("settings");
    if (!settingsElement) return;
    let button: HTMLButtonElement = document.getElementById(buttonName) as HTMLButtonElement;
    if (!button) {
        let canvasHTML = `
            <button type="button" id="${buttonName}" name="${buttonName}">${buttonName}</button>
        `;
        settingsElement.insertAdjacentHTML("beforeend", canvasHTML);
    }
}