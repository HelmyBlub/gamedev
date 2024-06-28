import { experienceForEveryPlayersLeveling, playerCharactersAddBossSkillPoints } from "./character/character.js";
import { createBossWithLevel } from "./character/enemy/bossEnemy.js";
import { levelingCharacterAndClassXpGain } from "./character/playerCharacters/levelingCharacter.js";
import { findClientInfo } from "./game.js";
import { Game } from "./gameModel.js";
export type Cheat = "closeKingArea" | "closeGodArea" | "lowKingHp" | "allowCheats";
export const CHEAT_ACTIONS = [
    "allowCheats",
    "closeKingArea",
    "closeGodArea",
    "lowKingHp",
    "addBossSkillPoint",
    "add alot experience",
    "Very Tanky",
    "next boss spawn",
    "give Money"
];
export type ActiveCheats = Cheat[];

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
            break;
        case "give Money":
            for (let player of game.state.players) {
                player.permanentData.money += 1000;
            }
            break;

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