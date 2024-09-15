import { experienceForEveryPlayersLeveling, playerCharactersAddBossSkillPoints } from "./character/character.js";
import { Character, createPlayerCharacter } from "./character/characterModel.js";
import { createBossWithLevel } from "./character/enemy/bossEnemy.js";
import { levelingCharacterAndClassXpGain } from "./character/playerCharacters/levelingCharacter.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./character/playerCharacters/playerCharacters.js";
import { executeUpgradeOptionChoice } from "./character/upgrade.js";
import { findClientInfo, saveCharacterAsPastCharacter } from "./game.js";
import { Game } from "./gameModel.js";
import { classBuildingPlacePlayerClassStuffInBuilding } from "./map/buildings/classBuilding.js";
import { UPGRADE_BUILDINGS_FUNCTIONS, upgradeBuildingBuyUpgrade } from "./map/buildings/upgradeBuilding.js";
import { createEmptyClassBuilding } from "./map/mapObjectClassBuilding.js";
import { mapObjectPlaceUpgradeBuilding } from "./map/mapObjectUpgradeBuilding.js";
import { mapModifierGrowArea } from "./map/modifiers/mapModifier.js";
import { addMoneyAmountToPlayer } from "./player.js";
import { nextRandom } from "./randomNumberGenerator.js";
export type CheatCheckboxes = "closeKingArea" | "closeGodArea" | "lowKingHp" | "allowCheats";
export const CHEAT_ACTIONS = [
    "allowCheats",
    "closeKingArea",
    "closeGodArea",
    "lowKingHp",
    "addBossSkillPoint",
    "add alot experience",
    "Very Tanky",
    "next boss spawn",
    "give Money",
    "create end game state"
];
export type ActiveCheats = CheatCheckboxes[];

export function executeCheatAction(action: string, activate: boolean, clientId: number, game: Game) {
    if (CHEAT_ACTIONS.indexOf(action) === -1) {
        console.log("invalid cheat action");
        return;
    }
    if (action === "allowCheats") {
        const client = findClientInfo(clientId, game);
        if (client) client.allowCheats = activate;
    }
    let cheatsAllowed = true;
    for (let client of game.state.clientInfos) {
        if (!client.allowCheats) {
            cheatsAllowed = false;
            toggleCheats(false, game);
            break;
        }
    }
    if (!cheatsAllowed) return;
    toggleCheats(true, game);
    if (!game.state.activeCheats) {
        game.state.activeCheats = [];
    }
    switch (action) {
        case "closeKingArea":
        case "closeGodArea":
        case "lowKingHp":
            if (activate) {
                if (game.state.activeCheats.findIndex(a => a === action) === -1) {
                    game.state.activeCheats.push(action);
                }
            } else {
                const index = game.state.activeCheats.findIndex(a => a === action);
                if (index !== -1) {
                    game.state.activeCheats.splice(index, 1);
                }
            }
            break;
        case "addBossSkillPoint":
            playerCharactersAddBossSkillPoints(50, game);
            break;
        case "add alot experience":
            const xp = 5000000;
            levelingCharacterAndClassXpGain(game.state, xp, game);
            experienceForEveryPlayersLeveling(xp, game);
            break;
        case "Very Tanky":
            for (let player of game.state.players) {
                player.character.maxHp = 10000000;
                player.character.hp = player.character.maxHp;
            }
            break;
        case "next boss spawn":
            game.state.bossStuff.bosses.push(createBossWithLevel(game.state.idCounter, game.state.bossStuff.bossLevelCounter, game));
            game.state.bossStuff.bossLevelCounter++;
            mapModifierGrowArea(game);
            break;
        case "give Money":
            for (let player of game.state.players) {
                player.permanentData.money += 1000;
            }
            break;
        case "create end game state":
            createEndGameState(game);
    }
    if (action === "closeKingArea" || action === "closeGodArea" || action === "lowKingHp") {
        const settingsElement: HTMLInputElement | null = document.getElementById(action) as HTMLInputElement;
        if (settingsElement) settingsElement.checked = activate;
    }
}

export function toggleCheats(activate: boolean, game: Game) {
    if (activate) {
        if (!game.state.activeCheats) {
            game.state.activeCheats = [];
        }
    } else {
        game.state.activeCheats = undefined;
    }

    for (let cheat of CHEAT_ACTIONS) {
        if (cheat === "allowCheats") continue;
        const settingsElement = document.getElementById(cheat);
        const settingsElementLabel = document.getElementById(cheat + "_label");
        if (!settingsElement) continue;
        if (activate && settingsElement.classList.contains("hide")) {
            settingsElement.classList.remove("hide");
        } else if (!activate && !settingsElement.classList.contains("hide")) {
            settingsElement.classList.add("hide");
        }
        if (settingsElementLabel) {
            if (activate && settingsElementLabel.classList.contains("hide")) {
                settingsElementLabel.classList.remove("hide");
            } else if (!activate && !settingsElementLabel.classList.contains("hide")) {
                settingsElementLabel.classList.add("hide");
            }
        }
    }
}

function createEndGameState(game: Game) {
    const classKeys = Object.keys(PLAYER_CHARACTER_CLASSES_FUNCTIONS);
    for (let key of classKeys) {
        createEmptyClassBuilding(game);
        classBuildingPlacePlayerClassStuffInBuilding(key, game);
    }
    for (let i = 0; i < game.state.pastPlayerCharacters.maxNumber; i++) {
        const char = createRandomLeveldCharacter(game);
        saveCharacterAsPastCharacter(char, game);
    }
    const upgradeBuildingKeys = Object.keys(UPGRADE_BUILDINGS_FUNCTIONS);
    for (let i = 0; i < upgradeBuildingKeys.length; i++) {
        mapObjectPlaceUpgradeBuilding(game);
    }
    // get randomized upgrade levels for buildings
    for (let i = 0; i < upgradeBuildingKeys.length; i++) {
        addMoneyAmountToPlayer(100, game.state.players, game);
        for (let j = 0; j < game.state.players.length; j++) {
            upgradeBuildingBuyUpgrade(game.state.players[j], upgradeBuildingKeys[i], game);
        }
    }
}

function createRandomLeveldCharacter(game: Game): Character {
    const character = createPlayerCharacter(game.state.idCounter, { x: 0, y: 0 }, game.state.randomSeed, game);
    const randomClassChoiceIndex = Math.floor(nextRandom(game.state.randomSeed) * character.upgradeChoices.choices.length);
    const option = character.upgradeChoices.choices[randomClassChoiceIndex];
    const xp = 1000000;
    const upgrades = 20;
    executeUpgradeOptionChoice(character, option, game);
    experienceForEveryPlayersLeveling(xp, game, [character]);
    levelingCharacterAndClassXpGain(game.state, xp, game, [character]);
    if (character.upgradeChoices.choices.length === 0) {
        for (let i = 0; i < upgrades; i++) {
            playerCharactersAddBossSkillPoints(upgrades, game, [character]);
        }
    }
    while (character.upgradeChoices.choices.length) {
        const randomUpgradeChoiceIndex = Math.floor(nextRandom(game.state.randomSeed) * character.upgradeChoices.choices.length);
        const upOption = character.upgradeChoices.choices[randomUpgradeChoiceIndex];
        executeUpgradeOptionChoice(character, upOption, game);
    }

    return character;
}