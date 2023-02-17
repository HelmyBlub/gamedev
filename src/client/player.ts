import { Character, createPlayerCharacter } from "./character/characterModel.js";
import { Game, IdCounter, KeyCodeToAction, LEVELING_CHARACTER_CLASSES, Position } from "./gameModel.js";
import { findNearNonBlockingPosition } from "./map/map.js";
import { ActionsPressed, createActionsPressed } from "./playerInput.js";
import { nextRandom, RandomSeed } from "./randomNumberGenerator.js";

export type Player = {
    character: Character,
    clientId: number,
    actionsPressed: ActionsPressed,
}

export function createPlayer(clientId: number, character: Character): Player {
    return {
        clientId: clientId,
        character: character,
        actionsPressed: createActionsPressed(),
    }
}

export function createDefaultKeyBindings1() {
    let keyBindings: KeyCodeToAction = new Map();
    keyBindings.set("KeyA", { action: "left", uiDisplayInputValue: "A", isInputAlreadyDown: false });
    keyBindings.set("KeyS", { action: "down", uiDisplayInputValue: "S", isInputAlreadyDown: false });
    keyBindings.set("KeyD", { action: "right", uiDisplayInputValue: "D", isInputAlreadyDown: false });
    keyBindings.set("KeyW", { action: "up", uiDisplayInputValue: "W", isInputAlreadyDown: false });

    keyBindings.set("Digit1", { action: "upgrade1", uiDisplayInputValue: "1", isInputAlreadyDown: false });
    keyBindings.set("Digit2", { action: "upgrade2", uiDisplayInputValue: "2", isInputAlreadyDown: false });
    keyBindings.set("Digit3", { action: "upgrade3", uiDisplayInputValue: "3", isInputAlreadyDown: false });

    keyBindings.set("Mouse0", { action: "ability1", uiDisplayInputValue: "Mouse0", isInputAlreadyDown: false });
    keyBindings.set("KeyE", { action: "ability2", uiDisplayInputValue: "E", isInputAlreadyDown: false });
    keyBindings.set("KeyR", { action: "ability3", uiDisplayInputValue: "R", isInputAlreadyDown: false });

    return keyBindings;
}

function addPlayer(idCounter: IdCounter, clientId: number, players: Player[], pos: Position, seed: RandomSeed) {
    let keys = Object.keys(LEVELING_CHARACTER_CLASSES);
    let randomClassIndex = Math.floor(nextRandom(seed) * keys.length);
    let character = createPlayerCharacter(idCounter, pos, seed, keys[randomClassIndex]);
    players.push(createPlayer(clientId, character));
}

export function gameInitPlayers(game: Game) {
    let numberPlayers = Math.max(game.state.clientIds.length, 1);
    for (let i = 0; i < numberPlayers; i++) {
        let playerSpawn: Position = { x: 100, y: 100 + i * 50 };
        playerSpawn = findNearNonBlockingPosition(playerSpawn, game.state.map, game.state.idCounter);

        addPlayer(game.state.idCounter, game.state.clientIds[i], game.state.players, playerSpawn, game.state.randomSeed);
        if (game.multiplayer.myClientId === -1 || game.multiplayer.myClientId === game.state.clientIds[i]) {
            game.clientKeyBindings.push({
                clientIdRef: game.multiplayer.myClientId,
                keyCodeToActionPressed: createDefaultKeyBindings1()
            });
            game.camera.characterId = game.state.players[i].character.id;
        }
    }
}

export function findPlayerById(players: Player[], id: number): Player | null {
    for (let i = 0; i < players.length; i++) {
        if (players[i].clientId === id) {
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