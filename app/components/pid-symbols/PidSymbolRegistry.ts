import type { ComponentType } from "react";

import type { PidSymbolKind } from "../PidSymbol.tsx";
import { AutoclaveSymbol, ConnectableAutoclaveSymbol } from "./AutoclaveSymbol.tsx";
import { AxialFanSymbol, ConnectableAxialFanSymbol } from "./AxialFanSymbol.tsx";
import {
	BackdraftDamperSymbol,
	ConnectableBackdraftDamperSymbol,
} from "./BackdraftDamperSymbol.tsx";
import { BagSymbol, ConnectableBagSymbol } from "./BagSymbol.tsx";
import { BallValveSymbol, ConnectableBallValveSymbol } from "./BallValveSymbol.tsx";
import { ButterflyValveSymbol, ConnectableButterflyValveSymbol } from "./ButterflyValveSymbol.tsx";
import { CheckValveSymbol, ConnectableCheckValveSymbol } from "./CheckValveSymbol.tsx";
import type { ConnectablePidSymbolProps } from "./ConnectablePidSymbol.tsx";
import { ConnectableControlValveSymbol, ControlValveSymbol } from "./ControlValveSymbol.tsx";
import { ConnectableCoolerSymbol, CoolerSymbol } from "./CoolerSymbol.tsx";
import { ConnectableCoolingTowerSymbol, CoolingTowerSymbol } from "./CoolingTowerSymbol.tsx";
import { ConnectableCoveredGasVentSymbol, CoveredGasVentSymbol } from "./CoveredGasVentSymbol.tsx";
import { ConnectableCurvedGasVentSymbol, CurvedGasVentSymbol } from "./CurvedGasVentSymbol.tsx";
import { ConnectableDiaphragmValveSymbol, DiaphragmValveSymbol } from "./DiaphragmValveSymbol.tsx";
import {
	ConnectableDoublePipeHeatExchangerSymbol,
	DoublePipeHeatExchangerSymbol,
} from "./DoublePipeHeatExchangerSymbol.tsx";
import { ConnectableDryerSymbol, DryerSymbol } from "./DryerSymbol.tsx";
import { ConnectableDustTrapSymbol, DustTrapSymbol } from "./DustTrapSymbol.tsx";
import { ConnectableFanSymbol, FanSymbol } from "./FanSymbol.tsx";
import {
	ConnectableFluidContactingColumnSymbol,
	FluidContactingColumnSymbol,
} from "./FluidContactingColumnSymbol.tsx";
import { ConnectableFunnelSymbol, FunnelSymbol } from "./FunnelSymbol.tsx";
import { ConnectableFurnaceSymbol, FurnaceSymbol } from "./FurnaceSymbol.tsx";
import { ConnectableGasBottleSymbol, GasBottleSymbol } from "./GasBottleSymbol.tsx";
import { ConnectableGateValveSymbol, GateValveSymbol } from "./GateValveSymbol.tsx";
import {
	ConnectableHalfPipeReactorSymbol,
	HalfPipeReactorSymbol,
} from "./HalfPipeReactorSymbol.tsx";
import { ConnectableHeatExchangerSymbol, HeatExchangerSymbol } from "./HeatExchangerSymbol.tsx";
import { ConnectableHydraulicPumpSymbol, HydraulicPumpSymbol } from "./HydraulicPumpSymbol.tsx";
import { ConnectableManualValveSymbol, ManualValveSymbol } from "./ManualValveSymbol.tsx";
import { ConnectableNeedleValveSymbol, NeedleValveSymbol } from "./NeedleValveSymbol.tsx";
import {
	ConnectablePlainHeatExchangerSymbol,
	PlainHeatExchangerSymbol,
} from "./PlainHeatExchangerSymbol.tsx";
import {
	ConnectablePlateHeatExchangerSymbol,
	PlateHeatExchangerSymbol,
} from "./PlateHeatExchangerSymbol.tsx";
import {
	ConnectablePressureReducingValveSymbol,
	PressureReducingValveSymbol,
} from "./PressureReducingValveSymbol.tsx";
import {
	ConnectablePressurizedVesselHorizontalSymbol,
	PressurizedVesselHorizontalSymbol,
} from "./PressurizedVesselHorizontalSymbol.tsx";
import {
	ConnectablePressurizedVesselVerticalSymbol,
	PressurizedVesselVerticalSymbol,
} from "./PressurizedVesselVerticalSymbol.tsx";
import { ConnectablePumpSymbol, PumpSymbol } from "./PumpSymbol.tsx";
import { ConnectableRadialFanSymbol, RadialFanSymbol } from "./RadialFanSymbol.tsx";
import {
	ConnectableSpiralHeatExchangerSymbol,
	SpiralHeatExchangerSymbol,
} from "./SpiralHeatExchangerSymbol.tsx";
import { ConnectableSteamTrapSymbol, SteamTrapSymbol } from "./SteamTrapSymbol.tsx";
import {
	ConnectableStraightTubeHeatExchangerSymbol,
	StraightTubeHeatExchangerSymbol,
} from "./StraightTubeHeatExchangerSymbol.tsx";
import type { PidSymbolProps } from "./SymbolSvg.tsx";
import { ConnectableThreeWayValveSymbol, ThreeWayValveSymbol } from "./ThreeWayValveSymbol.tsx";
import { ConnectableTrayColumnSymbol, TrayColumnSymbol } from "./TrayColumnSymbol.tsx";
import {
	ConnectableUTubeHeatExchangerSymbol,
	UTubeHeatExchangerSymbol,
} from "./UTubeHeatExchangerSymbol.tsx";
import {
	ConnectableVacuumPumpOrCompressorSymbol,
	VacuumPumpOrCompressorSymbol,
} from "./VacuumPumpOrCompressorSymbol.tsx";
import { ConnectableValveSymbol, ValveSymbol } from "./ValveSymbol.tsx";
import { ConnectableViewingGlassSymbol, ViewingGlassSymbol } from "./ViewingGlassSymbol.tsx";

interface PidSymbolComponents {
	Symbol: ComponentType<PidSymbolProps>;
	ConnectableSymbol: ComponentType<ConnectablePidSymbolProps>;
}

const pidSymbolComponents = {
	"gas-bottle": pair(GasBottleSymbol, ConnectableGasBottleSymbol),
	autoclave: pair(AutoclaveSymbol, ConnectableAutoclaveSymbol),
	"half-pipe-reactor": pair(HalfPipeReactorSymbol, ConnectableHalfPipeReactorSymbol),
	"horizontal-vessel": pair(
		PressurizedVesselHorizontalSymbol,
		ConnectablePressurizedVesselHorizontalSymbol,
	),
	"vertical-vessel": pair(
		PressurizedVesselVerticalSymbol,
		ConnectablePressurizedVesselVerticalSymbol,
	),
	"fluid-contacting-column": pair(
		FluidContactingColumnSymbol,
		ConnectableFluidContactingColumnSymbol,
	),
	"tray-column": pair(TrayColumnSymbol, ConnectableTrayColumnSymbol),
	dryer: pair(DryerSymbol, ConnectableDryerSymbol),
	"dust-trap": pair(DustTrapSymbol, ConnectableDustTrapSymbol),
	bag: pair(BagSymbol, ConnectableBagSymbol),
	funnel: pair(FunnelSymbol, ConnectableFunnelSymbol),
	valve: pair(ValveSymbol, ConnectableValveSymbol),
	"three-way-valve": pair(ThreeWayValveSymbol, ConnectableThreeWayValveSymbol),
	"check-valve": pair(CheckValveSymbol, ConnectableCheckValveSymbol),
	"ball-valve": pair(BallValveSymbol, ConnectableBallValveSymbol),
	"butterfly-valve": pair(ButterflyValveSymbol, ConnectableButterflyValveSymbol),
	"control-valve": pair(ControlValveSymbol, ConnectableControlValveSymbol),
	"diaphragm-valve": pair(DiaphragmValveSymbol, ConnectableDiaphragmValveSymbol),
	"manual-valve": pair(ManualValveSymbol, ConnectableManualValveSymbol),
	"needle-valve": pair(NeedleValveSymbol, ConnectableNeedleValveSymbol),
	"gate-valve": pair(GateValveSymbol, ConnectableGateValveSymbol),
	"pressure-reducing-valve": pair(
		PressureReducingValveSymbol,
		ConnectablePressureReducingValveSymbol,
	),
	"backdraft-damper": pair(BackdraftDamperSymbol, ConnectableBackdraftDamperSymbol),
	furnace: pair(FurnaceSymbol, ConnectableFurnaceSymbol),
	cooler: pair(CoolerSymbol, ConnectableCoolerSymbol),
	"cooling-tower": pair(CoolingTowerSymbol, ConnectableCoolingTowerSymbol),
	"heat-exchanger": pair(HeatExchangerSymbol, ConnectableHeatExchangerSymbol),
	"plain-heat-exchanger": pair(PlainHeatExchangerSymbol, ConnectablePlainHeatExchangerSymbol),
	"double-pipe-heat-exchanger": pair(
		DoublePipeHeatExchangerSymbol,
		ConnectableDoublePipeHeatExchangerSymbol,
	),
	"straight-tube-heat-exchanger": pair(
		StraightTubeHeatExchangerSymbol,
		ConnectableStraightTubeHeatExchangerSymbol,
	),
	"u-tube-heat-exchanger": pair(UTubeHeatExchangerSymbol, ConnectableUTubeHeatExchangerSymbol),
	"plate-heat-exchanger": pair(PlateHeatExchangerSymbol, ConnectablePlateHeatExchangerSymbol),
	"spiral-heat-exchanger": pair(SpiralHeatExchangerSymbol, ConnectableSpiralHeatExchangerSymbol),
	pump: pair(PumpSymbol, ConnectablePumpSymbol),
	"hydraulic-pump": pair(HydraulicPumpSymbol, ConnectableHydraulicPumpSymbol),
	"vacuum-pump-or-compressor": pair(
		VacuumPumpOrCompressorSymbol,
		ConnectableVacuumPumpOrCompressorSymbol,
	),
	fan: pair(FanSymbol, ConnectableFanSymbol),
	"axial-fan": pair(AxialFanSymbol, ConnectableAxialFanSymbol),
	"radial-fan": pair(RadialFanSymbol, ConnectableRadialFanSymbol),
	"steam-trap": pair(SteamTrapSymbol, ConnectableSteamTrapSymbol),
	"viewing-glass": pair(ViewingGlassSymbol, ConnectableViewingGlassSymbol),
	"covered-gas-vent": pair(CoveredGasVentSymbol, ConnectableCoveredGasVentSymbol),
	"curved-gas-vent": pair(CurvedGasVentSymbol, ConnectableCurvedGasVentSymbol),
} satisfies Record<PidSymbolKind, PidSymbolComponents>;

function pair(
	Symbol: ComponentType<PidSymbolProps>,
	ConnectableSymbol: ComponentType<ConnectablePidSymbolProps>,
): PidSymbolComponents {
	return { Symbol, ConnectableSymbol };
}

/**
 * Returns the drawing and editor component for a P&ID symbol.
 */
export function getPidSymbolComponents(kind: PidSymbolKind): PidSymbolComponents {
	return pidSymbolComponents[kind];
}
