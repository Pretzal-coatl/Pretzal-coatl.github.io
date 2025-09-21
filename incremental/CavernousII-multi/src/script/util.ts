export type PropertiesOf<Type> = {
	[Property in keyof Type as Type[Property] extends Function ? never : Property]: Type[Property];
};

export type DOMEvent = Event & {
	target: HTMLElement;
};

export enum CanStartReturnCode {
	Never = 0,
	NotNow = 1,
	Now = 2
}

export enum ActionStatus {
	NotStarted = 0,
	Started = 1,
	Waiting = 2,
	Complete = 3
}
