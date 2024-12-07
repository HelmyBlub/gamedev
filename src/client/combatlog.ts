import { Ability, findAbilityAndOwnerInCharacterById, findAbilityOrCurseInCharacterById, findAbilityOwnerById } from "./ability/ability.js"
import { getPlayerCharacters } from "./character/character.js"
import { Character } from "./character/characterModel.js"
import { Curse } from "./curse/curse.js"
import { getTimeSinceFirstKill } from "./game.js"
import { Game } from "./gameModel.js"
import { MoreInfoPart, MoreInfos, MoreInfosPartContainer, createDefaultMoreInfosContainer, createMoreInfosPart } from "./moreInfo.js"

export type Combatlog = {
    damageTakenLog: CombatlogEntry[],
    damageDoneLog: CombatlogEntry[],
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
    clientId: number,
    abilityName: string,
    totalDamage: number,
    damageBreakDown: AbilityDamageBreakdown[],
    petName?: string,
}

export type AbilityDamageBreakdown = {
    damage: number,
    name: string,
}

export function createDefaultCombatLog(): Combatlog {
    return {
        damageTakenLog: [],
        damageDoneLog: [],
        maxLogEntries: 30,
    }
}

export function createDamageMeter(): DamageMeter {
    return {
        maxNumberSplits: 10,
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

export function addDamageBreakDownToDamageMeter(damageMeter: DamageMeter, ability: Ability, breakDowns: AbilityDamageBreakdown[], clientId: number, petName: string | undefined) {
    if (damageMeter.splits.length === 0) damageMeter.splits.push({
        title: "",
        damageData: []
    });
    let abilityDamageData = damageMeter.splits[0].damageData.find(data => data.abilityRefId === ability.id);
    if (!abilityDamageData) {
        abilityDamageData = {
            abilityName: ability.name,
            abilityRefId: ability.id,
            clientId: clientId,
            totalDamage: 0,
            damageBreakDown: [],
            petName: petName,
        };
        if (ability.gifted) abilityDamageData.abilityName += "[g]";
        if (ability.legendary) abilityDamageData.abilityName += "[L]";
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

export function addCurseDamageBreakDownToDamageMeter(damageMeter: DamageMeter, curse: Curse, breakDowns: AbilityDamageBreakdown[], clientId: number) {
    if (damageMeter.splits.length === 0) damageMeter.splits.push({
        title: "",
        damageData: []
    });
    let curseDamageData = damageMeter.splits[0].damageData.find(data => data.abilityRefId === curse.id);
    if (!curseDamageData) {
        curseDamageData = {
            abilityName: curse.type,
            abilityRefId: curse.id,
            clientId: clientId,
            totalDamage: 0,
            damageBreakDown: [],
        };
        damageMeter.splits[0].damageData.push(curseDamageData);
    }
    for (let entry of breakDowns) {
        curseDamageData.totalDamage += entry.damage;
    }
}


export function createCombatLogMoreInfo(ctx: CanvasRenderingContext2D, moreInfos: MoreInfos, combatlog: Combatlog | undefined): MoreInfosPartContainer | undefined {
    if (combatlog === undefined) return;
    if (combatlog.damageTakenLog.length === 0 && combatlog.damageDoneLog.length === 0) return;
    const moreInfosContainer = createDefaultMoreInfosContainer(ctx, "Combatlog", moreInfos.headingFontSize);
    const textLines: string[] = [`Damage Taken Log:`, `<time>:<ability> <damage>, <your Hp>, <sourceId>`];
    for (let entry of combatlog.damageTakenLog) {
        textLines.push(`${(entry.timestamp / 1000).toFixed(2)}s: ${entry.message}`);
    }
    const combatlogDamageTakenPart = createMoreInfosPart(ctx, textLines);
    moreInfosContainer.moreInfoParts.push(combatlogDamageTakenPart);

    const textLines2: string[] = [`Damage Done Log:`, `<time>:<ability> <damage>, <target Hp>, <targetId>`];
    for (let entry of combatlog.damageDoneLog) {
        textLines2.push(`${(entry.timestamp / 1000).toFixed(2)}s: ${entry.message}`);
    }
    const combatlogDamageDonePart = createMoreInfosPart(ctx, textLines2);
    moreInfosContainer.moreInfoParts.push(combatlogDamageDonePart);

    return moreInfosContainer;
}

export function addCombatlogDamageTakenEntry(character: Character, damage: number, abilityName: string, abilityId: number | undefined, game: Game) {
    if (!character.combatlog) return;
    const combatlog = character.combatlog;
    addLog(combatlog.damageTakenLog, character, damage, abilityName, character.id, combatlog.maxLogEntries, game);
}

export function addCombatlogDamageDoneEntry(targetCharacter: Character, damage: number, abilityName: string, damageSourceId: number, game: Game) {
    for (let char of getPlayerCharacters(game.state.players)) {
        if (!char.combatlog) continue;
        const abOwn = findAbilityOrCurseInCharacterById(char, damageSourceId);
        if (!abOwn) continue;
        const combatlog = char.combatlog;
        if (abOwn.owner !== char) {
            abilityName = `${abOwn.owner.paint?.color}${abilityName}`;
        }
        addLog(combatlog.damageDoneLog, targetCharacter, damage, abilityName, targetCharacter.id, combatlog.maxLogEntries, game);
        break;
    }
}

export function damageMeterChangeClientId(damageMeter: DamageMeter, fromId: number, toId: number) {
    for (let split of damageMeter.splits) {
        for (let data of split.damageData) {
            if (data.clientId === fromId) data.clientId = toId;
        }
    }
}

export function createDamageMeterMoreInfo(ctx: CanvasRenderingContext2D, moreInfos: MoreInfos, damageMeter: DamageMeter, game: Game): MoreInfosPartContainer | undefined {
    if (damageMeter.splits.length === 0) return;
    const moreInfosDamageMeter = createDefaultMoreInfosContainer(ctx, "DamageMeter", moreInfos.headingFontSize);
    let splitSubContainer = moreInfosDamageMeter;
    let playerSubContainer = splitSubContainer;
    for (let split of damageMeter.splits) {
        if (split.damageData.length <= 0) continue;
        if (damageMeter.splits.length > 1) {
            splitSubContainer = createDefaultMoreInfosContainer(ctx, split.title, moreInfos.headingFontSize);
            playerSubContainer = splitSubContainer;
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
            let playerAbilityData: AbilityDamageData[] = [];
            for (let abilityData of split.damageData) {
                if (abilityData.clientId !== player.clientId) continue;
                playerAbilityData.push(abilityData);
            }
            if (playerAbilityData.length > 1) {
                damageMeterPart = createDamageMeterPartForAbilities(ctx, playerAbilityData, player.character);
                for (let abilityData of playerAbilityData) {
                    if (abilityData.damageBreakDown.length <= 1) continue;
                    const abilityPart = createDamageMeterPartForAbility(ctx, abilityData);
                    const abilityContainerName = `${(abilityData.petName ?? "")}${abilityData.abilityName}`
                    const abilitySubContainer = createDefaultMoreInfosContainer(ctx, abilityContainerName, moreInfos.headingFontSize);
                    abilitySubContainer.moreInfoParts.push(abilityPart);
                    playerSubContainer.subContainer.containers.push(abilitySubContainer);
                    playerSubContainer.subContainer.selected = 0;
                }
            } else {
                for (let abilityData of playerAbilityData) {
                    damageMeterPart = createDamageMeterPartForAbility(ctx, abilityData);
                    break;
                }
            }

            if (damageMeterPart) playerSubContainer.moreInfoParts.push(damageMeterPart);
        }
    }
    return moreInfosDamageMeter;
}

function findPlayerCharacterOwnerByAbilityIdInPlayers(abilityId: number, game: Game): { character: Character, pet: Character | undefined } | undefined {
    for (let player of game.state.players) {
        const ability = player.character.abilities.find(a => a.id === abilityId);
        if (ability) return { character: player.character, pet: undefined };
        if (player.character.pets) {
            for (let pet of player.character.pets) {
                const abilityPet = pet.abilities.find(a => a.id === abilityId);
                if (abilityPet) return { character: player.character, pet: pet };
            }
        }
    }
    return undefined;
}

function addLog(combatlogEntries: CombatlogEntry[], character: Character, damage: number, abilityName: string, someId: number | undefined, maxLogEntries: number, game: Game) {
    const shieldText = character.shield > 0 ? `, shield: ${character.shield.toFixed()}` : ``;
    const logMessage = `${abilityName} ${damage.toFixed(0)}, hp: ${character.hp.toFixed()}/${character.maxHp.toFixed()}${shieldText}, id: ${someId}`;
    combatlogEntries.push({
        message: logMessage,
        timestamp: getTimeSinceFirstKill(game.state),
    });
    if (combatlogEntries.length > maxLogEntries) {
        combatlogEntries.shift();
    }
}

function createDamageMeterPartForPlayers(ctx: CanvasRenderingContext2D, abilitiesData: AbilityDamageData[], game: Game): MoreInfoPart {
    const playersTotalDamage: { playerId: number, totalDamage: number }[] = [];
    for (let abilityData of abilitiesData) {
        let palyerChar = findPlayerCharacterOwnerByAbilityIdInPlayers(abilityData.abilityRefId, game)?.character;
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
        textLines.push(`${(playerName)}: ${playerTotalDamage.totalDamage.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    }
    return createMoreInfosPart(ctx, textLines);
}

function createDamageMeterPartForAbilities(ctx: CanvasRenderingContext2D, abilitiesData: AbilityDamageData[], filterCharacter: Character): MoreInfoPart {
    const textLines: string[] = [];
    abilitiesData.sort((a, b) => b.totalDamage - a.totalDamage);
    for (let abilityData of abilitiesData) {
        textLines.push(`${(abilityData.petName ?? "")}${(abilityData.abilityName)}: ${abilityData.totalDamage.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    }
    return createMoreInfosPart(ctx, textLines);
}

function createDamageMeterPartForAbility(ctx: CanvasRenderingContext2D, abilityData: AbilityDamageData): MoreInfoPart {
    const textLines: string[] = [];
    const abilityDataName = `${(abilityData.petName ?? "")}${abilityData.abilityName}`
    textLines.push(`${abilityDataName}: ${abilityData.totalDamage.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    abilityData.damageBreakDown.sort((a, b) => b.damage - a.damage);
    for (let breakDown of abilityData.damageBreakDown) {
        textLines.push(`    ${(breakDown.name)}: ${(breakDown.damage / abilityData.totalDamage * 100).toFixed(1)}%`);
    }
    return createMoreInfosPart(ctx, textLines);
}
