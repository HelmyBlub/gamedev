import { Ability } from "./ability/ability.js"
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

export type DamageMeter = {
    maxNumberSplits: number,
    splits: AbilityDamageData[][],
}

export type AbilityDamageData = {
    abilityRefId: number,
    abilityName: string,
    totalDamage: number,
    damageBreakDown: AbilityDamageBreakdown[],
}

export type AbilityDamageBreakdown = {
    damage: number,
    name: string,
}

export function createDefaultCombatLog(): Combatlog {
    return {
        log: [],
        maxLogEntries: 30,
    }
}

export function createDamageMeter(): DamageMeter {
    return {
        maxNumberSplits: 2,
        splits: [],
    }
}

export function addDamageBreakDownToDamageMeter(damageMeter: DamageMeter, ability: Ability, breakDowns: AbilityDamageBreakdown[]) {
    if (damageMeter.splits.length === 0) damageMeter.splits.push([]);
    let abilityDamageData = damageMeter.splits[0].find(data => data.abilityRefId === ability.id);
    if (!abilityDamageData) {
        abilityDamageData = {
            abilityName: ability.name,
            abilityRefId: ability.id,
            totalDamage: 0,
            damageBreakDown: [],
        };
        damageMeter.splits[0].push(abilityDamageData);
    }
    for (let entry of breakDowns) {
        abilityDamageData.totalDamage += entry.damage;
        let tempBreakDown = abilityDamageData.damageBreakDown.find(b => b.name === entry.name);
        if (!tempBreakDown) {
            tempBreakDown = {
                damage: 0,
                name: entry.name,
            }
            abilityDamageData.damageBreakDown.push(tempBreakDown);
        }
        tempBreakDown.damage += entry.damage;
    }
}

export function createDamageMeterMoreInfo(ctx: CanvasRenderingContext2D, moreInfos: MoreInfos, damageMeter: DamageMeter): MoreInfosPartContainer | undefined {
    if (damageMeter.splits.length === 0) return;
    const moreInfosContainer = createDefaultMoreInfosContainer(ctx, "DamageMeter(WIP)", moreInfos.headingFontSize);
    const textLines: string[] = [`Damage Done:`];
    for (let abilityData of damageMeter.splits[0]) {
        textLines.push(`${(abilityData.abilityName)}: ${abilityData.totalDamage.toLocaleString()}`);
        abilityData.damageBreakDown.sort((a, b) => b.damage - a.damage);
        for (let breakDown of abilityData.damageBreakDown) {
            textLines.push(`    ${(breakDown.name)}: ${(breakDown.damage / abilityData.totalDamage * 100).toFixed(1)}%`);
        }
    }
    const damageMeterPart = createMoreInfosPart(ctx, textLines);
    moreInfosContainer.moreInfoParts.push(damageMeterPart);
    return moreInfosContainer;
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
