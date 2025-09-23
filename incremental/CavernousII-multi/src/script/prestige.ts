import { Clone } from "./clones";
import { game } from "./game";
import { resetLoop } from "./loop";
import { messages } from "./messages";
import { ActionQueue } from "./queues";
import { realms } from "./realms";
import { runes } from "./runes";
import { exportGame, save } from "./save";
import { getStat, stats } from "./stats";
import { zones } from "./zones";

// class PrestigePoints {
// 	value: number;
// 	constructor(value: number) {
// 		this.value = value;
// 	}
// }

// class Prestige {
// 	name: string;
// 	level: number;
// 	nextcost: number;
// 	total: number;
// 	constructor(name: string, level: number, nextcost: number = 0, total: number = 0) {
// 		this.name = name;
// 		this.level = level;
// 		this.nextcost = nextcost;
// 		this.total = total;
// 	}
// }

/*
class Prestige {
  constructor() {
    this.GameComplete = 0;
    this.Points = 0;
    this.BonusClones = 0;
    this.FasterStats = 0;
    this.ManaScaling = 0;
    this.BonusResc = 0;
    this.BetterEquip = 0;
    this.SoftCap = 0;
    this.BonusZones = 0;
  }
}
*/

// export var prestige = [
// 	new Prestige("BonusClones", 0),
// 	new Prestige("FasterStats", 0),
// 	new Prestige("ManaScaling", 0),
// 	new Prestige("BonusResc", 0),
// 	new Prestige("BetterEquip", 0),
// 	new Prestige("SoftCap", 0),
// 	new Prestige("BonusZones", 0)
// ];

export var prestige = {
	level: 0,
	prestigepoints: 0,
	prestigecount: 0,
	GameComplete: 0,
};

export function prestigeGame() {
	/* Dangerous, should fix */
	if (prestige.GameComplete == 1 || prestige.prestigecount == 0) {
		exportGame();
		prestige.GameComplete = 0;
		prestige.prestigepoints += 90;
		prestige.prestigecount += 1;
		prestige.level += 1;
		resetprogress();
	}
}

function resetprogress() {
	/*sets game.clones to 0*/
	game.clones = [];
	/*Resets Zones, maybe change so map doesn't reset?*/
	zones.forEach(z => {
		z.queues = ActionQueue.fromJSON([]);
		z.mapLocations = [];
		while (z.mapLocations.length < z.map.length) {
			z.mapLocations.push([]);
		}
		z.routes = [];
		if (z.node != null) {
			z.node.parentNode!.removeChild(z.node);
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
	game.routes = [];
	game.grindRoutes = [];
	/*sets mana to base*/
	getStat("Mana").base = 5;
	/*resets camera*/
	game.currentZone = 0;
	game.currentRealm = 0;
	/*Initialize*/
	Clone.addNewClone();
	for (let i = 0; i < prestige.level; ++i) {
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

// Fix Prestige Values for Hover - need help
/*
    let prestigenumber= document.querySelector("prestigenumber") = writeNumber(prestigecount);
    document.querySelector("prestigeval0") = writeNumber(prestige.level);
    document.querySelector("prestigeval1") = writeNumber(0.1*prestige.level);
    document.querySelector("prestigeval2") = writeNumber(0.95 ** (prestige.level ** 0.75));
    document.querySelector("prestigeval3") = writeNumber(0.1*prestige.level);
    document.querySelector("prestigeval4") = writeNumber(0.1*prestige.level);
    document.querySelector("prestigeval5a") = writeNumber(1+prestige.level);
    document.querySelector("prestigeval5b") = writeNumber(20*prestige.level);
    document.querySelector("prestigeval6") = writeNumber(prestige.level);
*/
