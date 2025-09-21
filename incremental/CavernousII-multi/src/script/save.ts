import { version } from "os";
import { clones, Clone } from "./clones";
import { GrindRoute, grindRoutes } from "./grind_routes";
import { messages, getMessage } from "./messages";
import { GameComplete, prestige, prestigecount, prestigepoints } from "./prestige";
import { ActionQueue, redrawQueues } from "./queues";
import { realms, currentRealm, getRealmComplete, changeRealms } from "./realms";
import { Route, routes } from "./routes";
import { runes, type anyRuneName } from "./runes";
import { settings, loadSettings } from "./settings";
import { getStat, type anyStatName, stats } from "./stats";
import { ZoneRoute } from "./zone_routes";
import { zones, recalculateMana } from "./zones";
import { drawMap } from "./map";

const URLParams = new URL(document.location.href).searchParams;
export let saveName = URLParams.get("save") || "";
saveName = `saveGameII${saveName && "_"}${saveName}`;
const savingDisabled = URLParams.get("saving") == "disabled";

interface saveGame {
	version: number;
	playerStats: {
		name: anyStatName;
		base: number;
	}[];
	zoneData: {
		name: string;
		locations: any[];
		queues: string[][];
		routes: ZoneRoute[];
		goal: boolean;
		challenge?: boolean; //prior to 2.0.6
	}[];
	currentRealm: number;
	cloneData: {
		count: number;
	};
	time: {
		saveTime: number;
		timeBanked: number;
	};
	messageData: [typeof messages[number]["name"], boolean][];
	settings: settings;
	routes: Exclude<Route, ["log", "usedRoutes"]>[];
	savedRoutes?: string;
	grindRoutes: GrindRoute[];
	runeData: {
		name: anyRuneName;
		upgradeCount: number;
	}[];
	machines: number[];
	realmData: {
		maxMult: number;
		completed: boolean;
	}[];
	prestigeData: any;
	prestigeArray: any;
}

export let save = async function save() {
	if (savingDisabled) return;
	const playerStats = stats.map(s => {
		return {
			name: s.name,
			base: s.base
		};
	});
	const zoneData = zones.map(zone => {
		const zoneLocations = [];
		for (let y = 0; y < zone.mapLocations.length; y++) {
			for (let x = 0; x < zone.mapLocations[y].length; x++) {
				if (zone.mapLocations[y][x]) {
					const loc = zone.mapLocations[y][x];
					zoneLocations.push([x - zone.xOffset, y - zone.yOffset, loc.priorCompletionData]);
				}
			}
		}
		return {
			name: zone.name,
			locations: zoneLocations,
			queues: zone.queues ? zone.queues.map(queue => queue.map(q => q.actionID)) : [[]],
			routes: zone.routes,
			goal: zone.goalComplete
		};
	});
	const cloneData = {
		count: clones.length
	};
	const time = {
		saveTime: Date.now(),
		timeBanked
	};
	const messageData = messages.map(m => [m.name, m.displayed] as [typeof m["name"], boolean]);
	const savedRoutes = JSON.parse(
		JSON.stringify(routes, (key, value) => {
			if (key == "log") {
				return undefined;
			}
			if (key == "usedRoutes") {
				return value ? value.map((r: any) => r.id) : undefined;
			}
			return value;
		})
	);
	const runeData = runes.map(r => {
		return {
			name: r.name,
			upgradeCount: r.upgradeCount
		};
	});
	const machines = realms.map(r => r.machineCompletions);
	const realmData = realms.map(r => {
		return {
			maxMult: r.maxMult,
			completed: r.completed
		};
	});
	/* prestige data */
	const prestigeData = {
		name1: "prestigepoints",
		value1: prestigepoints,
		name2: "prestigecount",
		value2: prestigecount,
		name3: "GameComplete",
		value3: GameComplete
	};
	const prestigeArray = {
		value0: prestige[0].level,
		value1: prestige[1].level,
		value2: prestige[2].level,
		value3: prestige[3].level,
		value4: prestige[4].level,
		value5: prestige[5].level,
		value6: prestige[6].level
	};

	let saveGame: saveGame = {
		version: version,
		playerStats: playerStats,
		zoneData: zoneData,
		currentRealm: currentRealm,
		cloneData: cloneData,
		time: time,
		messageData: messageData,
		settings: settings,
		routes: savedRoutes,
		grindRoutes: grindRoutes,
		runeData: runeData,
		machines: machines,
		realmData: realmData,
		prestigeData: prestigeData,
		prestigeArray: prestigeArray
	};
	let saveString = JSON.stringify(saveGame);
	// Typescript can't find LZString, and I don't care.
	// @ts-ignore
	localStorage[saveName] = LZString.compressToBase64(saveString);
};

export function load() {
	if (!localStorage[saveName]) return setup();
	if (savingDisabled) return setup();
	let saveGame: saveGame;
	try {
		// Typescript can't find LZString, and I don't care.
		// @ts-ignore
		saveGame = JSON.parse(LZString.decompressFromBase64(localStorage[saveName])!);
	} catch {
		// Prior to 2.2.6
		saveGame = JSON.parse(atob(localStorage[saveName]));
	}
	if (!saveGame.routes) saveGame.routes = JSON.parse(saveGame.savedRoutes as string);
	previousVersion = saveGame.version || 2;
	// if (version < previousVersion) {
	// 	alert(`Error: Version number reduced!\n${previousVersion} -> ${version}`);
	// }

	stats.forEach(s => (s.current = 0));
	for (let i = 0; i < saveGame.playerStats.length; i++) {
		const stat = getStat(saveGame.playerStats[i].name);
		if (stat) stat.base = saveGame.playerStats[i].base;
	}
	for (let i = 0; i < saveGame.messageData.length; i++) {
		const message = getMessage(saveGame.messageData[i][0]);
		if (message) {
			message.displayed = saveGame.messageData[i][1];
		}
	}
	clones = [];
	while (clones.length < saveGame.cloneData.count) {
		Clone.addNewClone(true);
	}
	for (let i = 0; i < saveGame.zoneData.length; i++) {
		const zone = zones.find(z => z.name == saveGame.zoneData[i].name);
		if (zone === undefined) throw new Error(`No zone "${saveGame.zoneData[i].name}" exists`);

		for (let j = 0; j < saveGame.zoneData[i].locations.length; j++) {
			const mapLocation = zone.getMapLocation(saveGame.zoneData[i].locations[j][0], saveGame.zoneData[i].locations[j][1], true);
			if (mapLocation === null) {
				console.warn(new Error("Tried loading non-existent map location"));
				continue;
			}
			mapLocation.priorCompletionData = saveGame.zoneData[i].locations[j][2];
			while (mapLocation.priorCompletionData.length < realms.length) mapLocation.priorCompletionData.push(0);
		}
		zone.queues = ActionQueue.fromJSON(saveGame.zoneData[i].queues);
		zone.routes = ZoneRoute.fromJSON(saveGame.zoneData[i].routes);
		// Challenge for < 2.0.6
		if (saveGame.zoneData[i].goal || (saveGame.zoneData[i].challenge as boolean)) zone.completeGoal();
	}
	for (let i = 0; i < realms.length; i++) {
		currentRealm = i;
		realms[i].machineCompletions = (saveGame.machines || [])[i] || 0;
		recalculateMana();
	}
	saveGame.realmData?.forEach((r, i) => {
		if (r.maxMult) realms[i].maxMult = r.maxMult;
		if (r.completed) realms[i].complete();
	});
	lastAction = saveGame.time.saveTime;
	timeBanked = +saveGame.time.timeBanked + Date.now() - lastAction;
	if (saveGame.routes) {
		routes = Route.fromJSON(saveGame.routes);
	}
	if (saveGame.grindRoutes) {
		grindRoutes = GrindRoute.fromJSON(saveGame.grindRoutes);
	}
	for (let i = 0; i < (saveGame.runeData || []).length; i++) {
		runes[i].upgradeCount = saveGame.runeData[i].upgradeCount || 0;
	}

	for (let i = 0; i < realms.length; i++) {
		getRealmComplete(realms[i]);
	}

	/* load prestige stuff - needs to be beautified*/
	if (saveGame.prestigeData === null) {
		prestigepoints = 0;
		prestigecount = 0;
		GameComplete = 0;
	} else {
		prestigepoints = saveGame.prestigeData.value1;
		prestigecount = saveGame.prestigeData.value2;
		GameComplete = saveGame.prestigeData.value3;
	}
	if (saveGame.prestigeArray === null) {
		prestige[0].level = 0;
		prestige[1].level = 0;
		prestige[2].level = 0;
		prestige[3].level = 0;
		prestige[4].level = 0;
		prestige[5].level = 0;
		prestige[6].level = 0;
	} else {
		prestige[0].level = saveGame.prestigeArray.value0;
		prestige[1].level = saveGame.prestigeArray.value1;
		prestige[2].level = saveGame.prestigeArray.value2;
		prestige[3].level = saveGame.prestigeArray.value3;
		prestige[4].level = saveGame.prestigeArray.value4;
		prestige[5].level = saveGame.prestigeArray.value5;
		prestige[6].level = saveGame.prestigeArray.value6;
	}

	loadSettings(saveGame.settings);

	zones[0].queues[0].selected = true;
	queuesNode = queuesNode || document.querySelector("#queues");
	redrawQueues();

	// Fix attack and defense
	getStat("Attack").base = 0;
	getStat("Defense").base = 0;
	stats.map(s => s.update());

	changeRealms(saveGame.currentRealm);

	drawMap();

	applyCustomStyling();
}

export function deleteSave() {
	if (localStorage[saveName]) localStorage[saveName + "Backup"] = localStorage[saveName];
	localStorage.removeItem(saveName);
	window.location.reload();
}

export function exportGame() {
	navigator.clipboard.writeText(localStorage[saveName]);
}

export function importGame() {
	const saveString = prompt("Input your save");
	if (!saveString) return;
	save();
	// Disable saving until the next reload.
	save = async () => {};
	const temp = localStorage[saveName];
	localStorage[saveName] = saveString;
	try {
		const queueNode = document.querySelector("#queues") as HTMLElement;
		queueNode.innerHTML = "";
		load();
	} catch (e) {
		console.log(e);
		localStorage[saveName] = temp;
		load();
	}
	window.location.reload();
}

export function displaySaveClick(event: MouseEvent) {
	let el = (<HTMLElement>event.target).closest(".clickable");
	if (!el) return;
	el.classList.add("ripple");
	setTimeout(() => el!.classList.remove("ripple"), 1000);
}
