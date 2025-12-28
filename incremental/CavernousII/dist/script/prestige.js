"use strict";
const prestigeBox = document.querySelector("#prestige-box") ??
    (() => {
        throw new Error("No config box found");
    })();
/** *************************************Super Prestiges ********************************************/
var GameComplete = 0;
class PrestigePoints {
    constructor(value) {
        this.value = value;
    }
}
var prestigepoints = 0;
var prestigecount = 0;
class Prestige {
    constructor(name, level, nextcost = 0, total = 0) {
        this.name = name;
        this.level = level;
        this.nextcost = nextcost;
        this.total = total;
    }
}
var prestige = [
    new Prestige("BonusClones", 0),
    new Prestige("FasterStats", 0),
    new Prestige("ManaScaling", 0),
    new Prestige("BonusResc", 0),
    new Prestige("BetterEquip", 0),
    new Prestige("SoftCap", 0),
    new Prestige("BonusZones", 0)
];
function canPrestige() {
    return GameComplete == 1 || prestigecount == 0;
}
function prestigeGame() {
    /* Dangerous, should fix */
    if (canPrestige()) {
        exportGame();
        GameComplete = 0;
        prestigepoints += 90;
        prestigecount += 1;
        prestige[0].level += 1;
        prestige[1].level += 1;
        prestige[2].level += 1;
        prestige[3].level += 1;
        prestige[4].level += 1;
        prestige[5].level += 1;
        prestige[6].level += 1;
        resetprogress();
        loadPrestigeBonuses();
    }
}
function getPrestigeBonuses(level) {
    return [
        writeNumber(level),
        writeNumber(10 * level),
        writeNumber(100 * 0.95 ** (level ** 0.75), 2),
        writeNumber(10 * level),
        writeNumber(10 * level),
        writeNumber(1 + level),
        writeNumber(20 * level),
    ];
}
function loadPrestigeBonuses() {
    document.querySelector("#prestigecount").innerHTML = writeNumber(prestigecount);
    document.querySelector("#prestigeval0").innerHTML = writeNumber(prestige[0].level);
    document.querySelector("#prestigeval1").innerHTML = writeNumber(10 * prestige[1].level);
    document.querySelector("#prestigeval2").innerHTML = writeNumber(0.95 ** (prestige[2].level ** 0.75) * 100);
    document.querySelector("#prestigeval3").innerHTML = writeNumber(10 * prestige[3].level);
    document.querySelector("#prestigeval4").innerHTML = writeNumber(10 * prestige[4].level);
    document.querySelector("#prestigeval5a").innerHTML = writeNumber(1 + prestige[5].level);
    document.querySelector("#prestigeval5b").innerHTML = writeNumber(20 * prestige[5].level);
}
function resetprogress() {
    /*sets clones to 0*/
    clones = [];
    /*Resets Zones, maybe change so map doesn't reset?*/
    zones.forEach(z => {
        z.queues = ActionQueue.fromJSON([]);
        z.mapLocations = [];
        while (z.mapLocations.length < z.map.length) {
            z.mapLocations.push([]);
        }
        z.routes = [];
        if (z.node != null) {
            z.node.parentNode.removeChild(z.node);
        }
        z.node = null;
        z.goalComplete = false;
    });
    /*sets stats to 0*/
    stats.forEach(s => {
        s.base = 0;
    });
    stats[12].base = 10;
    /*reset realms*/
    realms.forEach(re => {
        re.locked = true;
        re.completed = false;
        re.machineCompletions = 0;
    });
    realms[0].unlock();
    /*resets runes*/
    runes.forEach(r => {
        r.unlocked = false;
        r.node = null;
        r.upgradeCount = 0;
    });
    /*clear route*/
    routes = [];
    grindRoutes = [];
    /*sets mana to base*/
    getStat("Mana").base = 5;
    /*resets camera*/
    currentZone = 0;
    currentRealm = 0;
    /*Initialize*/
    Clone.addNewClone();
    for (let i = 0; i < prestige[0].level; ++i) {
        Clone.addNewClone();
    }
    /*Remove Message*/
    messages.forEach(m => {
        m.displayed = true;
    });
    resetLoop();
    save();
    window.location.reload();
}
function viewPrestige() {
    const prestigeAvailable = canPrestige();
    document.querySelector("#prestige-title").innerHTML = `Prestige ${prestigeAvailable ? '(Available!)' : '(Not yet available)'}`;
    const text = prestigeBox.querySelector("#prestige-text");
    const currentBonuses = getPrestigeBonuses(prestigecount);
    const prestigeBonuses = getPrestigeBonuses(prestigecount + 1);
    text.innerHTML = `Bonus Clones: +${currentBonuses[0]} → +${prestigeBonuses[0]}<br/>
	Stat Gains: +${currentBonuses[1]}% → +${prestigeBonuses[1]}%<br/>
	Mana Mining: +${currentBonuses[2]}% → +${prestigeBonuses[2]}%<br/>
	Bonus Resources: +${currentBonuses[3]}% → +${prestigeBonuses[3]}%<br/>
	Equipment Bonuses: +${currentBonuses[4]}% → +${prestigeBonuses[4]}%<br/>
	Stat Soft Cap: ${currentBonuses[5]}x + ${currentBonuses[6]} → ${prestigeBonuses[5]}x + ${prestigeBonuses[6]}`;
    prestigeBox.querySelector("#prestige-button").hidden = !prestigeAvailable;
    prestigeBox.hidden = false;
}
function hidePrestige() {
    prestigeBox.hidden = true;
}
/** ****************************************** Prestiges ********************************************/
let resetting = false;
function resetLoop(noLoad = false, saveGame = true) {
    if (resetting)
        return;
    shouldReset = false;
    resetting = true;
    const mana = getStat("Mana"); /* Cleaned up my additions as is handled during initilization */
    if (getMessage("Time Travel").display(zones[0].manaGain == 0 && realms[currentRealm].name == "Core Realm" && prestigecount == 0))
        setSetting(toggleAutoRestart, 3);
    else
        getMessage("Persisted Programming").display();
    if (mana.base == 5.5)
        getMessage("The Looping of Looping Loops").display() && setSetting(toggleAutoRestart, 1);
    if (mana.base == 6)
        getMessage("Strip Mining").display();
    if (mana.base == 7.4)
        getMessage("Buy More Time").display();
    if (routes.length == 3)
        getMessage("All the known ways").display() && setSetting(toggleGrindMana, true);
    if (queueTime > 50000)
        getMessage("Looper's Log: Supplemental").display();
    if (mana.current > 0) {
        currentLoopLog.finalize();
    }
    stuff.forEach(s => {
        s.count = 0;
    });
    stats.forEach((s, i) => {
        s.reset();
        s.update();
    });
    if (settings.grindMana && routes.length && !noLoad) {
        Route.loadBestRoute();
    }
    if (settings.grindStats && grindRoutes.length) {
        GrindRoute.loadBestRoute();
    }
    stuff.forEach(s => {
        s.count = 0;
        s.update();
    });
    clones.forEach(c => c.reset());
    queueTime = 0;
    totalDrain = 0;
    loopCompletions = 0;
    creatures.forEach(c => {
        c.attack = c.creature.attack;
        c.defense = c.creature.defense;
        c.health = c.creature.health;
        c.drawHealth();
    });
    zones.forEach(z => {
        z.resetZone();
        (z.queues || []).forEach(q => q.reset());
    });
    updateRunes();
    moveToZone(0, false);
    getStat("Mana").dirty = true;
    getStat("Mana").update();
    drawMap();
    if (saveGame)
        save();
    showFinalLocation();
    if (isNaN(timeBanked)) {
        timeBanked = 0;
    }
    resetting = false;
    currentRoutes = [];
}
//# sourceMappingURL=prestige.js.map