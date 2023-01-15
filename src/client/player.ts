import { Character, createPlayerCharacter } from "./character/characterModel.js";
import { Game, IdCounter, Position } from "./gameModel.js";
import { findNearNonBlockingPosition } from "./map/map.js";
import { ActionsPressed, createActionsPressed } from "./playerInput.js";
import { RandomSeed } from "./randomNumberGenerator.js";

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
    let keyBindings = new Map<string, string>();
    keyBindings.set("KeyA", "left");
    keyBindings.set("KeyS", "down");
    keyBindings.set("KeyD", "right");
    keyBindings.set("KeyW", "up");

    keyBindings.set("Digit1", "upgrade1");
    keyBindings.set("Digit2", "upgrade2");
    keyBindings.set("Digit3", "upgrade3");
    return keyBindings;
}

function addPlayer(idCounter: IdCounter, clientId: number, players: Player[], pos: Position, seed: RandomSeed) {
    let character = createPlayerCharacter(idCounter, pos, seed);
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