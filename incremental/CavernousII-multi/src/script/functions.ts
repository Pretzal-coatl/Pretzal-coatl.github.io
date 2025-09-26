/** ****************************************** Functions ********************************************/

import { game } from "./game";
import { LocationType, locationTypes } from "./location_types";

export function getLocationTypeBySymbol(symbol: LocationType["symbol"]) {
	return locationTypes.find(a => a.symbol == symbol)?.name;
}

export function writeNumber(value: number, decimals = 0) {
	if (value < 10 ** -(decimals + 1)) value = 0;
	if (value > 100) decimals = Math.min(decimals, 1);
	return value.toFixed(decimals);
}

export function writeTime(value: number) {
	if (value == Infinity) return "Infinity";
	let hours: string | number = Math.floor(value / 3600);
	hours = `${hours ? `${hours}:` : ""}`;
	let minutes: string | number = Math.floor((value % 3600) / 60);
	minutes = minutes || hours ? (minutes > 9 ? `${minutes}:` : `0${minutes}:`) : "";
	let seconds: string | number = Math.floor((value % 60) * 10) / 10;
	if (value > 100 * 3600) seconds = Math.floor(seconds);
	seconds = seconds < 10 && minutes ? `0${seconds.toFixed(value > 100 * 3600 ? 0 : 1)}` : seconds.toFixed(value > 100 * 3600 ? 0 : 1);
	return `${hours}${minutes}${seconds}`;
}

let timeBankNode: HTMLElement;

export function redrawTimeNode() {
	timeBankNode = timeBankNode || document.querySelector("#time-banked");
	if (!timeBankNode) return;
	timeBankNode.innerText = writeTime(game.timeBanked / 1000);
}

window.ondrop = e => e.preventDefault();
