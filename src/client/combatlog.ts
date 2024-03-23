import { Character } from "./character/characterModel.js"
import { getTimeSinceFirstKill } from "./game.js"
import { Game } from "./gameModel.js"
import { MoreInfos, MoreInfosPartContainer, createDefaultMoreInfosContainer, createMoreInfosPart } from "./moreInfo.js"

export type Combatlog = {
    log: CombatlogEntry[],
    maxLogEntries: number,
}

export type CombatlogEntry = {
    message: string,
    timestamp: number,
}

export function createDefaultCombatLog(): Combatlog {
    return {
        log: [],
        maxLogEntries: 30,
    }
}

export function createCombatLogMoreInfo(ctx: CanvasRenderingContext2D, moreInfos: MoreInfos, combatlog: Combatlog | undefined): MoreInfosPartContainer | undefined {
    if (combatlog === undefined) return;
    if (combatlog.log.length === 0) return;
    const moreInfosContainer = createDefaultMoreInfosContainer(ctx, "Combatlog", moreInfos.headingFontSize);
    const textLines: string[] = [`Damage Taken Log:`, `<time>:<ability> <damage>, <your Hp>`];
    for (let entry of combatlog.log) {
        textLines.push(`${(entry.timestamp / 1000).toFixed(2)}s: ${entry.message}`);
    }
    const combatlogPart = createMoreInfosPart(ctx, textLines);
    moreInfosContainer.moreInfoParts.push(combatlogPart);
    return moreInfosContainer;
}

export function addCombatlogDamageTakenEntry(character: Character, damage: number, abilityName: string, game: Game) {
    if (!character.combatlog) return;
    const combatlog = character.combatlog;
    const logMessage = `${abilityName} ${damage}, hp: ${character.hp}`;
    combatlog.log.push({
        message: logMessage,
        timestamp: getTimeSinceFirstKill(game.state),
    });
    if (combatlog.log.length > combatlog.maxLogEntries) {
        combatlog.log.shift();
    }
}
