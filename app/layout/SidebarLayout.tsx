import * as Headless from "@headlessui/react";
import { ChevronLeftIcon, ChevronRightIcon, RectangleGroupIcon } from "@heroicons/react/20/solid";
import {
	useRef,
	useState,
	type CSSProperties,
	type KeyboardEvent,
	type PointerEvent,
	type PropsWithChildren,
	type ReactNode,
} from "react";

import type { RightSidebar } from "~/app/layout/routeSidebar.ts";
import {
	clampSidebarWidth,
	MAX_SIDEBAR_WIDTH,
	MIN_SIDEBAR_WIDTH,
	SIDEBAR_COLLAPSED_COOKIE,
	SIDEBAR_WIDTH_COOKIE,
} from "~/app/lib/sidebarWidth.ts";
import { NavbarItem } from "~/catalyst-ui/navbar.tsx";

const KEYBOARD_RESIZE_STEP = 16;
const RESIZE_KEYS = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const COLLAPSED_SIDEBAR_WIDTH = 72;
const COLLAPSED_RIGHT_SIDEBAR_WIDTH = 48;
const DEFAULT_RIGHT_SIDEBAR_WIDTH = 320;
const MIN_RIGHT_SIDEBAR_WIDTH = 240;
const MAX_RIGHT_SIDEBAR_WIDTH = 480;

function OpenMenuIcon() {
	return (
		<svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true">
			<path d="M2 6.75C2 6.33579 2.33579 6 2.75 6H17.25C17.6642 6 18 6.33579 18 6.75C18 7.16421 17.6642 7.5 17.25 7.5H2.75C2.33579 7.5 2 7.16421 2 6.75ZM2 13.25C2 12.8358 2.33579 12.5 2.75 12.5H17.25C17.6642 12.5 18 12.8358 18 13.25C18 13.6642 17.6642 14 17.25 14H2.75C2.33579 14 2 13.6642 2 13.25Z" />
		</svg>
	);
}

function CloseMenuIcon() {
	return (
		<svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true">
			<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 0 0 1.06-1.06L11.06 10l3.72 3.72a.75.75 0 0 0 1.06-1.06L10 8.94 6.28 5.22Z" />
		</svg>
	);
}

function MobileSidebar({
	open,
	close,
	children,
}: PropsWithChildren<{ open: boolean; close: () => void }>) {
	return (
		<Headless.Dialog open={open} onClose={close} className="lg:hidden">
			<Headless.DialogBackdrop
				transition
				className="fixed inset-0 z-30 bg-scrim transition data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
			/>
			<Headless.DialogPanel
				transition
				className="fixed inset-y-0 left-0 z-40 w-full max-w-80 p-2 transition duration-300 ease-out data-closed:-translate-x-full"
			>
				<div className="flex h-full flex-col rounded-lg bg-surface shadow-xs ring-1 ring-border">
					<div className="-mb-3 px-4 pt-3">
						<Headless.CloseButton as={NavbarItem} aria-label="Close navigation">
							<CloseMenuIcon />
						</Headless.CloseButton>
					</div>
					{children}
				</div>
			</Headless.DialogPanel>
		</Headless.Dialog>
	);
}

function MobileRightSidebar({
	open,
	close,
	title,
	children,
}: PropsWithChildren<{ open: boolean; close: () => void; title: string }>) {
	return (
		<Headless.Dialog open={open} onClose={close} className="lg:hidden">
			<Headless.DialogBackdrop
				transition
				className="fixed inset-0 z-30 bg-scrim transition data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
			/>
			<Headless.DialogPanel
				transition
				className="fixed inset-y-0 right-0 z-40 w-full max-w-80 p-2 transition duration-300 ease-out data-closed:translate-x-full"
			>
				<div className="flex h-full flex-col rounded-lg bg-surface shadow-xs ring-1 ring-border">
					<div className="flex items-center justify-between border-b border-border px-4 py-3">
						<Headless.DialogTitle className="text-sm font-semibold text-foreground">
							{title}
						</Headless.DialogTitle>
						<Headless.CloseButton as={NavbarItem} aria-label={`Close ${title}`}>
							<CloseMenuIcon />
						</Headless.CloseButton>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
				</div>
			</Headless.DialogPanel>
		</Headless.Dialog>
	);
}

type ResizeStart = {
	pointerId: number;
	pointerX: number;
	width: number;
};

type RightSidebarState = {
	id: string | undefined;
	open: boolean;
	width: number;
};

export function SidebarLayout({
	navbar,
	sidebar,
	sidebarWidth: initialSidebarWidth,
	sidebarCollapsed: initialSidebarCollapsed,
	rightSidebar,
	children,
}: PropsWithChildren<{
	navbar: ReactNode;
	sidebar: (collapsed: boolean) => ReactNode;
	sidebarWidth: number;
	sidebarCollapsed: boolean;
	rightSidebar?: RightSidebar;
}>) {
	const [showSidebar, setShowSidebar] = useState(false);
	const [showMobileRightSidebar, setShowMobileRightSidebar] = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(initialSidebarCollapsed);
	const [sidebarWidth, setSidebarWidth] = useState(initialSidebarWidth);
	const [rightState, setRightState] = useState<RightSidebarState>(() => ({
		id: rightSidebar?.id,
		open: rightSidebar?.defaultOpen ?? false,
		width: DEFAULT_RIGHT_SIDEBAR_WIDTH,
	}));
	const sidebarWidthRef = useRef(initialSidebarWidth);
	const rightWidthRef = useRef(DEFAULT_RIGHT_SIDEBAR_WIDTH);
	const leftResizeStartRef = useRef<ResizeStart | null>(null);
	const rightResizeStartRef = useRef<ResizeStart | null>(null);
	const layoutRef = useRef<HTMLDivElement>(null);

	const activeRightState =
		rightSidebar && rightState.id === rightSidebar.id
			? rightState
			: {
					id: rightSidebar?.id,
					open: rightSidebar?.defaultOpen ?? false,
					width: DEFAULT_RIGHT_SIDEBAR_WIDTH,
				};
	const rightOpen = rightSidebar ? activeRightState.open : false;

	const applySidebarWidth = (width: number) => {
		const nextWidth = clampSidebarWidth(width);
		sidebarWidthRef.current = nextWidth;
		layoutRef.current?.style.setProperty("--sidebar-width", `${nextWidth}px`);
		return nextWidth;
	};

	const updateSidebarWidth = (width: number) => {
		setSidebarWidth(applySidebarWidth(width));
	};

	const rememberSidebarWidth = () => {
		document.cookie = `${SIDEBAR_WIDTH_COOKIE}=${sidebarWidthRef.current}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
	};

	const toggleSidebar = () => {
		const nextCollapsed = !sidebarCollapsed;
		setSidebarCollapsed(nextCollapsed);
		document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${nextCollapsed}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
	};

	const beginLeftResize = (event: PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) return;

		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		leftResizeStartRef.current = {
			pointerId: event.pointerId,
			pointerX: event.clientX,
			width: sidebarWidthRef.current,
		};
	};

	const resizeLeft = (event: PointerEvent<HTMLDivElement>) => {
		const start = leftResizeStartRef.current;
		if (start?.pointerId !== event.pointerId) return;
		applySidebarWidth(start.width + event.clientX - start.pointerX);
	};

	const finishLeftResize = (event: PointerEvent<HTMLDivElement>) => {
		if (leftResizeStartRef.current?.pointerId !== event.pointerId) return;

		leftResizeStartRef.current = null;
		setSidebarWidth(sidebarWidthRef.current);
		rememberSidebarWidth();
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	const resizeLeftWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
		let nextWidth: number | undefined;

		switch (event.key) {
			case "ArrowLeft":
				nextWidth = sidebarWidthRef.current - KEYBOARD_RESIZE_STEP;
				break;
			case "ArrowRight":
				nextWidth = sidebarWidthRef.current + KEYBOARD_RESIZE_STEP;
				break;
			case "Home":
				nextWidth = MIN_SIDEBAR_WIDTH;
				break;
			case "End":
				nextWidth = MAX_SIDEBAR_WIDTH;
				break;
			default:
				return;
		}

		event.preventDefault();
		updateSidebarWidth(nextWidth);
	};

	const rememberAfterKeyboardResize = (event: KeyboardEvent<HTMLDivElement>) => {
		if (RESIZE_KEYS.has(event.key)) rememberSidebarWidth();
	};

	const applyRightSidebarWidth = (width: number) => {
		const nextWidth = Math.min(MAX_RIGHT_SIDEBAR_WIDTH, Math.max(MIN_RIGHT_SIDEBAR_WIDTH, width));
		rightWidthRef.current = nextWidth;
		layoutRef.current?.style.setProperty("--right-sidebar-width", `${nextWidth}px`);
		return nextWidth;
	};

	const updateRightSidebarWidth = (width: number) => {
		const nextWidth = applyRightSidebarWidth(width);
		setRightState({ ...activeRightState, width: nextWidth });
	};

	const setRightOpen = (open: boolean) => {
		setRightState({ ...activeRightState, open });
	};

	const beginRightResize = (event: PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) return;

		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		rightWidthRef.current = activeRightState.width;
		rightResizeStartRef.current = {
			pointerId: event.pointerId,
			pointerX: event.clientX,
			width: rightWidthRef.current,
		};
	};

	const resizeRight = (event: PointerEvent<HTMLDivElement>) => {
		const start = rightResizeStartRef.current;
		if (start?.pointerId !== event.pointerId) return;
		applyRightSidebarWidth(start.width + start.pointerX - event.clientX);
	};

	const finishRightResize = (event: PointerEvent<HTMLDivElement>) => {
		if (rightResizeStartRef.current?.pointerId !== event.pointerId) return;

		rightResizeStartRef.current = null;
		setRightState({ ...activeRightState, width: rightWidthRef.current });
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	const resizeRightWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
		let nextWidth: number | undefined;

		switch (event.key) {
			case "ArrowLeft":
				nextWidth = activeRightState.width + KEYBOARD_RESIZE_STEP;
				break;
			case "ArrowRight":
				nextWidth = activeRightState.width - KEYBOARD_RESIZE_STEP;
				break;
			case "Home":
				nextWidth = MIN_RIGHT_SIDEBAR_WIDTH;
				break;
			case "End":
				nextWidth = MAX_RIGHT_SIDEBAR_WIDTH;
				break;
			default:
				return;
		}

		event.preventDefault();
		updateRightSidebarWidth(nextWidth);
	};

	const effectiveSidebarWidth = sidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth;
	const effectiveRightSidebarWidth = rightSidebar
		? rightOpen
			? activeRightState.width
			: COLLAPSED_RIGHT_SIDEBAR_WIDTH
		: 0;
	const layoutStyle = {
		"--sidebar-width": `${effectiveSidebarWidth}px`,
		"--right-sidebar-width": `${effectiveRightSidebarWidth}px`,
	} as CSSProperties;
	const RightSidebarContent = rightSidebar?.component;

	return (
		<div
			ref={layoutRef}
			className="relative isolate flex min-h-svh w-full bg-surface max-lg:flex-col lg:bg-canvas-sunken"
			style={layoutStyle}
		>
			<div className="fixed inset-y-0 left-0 w-(--sidebar-width) max-lg:hidden">
				{sidebar(sidebarCollapsed)}
				<button
					type="button"
					aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
					aria-expanded={!sidebarCollapsed}
					title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
					className="absolute top-3 right-2 z-20 rounded-md p-2 text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
					onClick={toggleSidebar}
				>
					{sidebarCollapsed ? (
						<ChevronRightIcon className="size-4" />
					) : (
						<ChevronLeftIcon className="size-4" />
					)}
				</button>

				{!sidebarCollapsed ? (
					<div
						role="separator"
						aria-label="Resize navigation"
						aria-orientation="vertical"
						aria-valuemin={MIN_SIDEBAR_WIDTH}
						aria-valuemax={MAX_SIDEBAR_WIDTH}
						aria-valuenow={sidebarWidth}
						tabIndex={0}
						className="group absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize touch-none focus:outline-none"
						onPointerDown={beginLeftResize}
						onPointerMove={resizeLeft}
						onPointerUp={finishLeftResize}
						onPointerCancel={finishLeftResize}
						onKeyDown={resizeLeftWithKeyboard}
						onKeyUp={rememberAfterKeyboardResize}
					>
						<span className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-border-strong opacity-0 [mask-image:linear-gradient(to_bottom,transparent,black_5rem,black_calc(100%-5rem),transparent)] group-hover:opacity-100 group-focus-visible:bg-focus group-focus-visible:opacity-100" />
					</div>
				) : null}
			</div>

			<MobileSidebar open={showSidebar} close={() => setShowSidebar(false)}>
				{sidebar(false)}
			</MobileSidebar>

			{rightSidebar && RightSidebarContent ? (
				<>
					<aside
						aria-label={rightSidebar.title}
						className="fixed inset-y-0 right-0 w-(--right-sidebar-width) max-lg:hidden"
					>
						{rightOpen ? (
							<div className="flex h-full min-h-0 flex-col">
								<div className="flex items-center justify-between border-b border-border px-4 py-3">
									<h2 className="text-sm font-semibold text-foreground">{rightSidebar.title}</h2>
									<button
										type="button"
										aria-label={`Collapse ${rightSidebar.title}`}
										className="rounded-md p-2 text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
										onClick={() => setRightOpen(false)}
									>
										<ChevronRightIcon className="size-4" />
									</button>
								</div>
								<div className="min-h-0 flex-1 overflow-y-auto p-4">
									<RightSidebarContent />
								</div>
								<div
									role="separator"
									aria-label={`Resize ${rightSidebar.title}`}
									aria-orientation="vertical"
									aria-valuemin={MIN_RIGHT_SIDEBAR_WIDTH}
									aria-valuemax={MAX_RIGHT_SIDEBAR_WIDTH}
									aria-valuenow={activeRightState.width}
									tabIndex={0}
									className="group absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize touch-none focus:outline-none"
									onPointerDown={beginRightResize}
									onPointerMove={resizeRight}
									onPointerUp={finishRightResize}
									onPointerCancel={finishRightResize}
									onKeyDown={resizeRightWithKeyboard}
								>
									<span className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-border-strong opacity-0 [mask-image:linear-gradient(to_bottom,transparent,black_5rem,black_calc(100%-5rem),transparent)] group-hover:opacity-100 group-focus-visible:bg-focus group-focus-visible:opacity-100" />
								</div>
							</div>
						) : (
							<button
								type="button"
								aria-label={`Expand ${rightSidebar.title}`}
								title={`Expand ${rightSidebar.title}`}
								className="mx-auto mt-3 block rounded-md p-2 text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
								onClick={() => setRightOpen(true)}
							>
								<ChevronLeftIcon className="size-4" />
							</button>
						)}
					</aside>

					<MobileRightSidebar
						open={showMobileRightSidebar}
						close={() => setShowMobileRightSidebar(false)}
						title={rightSidebar.title}
					>
						<RightSidebarContent />
					</MobileRightSidebar>
				</>
			) : null}

			<header className="flex items-center px-4 lg:hidden">
				<div className="py-2.5">
					<NavbarItem onClick={() => setShowSidebar(true)} aria-label="Open navigation">
						<OpenMenuIcon />
					</NavbarItem>
				</div>
				<div className="min-w-0 flex-1">{navbar}</div>
				{rightSidebar ? (
					<div className="py-2.5">
						<NavbarItem
							onClick={() => setShowMobileRightSidebar(true)}
							aria-label={`Open ${rightSidebar.title}`}
						>
							<RectangleGroupIcon />
						</NavbarItem>
					</div>
				) : null}
			</header>

			<main className="flex flex-1 flex-col pb-2 lg:min-w-0 lg:pt-2 lg:pr-[calc(var(--right-sidebar-width)+0.5rem)] lg:pl-(--sidebar-width)">
				<div className="grow p-6 lg:rounded-lg lg:bg-surface lg:p-10 lg:shadow-xs lg:ring-1 lg:ring-border">
					<div className="app-reading-column mx-auto max-w-6xl">{children}</div>
				</div>
			</main>
		</div>
	);
}
