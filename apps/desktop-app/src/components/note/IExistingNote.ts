export interface IExistingNote extends INote {
	id: string;
}

export interface INote {
	caption: string;
	text: string;
	begin?: Date;
	end?: Date;
}
