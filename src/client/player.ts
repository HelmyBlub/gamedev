import { Character, createPlayerCharacter } from "./character.js";
import { Game } from "./game.js";
import { ActionsPressed, createActionsPressed } from "./playerInput.js";

export type Player = {
    characterIdRef: number,
    clientId: number,
    actionsPressed: ActionsPressed,
}

export function createPlayer(clientId: number, characterId: number): Player {
    return {
        clientId: clientId,
        characterIdRef: characterId,
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

function addPlayer(game: Game, clientId: number, characters: Character[], players: Player[], x: number, y: number) {
    characters.push(createPlayerCharacter(game,x, y));
    players.push(createPlayer(clientId, characters[characters.length - 1].id));
}

export function gameInitPlayers(game: Game){
    let numberPlayers = Math.max(game.state.clientIds.length, 1);
    for (let i = 0; i < numberPlayers; i++) {
        addPlayer(game, game.state.clientIds[i], game.state.characters, game.state.players, 100, 100 + i * 50);
        if (game.multiplayer.myClientId === -1 || game.multiplayer.myClientId === game.state.clientIds[i]) {
            game.clientKeyBindings.push({
                clientIdRef: game.multiplayer.myClientId,
                keyCodeToActionPressed: createDefaultKeyBindings1()
            });
            game.camera.characterId = game.state.characters[game.state.characters.length - 1].id;
        }
    }
}

export function findPlayerById(players: Player[], id: number): Player | null{
    for(let i = 0; i< players.length; i++){
        if(players[i].clientId === id){
            return players[i];
        }
    }
    return null;
}