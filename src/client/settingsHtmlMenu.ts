import { Debugging, Game } from "./gameModel.js";

export function addHTMLDebugCheckboxesToSettings(game: Game) {
    let settingsElement = document.getElementById('settings');
    if (!settingsElement) return;
    addSettingCheckbox("takeTimeMeasures", game);
    addSettingCheckbox("paintTileIJNumbers", game);
    addSettingCheckbox("paintMarkActiveChunks", game);
}

function addSettingCheckbox(checkboxName: keyof Debugging, game: Game) {
    let settingsElement = document.getElementById('settings');
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