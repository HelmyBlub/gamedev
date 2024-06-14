import { createDefaultAchivements } from "./achievements/achievements.js";
import { experienceForEveryPlayersLeveling, findAndSetNewCameraCharacterId, playerCharactersAddBossSkillPoints } from "./character/character.js";
import { createBossWithLevel } from "./character/enemy/bossEnemy.js";
import { levelingCharacterAndClassXpGain } from "./character/playerCharacters/levelingCharacter.js";
import { deepCopy, getGameVersionString } from "./game.js";
import { Debugging, Game } from "./gameModel.js";
import { GAME_VERSION } from "./main.js";
import { resetPermanentData } from "./permanentData.js";
import { compressString, downloadBlob, loadCompressedStateFromUrl } from "./stringCompress.js";
import { initReplay, replayReplayData, testGame } from "./test/gameTest.js";

type SettingsLocalStorage = {
    sliderVolume: number,
    soundDelay: number,
    playerAlpha: number,
    disableDamageNumbers: boolean,
}
const LOCALSTORAGE_SETTINGS = "settings";

export function addHTMLDebugMenusToSettings(game: Game) {
    let settingsElement = document.getElementById("menu");
    if (!settingsElement) return;
    setVersionNumberToSettingButton();
    addSettings(game);
    addDebug(game);
    addTest(game);
}

function saveSettingsInLocalStorage(settingsLocalStorage: SettingsLocalStorage) {
    localStorage.setItem(LOCALSTORAGE_SETTINGS, JSON.stringify(settingsLocalStorage));
}

function getSettingsFromLocalStorage(): SettingsLocalStorage {
    const settings = localStorage.getItem(LOCALSTORAGE_SETTINGS);
    if (settings) return JSON.parse(settings) as SettingsLocalStorage;
    return {
        disableDamageNumbers: false,
        playerAlpha: 100,
        sliderVolume: 10,
        soundDelay: 0,
    };
}

function addSettings(game: Game) {
    const settings = getSettingsFromLocalStorage();
    addSettingSliderVolume(game, settings);
    addSettingInputBoxSoundDelay(game, settings);
    addSettingInputBoxPlayerPaintAlpha(game, settings);
    addSettingCheckbox("disableDamageNumbers", game, "settings", settings);
    addClearLocalStorageButton(game);
}

function addDebug(game: Game) {
    addSettingCheckbox("takeTimeMeasures", game);
    addSettingCheckbox("paintTileXYNumbers", game);
    addSettingCheckbox("paintMarkActiveChunks", game);
    addSettingCheckbox("lowKingHp", game);
    addSettingCheckbox("closeKingArea", game);
    addSettingCheckbox("closeGodArea", game);
    addBossSkillPointButton(game);
    addXpButton(game);
    addTankyButton(game);
    addSpawnBossButton(game);
    addGiveMoneyButton(game);
}

function addTest(game: Game) {
    addSettingCheckbox("activateSaveStates", game, "test");
    addTestButton(game);
    addReplayLastRunButton(game);
    addCopyLastReplayButton(game);
    addCopyCurrentReplayButton(game);
    addCurrentStateToFileButton(game);
    addLoadTestStateButton(game);
}

function setVersionNumberToSettingButton() {
    const settingsButtonElement = document.getElementById("settingButton");
    if (!settingsButtonElement) return;
    settingsButtonElement.innerHTML = `Version: ${getGameVersionString(GAME_VERSION)}`;
}

function addSettingCheckbox(checkboxName: keyof Debugging, game: Game, tabCategory: string = "debug", settings: SettingsLocalStorage | undefined = undefined) {
    const settingsElement = document.getElementById(tabCategory);
    if (!settingsElement) return;
    const debug: any = game.debug;
    let checkbox: HTMLInputElement = document.getElementById(checkboxName) as HTMLInputElement;
    if (!checkbox) {
        let canvasHTML = `
            <input type="checkbox" id="${checkboxName}" name="${checkboxName}">
            <label for="${checkboxName}">${checkboxName}</label><br>
        `;
        settingsElement.insertAdjacentHTML("beforeend", canvasHTML);
        checkbox = document.getElementById(checkboxName) as HTMLInputElement;
    }
    if (checkbox) {
        let settingExists = settings && (settings as any)[checkboxName] !== undefined;
        if (settingExists) {
            checkbox.checked = (settings as any)[checkboxName];
            debug[checkboxName] = checkbox.checked;
        }
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                debug[checkboxName] = true;
                game.performance = {};
            } else {
                debug[checkboxName] = false;
                game.performance = {};
            }
            if (settings && settingExists) {
                (settings as any)[checkboxName] = checkbox.checked;
                saveSettingsInLocalStorage(settings);
            }
        });
    }
}

function addSettingSliderVolume(game: Game, settings: SettingsLocalStorage) {
    const settingsElement = document.getElementById("settings");
    if (!settingsElement) return;
    const inputBoxId = "volume";
    let input: HTMLInputElement = document.getElementById(inputBoxId) as HTMLInputElement;
    if (!input) {
        let canvasHTML = `
            <input type="range" id="${inputBoxId}" name="${inputBoxId}" min=0 max=100 value="${settings.sliderVolume}" style="width: 50;" oninput="this.nextElementSibling.value = this.value">
            <output>${settings.sliderVolume}</output>
            <label for="debug">: ${inputBoxId}</label><br>
        `;
        settingsElement.insertAdjacentHTML("beforeend", canvasHTML);
        input = document.getElementById(inputBoxId) as HTMLInputElement;
        if (game.sound) game.sound.volume.gain.setValueAtTime(settings.sliderVolume / 100, game.sound.audioContext.currentTime);
    }
    if (input) {
        input.addEventListener('input', () => {
            if (game.sound) {
                settings.sliderVolume = parseInt(input.value);
                saveSettingsInLocalStorage(settings);
                game.sound.volume.gain.setValueAtTime(settings.sliderVolume / 100, game.sound.audioContext.currentTime);
            }
        });
    }
}

function addSettingInputBoxPlayerPaintAlpha(game: Game, settings: SettingsLocalStorage) {
    const settingsElement = document.getElementById("settings");
    if (!settingsElement) return;
    const inputBoxId = "playerGlobalAlphaMultiplier";
    let input: HTMLInputElement = document.getElementById(inputBoxId) as HTMLInputElement;
    if (!input) {
        let canvasHTML = `
            <input type="number" id="${inputBoxId}" step="5" max=100 min=0 name="${inputBoxId}" value="${settings.playerAlpha}" style="width: 50px;">
            <label for="debug">%: ${inputBoxId}</label><br>
        `;
        settingsElement.insertAdjacentHTML("beforeend", canvasHTML);
        game.UI.playerGlobalAlphaMultiplier = settings.playerAlpha / 100;
        input = document.getElementById(inputBoxId) as HTMLInputElement;
    }
    if (input) {
        input.addEventListener('input', () => {
            settings.playerAlpha = parseInt(input.value);
            saveSettingsInLocalStorage(settings);
            game.UI.playerGlobalAlphaMultiplier = settings.playerAlpha / 100;
        });
    }
}

function addSettingInputBoxSoundDelay(game: Game, settings: SettingsLocalStorage) {
    const settingsElement = document.getElementById("settings");
    if (!settingsElement) return;
    const inputBoxId = "soundDelay";
    let input: HTMLInputElement = document.getElementById(inputBoxId) as HTMLInputElement;
    if (!input) {
        let canvasHTML = `
            <input type="number" id="${inputBoxId}" step=10 name="${inputBoxId}" value="${settings.soundDelay}" style="width: 50px;">
            <label for="debug">: ${inputBoxId} in ms</label><br>
        `;
        settingsElement.insertAdjacentHTML("beforeend", canvasHTML);
        if (game.sound) game.sound.customDelay = settings.soundDelay;
        input = document.getElementById(inputBoxId) as HTMLInputElement;
    }
    if (input) {
        input.addEventListener('input', () => {
            if (game.sound) {
                game.sound.customDelay = parseInt(input.value);
                settings.soundDelay = game.sound.customDelay;
                saveSettingsInLocalStorage(settings);
            }
        });
    }
}

function addClearLocalStorageButton(game: Game) {
    const buttonName = "delete all data (page reload required)";
    addButtonToTab(buttonName, "settings");
    const button = document.getElementById(buttonName) as HTMLButtonElement;
    if (button) {
        button.addEventListener('click', () => {
            resetPermanentData();
        });
        button.style.marginTop = "20px";
    }
}

function addSpawnBossButton(game: Game) {
    const buttonName = "next boss spawn";
    addButtonToTab(buttonName, "debug");
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
    addButtonToTab(buttonName, "debug");
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
    addButtonToTab(buttonName, "test");
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
    addButtonToTab(buttonName, "test");
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
    addButtonToTab(buttonName, "test");
    const button = document.getElementById(buttonName) as HTMLButtonElement;
    if (button) {
        button.addEventListener('click', () => {
            if (game.testing.lastReplay) {
                navigator.clipboard.writeText(JSON.stringify(game.testing.lastReplay, undefined, 2));
            }
        });
    }
}

function addCopyCurrentReplayButton(game: Game) {
    const buttonName = "copy current replay";
    addButtonToTab(buttonName, "test");
    const button = document.getElementById(buttonName) as HTMLButtonElement;
    if (button) {
        button.addEventListener('click', () => {
            if (game.testing.record) {
                navigator.clipboard.writeText(JSON.stringify(game.testing.record.data, undefined, 2));
            }
        });
    }
}

function addCurrentStateToFileButton(game: Game) {
    const buttonName = "save current game state to file";
    addButtonToTab(buttonName, "test");
    const button = document.getElementById(buttonName) as HTMLButtonElement;
    if (button) {
        button.addEventListener('click', () => {
            if (!game.multiplayer.websocket) {
                const compressedString = compressString(JSON.stringify(game.state, undefined, 2));
                downloadBlob(compressedString, 'testState1.bin', 'application/octet-stream');
            }
        });
    }
}

function addLoadTestStateButton(game: Game) {
    const buttonName = "load test state1";
    addButtonToTab(buttonName, "test");
    const button = document.getElementById(buttonName) as HTMLButtonElement;
    if (button) {
        button.addEventListener('click', async () => {
            if (!game.multiplayer.websocket) {
                game.state = await loadCompressedStateFromUrl("/data/testState1.bin", game);
                if (game.state.achievements === undefined) game.state.achievements = createDefaultAchivements();
                game.multiplayer.disableLocalStorage = true;
                game.performance = {};
                findAndSetNewCameraCharacterId(game.camera, game.state.players, game.multiplayer.myClientId);
            }
        });
    }
}

function addXpButton(game: Game) {
    const buttonName = "add alot experience";
    addButtonToTab(buttonName, "debug");
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
    addButtonToTab(buttonName, "debug");
    const button = document.getElementById(buttonName) as HTMLButtonElement;
    if (button) {
        button.addEventListener('click', () => {
            if (!game.multiplayer.websocket) playerCharactersAddBossSkillPoints(50, game);
        });
    }
}

function addGiveMoneyButton(game: Game) {
    const buttonName = "give Money";
    addButtonToTab(buttonName, "debug");
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

function addButtonToTab(buttonName: string, tabCategory: string) {
    const settingsElement = document.getElementById(tabCategory);
    if (!settingsElement) return;
    const button: HTMLButtonElement = document.getElementById(buttonName) as HTMLButtonElement;
    if (!button) {
        let canvasHTML = `
            <button type="button" id="${buttonName}" name="${buttonName}">${buttonName}</button><br>
        `;
        settingsElement.insertAdjacentHTML("beforeend", canvasHTML);
    }
}