import { findMyCharacter, resetCharacter } from "./character/character.js";
import { Character, createPlayerCharacter } from "./character/characterModel.js";
import { getCelestialDirection } from "./character/enemy/bossEnemy.js";
import { CHARACTER_TYPE_GOD_ENEMY } from "./character/enemy/god/godEnemy.js";
import { CHARACTER_TYPE_KING_ENEMY, modifyCharacterToKing } from "./character/enemy/kingEnemy.js";
import { CharacterUpgrades, addCharacterUpgrades } from "./character/upgrades/characterUpgrades.js";
import { calculateDistance, createPaintTextData, deepCopy, findClientInfo, getCameraPosition } from "./game.js";
import { Game, IdCounter, KeyCodeToAction, Position } from "./gameModel.js";
import { findNearNonBlockingPosition, getMapMidlePosition } from "./map/map.js";
import { MoreInfoPart, MoreInfos, MoreInfosPartContainer, createDefaultMoreInfosContainer, createMoreInfosPart } from "./moreInfo.js";
import { localStorageSavePermanentPlayerData } from "./permanentData.js";
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

export type MoneyGainedThisRun = {
    text: string,
    amount: number,
}[];

export function createPlayer(clientId: number, character: Character): Player {
    return {
        clientId: clientId,
        character: character,
        actionsPressed: createActionsPressed(),
        permanentData: {
            money: 0,
            upgrades: {},
        },
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
    keyBindings.set("Digit5", { action: "upgrade5", uiDisplayInputValue: "5", isInputAlreadyDown: false });

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
    keyBindings.set("Tab", { action: "More Info", uiDisplayInputValue: "TAB", isInputAlreadyDown: false });
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

export function addPlayerMoney(game: Game, isKingKill: boolean = false, isGodKill: boolean = false) {
    let highestPlayerDistance = 0;
    for (let i = 0; i < game.state.players.length; i++) {
        const player = game.state.players[i];
        const distance = Math.round(calculateDistance(player.character, getMapMidlePosition(game.state.map)));
        if (distance > highestPlayerDistance) highestPlayerDistance = distance;
    }
    let moneyGain = calculateMoneyGainByDistance(highestPlayerDistance);
    game.UI.moneyGainedThisRun.push({
        amount: moneyGain,
        text: `for distance of ${highestPlayerDistance}`,
    });
    if (isKingKill && game.state.bossStuff.bosses.length >= 2) {
        const boss = game.state.bossStuff.bosses[game.state.bossStuff.bosses.length - 2];
        if (boss) {
            const kingMoney = calculateMoneyForKingMaxHp(boss.maxHp);
            game.UI.moneyGainedThisRun.push({
                amount: kingMoney,
                text: `for King kill of ${boss.maxHp} HP`,
            });
            moneyGain += kingMoney;
        };
    } else if (isGodKill) {
        const boss = game.state.bossStuff.bosses[game.state.bossStuff.bosses.length - 1];
        if (boss && boss.type === CHARACTER_TYPE_GOD_ENEMY) {
            const godMoney = calculateMoneyForKingMaxHp(boss.maxHp) * 2;
            game.UI.moneyGainedThisRun.push({
                amount: godMoney,
                text: `for God kill`,
            });
            moneyGain += godMoney;
        };
    }
    addMoneyAmountToPlayer(moneyGain, game.state.players, game);
}

export function createMoreInfoMoney(moreInfos: MoreInfos, game: Game): MoreInfosPartContainer | undefined {
    if (!game.ctx) return;
    const container = createDefaultMoreInfosContainer(game.ctx, "Money", moreInfos.headingFontSize);
    const moneyGainTexts: string[] = getTextYouGainMoneyWhen();
    const moneyGainExplainPart = createMoreInfosPart(game.ctx, moneyGainTexts);
    container.moreInfoParts.push(moneyGainExplainPart);

    const moneyPossibilities = createMoreInfoMoneyPossibilitiesPart(game.ctx, game);
    if (moneyPossibilities) container.moreInfoParts.push(moneyPossibilities);
    const moneyGainedThisRun = createMoreInfoMoneyGainedPart(game.ctx, game);
    if (moneyGainedThisRun) container.moreInfoParts.push(moneyGainedThisRun);
    return container;
}

export function createMoreInfoMoneyPossibilitiesPart(ctx: CanvasRenderingContext2D, game: Game): MoreInfoPart | undefined {
    const playerCharacter = findMyCharacter(game);
    if (!playerCharacter) return;

    const playerDistance = Math.round(calculateDistance(playerCharacter, getMapMidlePosition(game.state.map)));
    const moneyForDistance = calculateMoneyGainByDistance(playerDistance);
    const increasedDistance = playerDistance + 10000;
    const moneyForIncreasedDistance = calculateMoneyGainByDistance(increasedDistance);
    const celestialDirection = getCelestialDirection(playerCharacter, game.state.map);
    let kingChar: Character | undefined = undefined;
    const king = game.state.bossStuff.nextKings[celestialDirection];
    if (!king) return;
    kingChar = deepCopy(king) as Character;
    modifyCharacterToKing(kingChar, game);
    kingChar.type = CHARACTER_TYPE_KING_ENEMY;
    resetCharacter(kingChar, game);
    const moneyForKingKill = calculateMoneyForKingMaxHp(kingChar.maxHp);

    const moneyPossibilities: string[] = [
        `Possible money gains:`,
        `  -for next Boss of level ${game.state.bossStuff.bossLevelCounter} kill: ${game.state.bossStuff.bossLevelCounter}$`,
        `  -for King of the ${celestialDirection} kill: ${moneyForKingKill}$`,
        `  -for ${playerDistance} distance on death: ${moneyForDistance.toFixed()}$`,
        `  -for ${increasedDistance} distance on death: ${moneyForIncreasedDistance.toFixed()}$`,
    ];
    if (playerCharacter.bonusMoneyFactor !== undefined && playerCharacter.bonusMoneyFactor > 1) {
        moneyPossibilities.push(``);
        moneyPossibilities.push(`further increase by ${((playerCharacter.bonusMoneyFactor - 1) * 100).toFixed()}% from Upgrades.`);
    }
    return createMoreInfosPart(ctx, moneyPossibilities);
}

export function createMoreInfoMoneyGainedPart(ctx: CanvasRenderingContext2D, game: Game): MoreInfoPart | undefined {
    const gainedThisRun = game.UI.moneyGainedThisRun;
    if (gainedThisRun.length === 0) return undefined;
    const moneyGainedThisRunPart: string[] = [
        `Money Gained this Run:`,
    ];
    const myChar = findMyCharacter(game);
    let bonusMoney = 1;
    if (myChar && myChar.bonusMoneyFactor !== undefined && myChar.bonusMoneyFactor > 1) {
        bonusMoney = myChar.bonusMoneyFactor;
    }
    for (let moneyGain of gainedThisRun) {
        moneyGainedThisRunPart.push(`  -${moneyGain.text}: ${(moneyGain.amount * bonusMoney).toFixed(2)}$`);
    }


    return createMoreInfosPart(ctx, moneyGainedThisRunPart);
}

export function getTextYouGainMoneyWhen(): string[] {
    const texts: string[] = [
        `You gain money when:`,
        `- your character dies`,
        `    - money based on distance`,
        `    - money gained linear until 20k distance.`,
        `    - money gained exponential after 20k distance.`,
        `- you defeat a King`,
        `    - money based on King max HP`,
        `- you defeat a Boss`,
        `    - money based on Boss level`,
    ];
    return texts;
}

export function addMoneyAmountToPlayer(moneyAmount: number, players: Player[], game: Game) {
    for (let player of players) {
        const moneyFactor = player.character.bonusMoneyFactor !== undefined ? player.character.bonusMoneyFactor : 1;
        const finalMoneyAmount = moneyAmount * moneyFactor;
        player.permanentData.money += finalMoneyAmount;
        if (finalMoneyAmount > 0 && player.clientId === game.multiplayer.myClientId) {
            const textPosition = getCameraPosition(game);
            game.UI.displayTextData.push(createPaintTextData(textPosition, `$${finalMoneyAmount.toFixed(1)}`, "black", "24", game.state.time, 5000));
        }
    }
    localStorageSavePermanentPlayerData(game);
}

function calculateMoneyGainByDistance(distance: number): number {
    let moneyGain = 0;
    if (distance < 20000) {
        moneyGain = Math.floor(distance / 1000);
    } else {
        moneyGain = 20 * Math.pow(10, Math.log2(distance / 20000));
    }
    return moneyGain;
}

function calculateMoneyForKingMaxHp(maxHp: number): number {
    return maxHp / 2500000;;
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
