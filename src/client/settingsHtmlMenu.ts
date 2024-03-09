import { experienceForEveryPlayersLeveling, playerCharactersAddBossSkillPoints } from "./character/character.js";
import { createBossWithLevel } from "./character/enemy/bossEnemy.js";
import { levelingCharacterAndClassXpGain } from "./character/playerCharacters/levelingCharacter.js";
import { deepCopy } from "./game.js";
import { Debugging, Game } from "./gameModel.js";
import { GAME_VERSION } from "./main.js";
import { initReplay, replayReplayData, testGame } from "./test/gameTest.js";

export function addHTMLDebugMenusToSettings(game: Game) {
    let settingsElement = document.getElementById("settings");
    if (!settingsElement) return;
    setVersionNumberToSettingButton();
    addSettingCheckbox("takeTimeMeasures", game);
    addSettingCheckbox("paintTileXYNumbers", game);
    addSettingCheckbox("paintMarkActiveChunks", game);
    addSettingCheckbox("activateSaveStates", game);
    addSettingCheckbox("disableDamageNumbers", game);
    addSettingCheckbox("lowKingHp", game);
    addSettingCheckbox("closeKingArea", game);
    addSettingCheckbox("closeGodArea", game);
    addBossSkillPointButton(game);
    addXpButton(game);
    addTankyButton(game);
    addSpawnBossButton(game);
    addClearLocalStorageButton(game);
    addSettingInputBoxPlayerPaintAlpha(game);
    addGiveMoneyButton(game);
    addTestButton(game);
    addCopyLastReplayButton(game);
    addReplayLastRunButton(game);
}

function setVersionNumberToSettingButton() {
    const settingsButtonElement = document.getElementById("settingButton");
    if (!settingsButtonElement) return;
    settingsButtonElement.innerHTML = `Version: ${GAME_VERSION.major}.${GAME_VERSION.minor}.${GAME_VERSION.patch}`;
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

function addSettingInputBoxPlayerPaintAlpha(game: Game) {
    const settingsElement = document.getElementById("settings");
    if (!settingsElement) return;
    const inputBoxId = "playerGlobalAlphaMultiplier";
    let input: HTMLInputElement = document.getElementById(inputBoxId) as HTMLInputElement;
    if (!input) {
        let canvasHTML = `
            <input type="number" id="${inputBoxId}" name="${inputBoxId}" value="100" style="width: 50;">
            <label for="debug">%: ${inputBoxId}</label><br>
        `;
        settingsElement.insertAdjacentHTML("beforeend", canvasHTML);
        input = document.getElementById(inputBoxId) as HTMLInputElement;
    }
    if (input) {
        input.addEventListener('input', () => {
            game.UI.playerGlobalAlphaMultiplier = parseInt(input.value) / 100;
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

function addTestButton(game: Game) {
    const buttonName = "Run Test Replays";
    addSettingButton(buttonName);
    const button = document.getElementById(buttonName) as HTMLButtonElement;
    if (button) {
        button.addEventListener('click', () => {
            if (!game.multiplayer.websocket) {
                testGame(game);
            }
        });
    }
}

function addReplayLastRunButton(game: Game) {
    const buttonName = "Replay last run";
    addSettingButton(buttonName);
    const button = document.getElementById(buttonName) as HTMLButtonElement;
    if (button) {
        button.addEventListener('click', () => {
            if (!game.multiplayer.websocket && game.testing.lastReplay) {
                game.testing.replay = initReplay();
                replayReplayData(game, deepCopy(game.testing.lastReplay));
            }
        });
    }
}

function addCopyLastReplayButton(game: Game) {
    const buttonName = "copy last replay";
    addSettingButton(buttonName);
    const button = document.getElementById(buttonName) as HTMLButtonElement;
    if (button) {
        button.addEventListener('click', () => {
            if (!game.multiplayer.websocket && game.testing.lastReplay) {
                navigator.clipboard.writeText(JSON.stringify(game.testing.lastReplay, undefined, 2));
            }
        });
    }
}
function addXpButton(game: Game) {
    const buttonName = "add alot experience";
    addSettingButton(buttonName);
    const button = document.getElementById(buttonName) as HTMLButtonElement;
    if (button) {
        button.addEventListener('click', () => {
            if (!game.multiplayer.websocket) {
                const xp = 5000000;
                levelingCharacterAndClassXpGain(game.state, xp, game);
                experienceForEveryPlayersLeveling(xp, game);
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
            if (!game.multiplayer.websocket) playerCharactersAddBossSkillPoints(50, game);
        });
    }
}

function addGiveMoneyButton(game: Game) {
    const buttonName = "give Money";
    addSettingButton(buttonName);
    const button = document.getElementById(buttonName) as HTMLButtonElement;
    if (button) {
        button.addEventListener('click', () => {
            if (!game.multiplayer.websocket) {
                if (game.state.players[0]) {
                    game.state.players[0].permanentData.money += 1000;
                }
            }
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