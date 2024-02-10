import { Character, createPlayerCharacter } from "./character/characterModel.js";
import { CharacterUpgrades, addCharacterUpgrades } from "./character/upgrades/characterUpgrades.js";
import { calculateDistance, deepCopy, findClientInfo, findClientInfoByCharacterId } from "./game.js";
import { Game, IdCounter, KeyCodeToAction, Position } from "./gameModel.js";
import { findNearNonBlockingPosition } from "./map/map.js";
import { ActionsPressed, createActionsPressed } from "./playerInput.js";
import { RandomSeed } from "./randomNumberGenerator.js";

export type PermanentPlayerData = {
    money: number,
    upgrades: CharacterUpgrades,
}

export type Player = {
    character: Character,
    clientId: number,
    actionsPressed: ActionsPressed,
    permanentData: PermanentPlayerData,
}

export function createPlayer(clientId: number, character: Character): Player {
    return {
        clientId: clientId,
        character: character,
        actionsPressed: createActionsPressed(),
        permanentData: {
            money: 0,
            upgrades: {},
        }
    }
}

export function findNearesPastPlayerCharacter(character: Character, game: Game, maxDistance: number = 60): Character | undefined {
    const pastCharacters = game.state.pastPlayerCharacters.characters;
    let minDistance = maxDistance;
    let currentClosest: Character | undefined = undefined;
    for (let pastCharacter of pastCharacters) {
        if (!pastCharacter) continue;
        const distance = calculateDistance(pastCharacter, character);
        if (distance <= minDistance) {
            minDistance = distance;
            currentClosest = pastCharacter;
        }
    }
    return currentClosest;
}

export function createDefaultKeyBindings1() {
    const keyBindings: KeyCodeToAction = new Map();
    keyBindings.set("KeyA", { action: "left", uiDisplayInputValue: "A", isInputAlreadyDown: false });
    keyBindings.set("KeyS", { action: "down", uiDisplayInputValue: "S", isInputAlreadyDown: false });
    keyBindings.set("KeyD", { action: "right", uiDisplayInputValue: "D", isInputAlreadyDown: false });
    keyBindings.set("KeyW", { action: "up", uiDisplayInputValue: "W", isInputAlreadyDown: false });

    keyBindings.set("Digit1", { action: "upgrade1", uiDisplayInputValue: "1", isInputAlreadyDown: false });
    keyBindings.set("Digit2", { action: "upgrade2", uiDisplayInputValue: "2", isInputAlreadyDown: false });
    keyBindings.set("Digit3", { action: "upgrade3", uiDisplayInputValue: "3", isInputAlreadyDown: false });
    keyBindings.set("Digit4", { action: "upgrade4", uiDisplayInputValue: "4", isInputAlreadyDown: false });

    keyBindings.set("Mouse0", { action: "ability1", uiDisplayInputValue: "Mouse0", isInputAlreadyDown: false });
    keyBindings.set("KeyE", { action: "ability2", uiDisplayInputValue: "E", isInputAlreadyDown: false });
    keyBindings.set("KeyQ", { action: "ability3", uiDisplayInputValue: "Q", isInputAlreadyDown: false });

    keyBindings.set("KeyF", { action: "interact1", uiDisplayInputValue: "F", isInputAlreadyDown: false });
    keyBindings.set("KeyK", { action: "interact2", uiDisplayInputValue: "K", isInputAlreadyDown: false });

    return keyBindings;
}

export function createDefaultUiKeyBindings() {
    const keyBindings: KeyCodeToAction = new Map();
    keyBindings.set("KeyP", { action: "Pause", uiDisplayInputValue: "P", isInputAlreadyDown: false });
    keyBindings.set("KeyO", { action: "Multiplayer", uiDisplayInputValue: "O", isInputAlreadyDown: false });
    keyBindings.set("KeyG", { action: "AutoSkill", uiDisplayInputValue: "G", isInputAlreadyDown: false, activated: false });
    keyBindings.set("Tab", { action: "Info", uiDisplayInputValue: "TAB", isInputAlreadyDown: false });
    keyBindings.set("KeyT", { action: "Restart", uiDisplayInputValue: "T", isInputAlreadyDown: false });
    return keyBindings;
}

export function isAutoSkillActive(game: Game): boolean {
    if (!game.clientKeyBindings) return false;
    const keybindMap = game.clientKeyBindings.keyCodeToUiAction;
    const keys = keybindMap.keys();
    for (let key of keys) {
        const keybind = keybindMap.get(key);
        if (keybind?.action === "AutoSkill") {
            return keybind.activated ? keybind.activated : false;
        }
    }
    return false;
}

export function createPlayerWithPlayerCharacter(idCounter: IdCounter, clientId: number, players: Player[], pos: Position, seed: RandomSeed, game: Game): Player {
    const character = createPlayerCharacter(idCounter, pos, seed, game);
    return createPlayer(clientId, character);
}

export function findPlayerByCliendId(clientId: number, players: Player[]): Player | undefined {
    return players.find(p => p.clientId === clientId);
}

export function gameInitPlayers(game: Game) {
    for (let i = 0; i < game.state.clientInfos.length; i++) {
        const client = game.state.clientInfos[i];
        let player = findPlayerByCliendId(client.id, game.state.players);
        let playerSpawn: Position = { x: 100, y: 100 + i * 50 };
        playerSpawn = findNearNonBlockingPosition(playerSpawn, game.state.map, game.state.idCounter, game);
        if (!player) {
            player = createPlayerWithPlayerCharacter(game.state.idCounter, game.state.clientInfos[i].id, game.state.players, playerSpawn, game.state.randomSeed, game);
            if (game.state.players.length > 0) {
                player.permanentData = deepCopy(game.state.players[0].permanentData);
                addCharacterUpgrades(player.permanentData.upgrades, player.character, game, undefined);
            }
            game.state.players.push(player);
        } else {
            player.character = createPlayerCharacter(game.state.idCounter, playerSpawn, game.state.randomSeed, game);
            addCharacterUpgrades(player.permanentData.upgrades, player.character, game, undefined);
            player.actionsPressed = createActionsPressed();
        }
        if (game.multiplayer.myClientId === -1 || game.multiplayer.myClientId === client.id) {
            game.clientKeyBindings = {
                clientIdRef: game.multiplayer.myClientId,
                keyCodeToActionPressed: createDefaultKeyBindings1(),
                keyCodeToUiAction: createDefaultUiKeyBindings(),
            };
            game.camera.characterId = player.character.id;
        }
    }
    deletePlayersWhichLeft(game);
}

export function findPlayerById(players: Player[], clientId: number): Player | null {
    for (let i = 0; i < players.length; i++) {
        if (players[i].clientId === clientId) {
            return players[i];
        }
    }
    return null;
}

export function findPlayerByCharacterId(players: Player[], id: number): Player | null {
    for (let i = 0; i < players.length; i++) {
        if (players[i].character.id === id) {
            return players[i];
        }
    }
    return null;
}

export function getPlayerFurthestAwayFromSpawn(players: Player[]): Player | undefined {
    let highestDistance = 0;
    let furthestPlayer: Player | undefined;
    let distance = 0;
    for (let player of players) {
        distance = calculateDistance(player.character, { x: 0, y: 0 });
        if (distance > highestDistance) {
            highestDistance = distance;
            furthestPlayer = player;
        }
    }
    return furthestPlayer;
}

function deletePlayersWhichLeft(game: Game) {
    for (let i = game.state.players.length - 1; i >= 0; i--) {
        const playerClientId = game.state.players[i].clientId;
        let clientExists = findClientInfo(playerClientId, game);
        if (!clientExists) {
            game.state.players.splice(i, 1);
        }
    }
}
