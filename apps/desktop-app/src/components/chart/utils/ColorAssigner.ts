import { euiPaletteColorBlind } from "@elastic/eui";
import { colorPalette } from "@elastic/eui";

export class ColorAssigner {
	private colors;
	private titleToColorIndex: Map<string, number>;
	private nextColorIndex;

	constructor() {
		this.colors = euiPaletteColorBlind({ rotations: 2 });
		this.titleToColorIndex = new Map<string, number>();
		this.nextColorIndex = 0;
	}

	getLightColor(title: string) {
		const baseColor = this.getColor(title);
		// Create a color palette from light gray to target color
		// The 2nd element should be a light version of the original color
		// The 1st element would be a
		return colorPalette([baseColor], 10)[1];
	}

	getColor(title: string) {
		let index = this.titleToColorIndex.get(title);
		if (index !== undefined) {
			return this.colors[index % this.colors.length];
		} else {
			index = this.nextColorIndex;
		}

		this.titleToColorIndex.set(title, index);
		this.nextColorIndex++;

		return this.colors[index % this.colors.length];
	}
}
