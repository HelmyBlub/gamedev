import { Ability } from "./ability/ability.js"
import { getPlayerCharacters } from "./character/character.js"
import { Character } from "./character/characterModel.js"
import { getTimeSinceFirstKill } from "./game.js"
import { Game } from "./gameModel.js"
import { MoreInfoPart, MoreInfos, MoreInfosPartContainer, createDefaultMoreInfosContainer, createMoreInfosPart } from "./moreInfo.js"

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
    splits: DamageMeterSplit[],
}

export type DamageMeterSplit = {
    title: string,
    damageData: AbilityDamageData[],
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
        maxNumberSplits: 3,
        splits: [{
            damageData: [],
            title: "Split 1",
        }],
    }
}

export function doDamageMeterSplit(splitTitle: string, game: Game) {
    game.UI.damageMeter.splits.unshift({
        title: `Split ${splitTitle}`,
        damageData: [],
    });
    if (game.UI.damageMeter.maxNumberSplits < game.UI.damageMeter.splits.length) {
        game.UI.damageMeter.splits.pop();
    }
}

export function addDamageBreakDownToDamageMeter(damageMeter: DamageMeter, ability: Ability, breakDowns: AbilityDamageBreakdown[]) {
    if (damageMeter.splits.length === 0) damageMeter.splits.push({
        title: "",
        damageData: []
    });
    let abilityDamageData = damageMeter.splits[0].damageData.find(data => data.abilityRefId === ability.id);
    if (!abilityDamageData) {
        abilityDamageData = {
            abilityName: ability.name,
            abilityRefId: ability.id,
            totalDamage: 0,
            damageBreakDown: [],
        };
        damageMeter.splits[0].damageData.push(abilityDamageData);
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

export function createDamageMeterMoreInfo(ctx: CanvasRenderingContext2D, moreInfos: MoreInfos, damageMeter: DamageMeter, game: Game): MoreInfosPartContainer | undefined {
    if (damageMeter.splits.length === 0) return;
    const moreInfosDamageMeter = createDefaultMoreInfosContainer(ctx, "DamageMeter(WIP)", moreInfos.headingFontSize);
    let splitSubContainer = moreInfosDamageMeter;
    let playerSubContainer = splitSubContainer;
    for (let split of damageMeter.splits) {
        if (split.damageData.length <= 0) continue;
        if (damageMeter.splits.length > 1) {
            splitSubContainer = createDefaultMoreInfosContainer(ctx, split.title, moreInfos.headingFontSize);
            moreInfosDamageMeter.subContainer.containers.push(splitSubContainer);
            moreInfosDamageMeter.subContainer.selected = 0;
        }
        if (game.state.players.length > 1) {
            const playerMoreInfoPart = createDamageMeterPartForPlayers(ctx, split.damageData, game);
            splitSubContainer.moreInfoParts.push(playerMoreInfoPart);
        }
        for (let player of game.state.players) {
            if (game.state.players.length > 1) {
                const playerName = game.state.clientInfos.find(c => c.id === player.clientId)?.name ?? "Unknown";
                playerSubContainer = createDefaultMoreInfosContainer(ctx, playerName, moreInfos.headingFontSize);
                splitSubContainer.subContainer.containers.push(playerSubContainer);
                splitSubContainer.subContainer.selected = 0;
            }
            let damageMeterPart: MoreInfoPart | undefined;
            let playerDamageAbilityDataCounter = 0;
            for (let abilityData of split.damageData) {
                if (!player.character.abilities.find(a => a.id === abilityData.abilityRefId)) continue;
                playerDamageAbilityDataCounter++;
            }
            if (playerDamageAbilityDataCounter > 1) {
                damageMeterPart = createDamageMeterPartForAbilities(ctx, split.damageData, player.character);
                for (let abilityData of split.damageData) {
                    if (!player.character.abilities.find(a => a.id === abilityData.abilityRefId)) continue;
                    const abilityPart = createDamageMeterPartForAbility(ctx, abilityData);
                    const abilitySubContainer = createDefaultMoreInfosContainer(ctx, abilityData.abilityName, moreInfos.headingFontSize);
                    abilitySubContainer.moreInfoParts.push(abilityPart);
                    playerSubContainer.subContainer.containers.push(abilitySubContainer);
                    playerSubContainer.subContainer.selected = 0;
                }
            } else {
                for (let abilityData of split.damageData) {
                    if (!player.character.abilities.find(a => a.id === abilityData.abilityRefId)) continue;
                    damageMeterPart = createDamageMeterPartForAbility(ctx, abilityData);
                    break;
                }
            }

            if (damageMeterPart) playerSubContainer.moreInfoParts.push(damageMeterPart);
        }
    }
    return moreInfosDamageMeter;
}

function createDamageMeterPartForPlayers(ctx: CanvasRenderingContext2D, abilitiesData: AbilityDamageData[], game: Game): MoreInfoPart {
    const playersTotalDamage: { playerId: number, totalDamage: number }[] = [];
    const playerChars = getPlayerCharacters(game.state.players);
    for (let abilityData of abilitiesData) {
        let palyerChar = playerChars.find(c => c.abilities.find(a => a.id === abilityData.abilityRefId));
        if (!palyerChar) continue;
        let playerTotalDamage = playersTotalDamage.find(e => e.playerId === palyerChar!.id);
        if (playerTotalDamage === undefined) {
            playerTotalDamage = {
                playerId: palyerChar.id,
                totalDamage: 0,
            };
            playersTotalDamage.push(playerTotalDamage);
        }
        playerTotalDamage.totalDamage += abilityData.totalDamage;
    }
    playersTotalDamage.sort((a, b) => b.totalDamage - a.totalDamage);

    const textLines: string[] = [];
    for (let playerTotalDamage of playersTotalDamage) {
        const player = game.state.players.find(p => p.character.id === playerTotalDamage.playerId);
        if (!player) continue;
        const playerName = game.state.clientInfos.find(c => c.id === player.clientId)?.name ?? "Unknown";
        textLines.push(`${(playerName)}: ${playerTotalDamage.totalDamage.toLocaleString()}`);
    }
    return createMoreInfosPart(ctx, textLines);
}

function createDamageMeterPartForAbilities(ctx: CanvasRenderingContext2D, abilitiesData: AbilityDamageData[], filterCharacter: Character): MoreInfoPart {
    const textLines: string[] = [];
    abilitiesData.sort((a, b) => b.totalDamage - a.totalDamage);
    for (let abilityData of abilitiesData) {
        if (filterCharacter && !filterCharacter.abilities.find(a => a.id === abilityData.abilityRefId)) continue;
        textLines.push(`${(abilityData.abilityName)}: ${abilityData.totalDamage.toLocaleString()}`);
    }
    return createMoreInfosPart(ctx, textLines);
}

function createDamageMeterPartForAbility(ctx: CanvasRenderingContext2D, abilityData: AbilityDamageData): MoreInfoPart {
    const textLines: string[] = [];
    textLines.push(`${(abilityData.abilityName)}: ${abilityData.totalDamage.toLocaleString()}`);
    abilityData.damageBreakDown.sort((a, b) => b.damage - a.damage);
    for (let breakDown of abilityData.damageBreakDown) {
        textLines.push(`    ${(breakDown.name)}: ${(breakDown.damage / abilityData.totalDamage * 100).toFixed(1)}%`);
    }
    return createMoreInfosPart(ctx, textLines);
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
