import * as Headless from "@headlessui/react";
import {
	useRef,
	useState,
	type CSSProperties,
	type KeyboardEvent,
	type PointerEvent,
	type PropsWithChildren,
	type ReactNode,
} from "react";

import {
	clampSidebarWidth,
	MAX_SIDEBAR_WIDTH,
	MIN_SIDEBAR_WIDTH,
	SIDEBAR_WIDTH_COOKIE,
} from "~/app/lib/sidebarWidth";
import { NavbarItem } from "~/catalyst-ui/navbar";

const KEYBOARD_RESIZE_STEP = 16;
const RESIZE_KEYS = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

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
			<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 0 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
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
				className="fixed inset-0 bg-black/30 transition data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
			/>
			<Headless.DialogPanel
				transition
				className="fixed inset-y-0 w-full max-w-80 p-2 transition duration-300 ease-in-out data-closed:-translate-x-full"
			>
				<div className="flex h-full flex-col rounded-lg bg-white shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
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

type ResizeStart = {
	pointerId: number;
	pointerX: number;
	width: number;
};

export function SidebarLayout({
	navbar,
	sidebar,
	sidebarWidth: initialSidebarWidth,
	children,
}: PropsWithChildren<{ navbar: ReactNode; sidebar: ReactNode; sidebarWidth: number }>) {
	const [showSidebar, setShowSidebar] = useState(false);
	const [sidebarWidth, setSidebarWidth] = useState(initialSidebarWidth);
	const sidebarWidthRef = useRef(initialSidebarWidth);
	const resizeStartRef = useRef<ResizeStart | null>(null);
	const layoutRef = useRef<HTMLDivElement>(null);

	/**
	 * Set the width on the element itself. Returns the width that was set.
	 *
	 * The width is one CSS variable. A drag can write it straight to the layout.
	 * A pointer sends a move event every few pixels. Rendering on each event
	 * makes the drag stutter.
	 */
	const applySidebarWidth = (width: number) => {
		const nextWidth = clampSidebarWidth(width);

		sidebarWidthRef.current = nextWidth;
		layoutRef.current?.style.setProperty("--sidebar-width", `${nextWidth}px`);

		return nextWidth;
	};

	/**
	 * Set the width and render. The keyboard steps use this.
	 */
	const updateSidebarWidth = (width: number) => {
		setSidebarWidth(applySidebarWidth(width));
	};

	/**
	 * Store the width for the next request.
	 *
	 * A cookie is sent with the request. The server therefore renders the page
	 * at this width. The sidebar does not jump once the browser takes over.
	 */
	const rememberSidebarWidth = () => {
		const width = sidebarWidthRef.current;

		document.cookie = `${SIDEBAR_WIDTH_COOKIE}=${width}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
	};

	const beginResize = (event: PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) {
			return;
		}

		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		resizeStartRef.current = {
			pointerId: event.pointerId,
			pointerX: event.clientX,
			width: sidebarWidthRef.current,
		};
	};

	const resize = (event: PointerEvent<HTMLDivElement>) => {
		const start = resizeStartRef.current;

		if (start?.pointerId !== event.pointerId) {
			return;
		}

		applySidebarWidth(start.width + event.clientX - start.pointerX);
	};

	const finishResize = (event: PointerEvent<HTMLDivElement>) => {
		if (resizeStartRef.current?.pointerId !== event.pointerId) {
			return;
		}

		resizeStartRef.current = null;

		// The drag wrote the width to the element. React is told once, at the end.
		// The reported value and the layout then agree.
		setSidebarWidth(sidebarWidthRef.current);
		rememberSidebarWidth();

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	const resizeWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
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

	/**
	 * A held arrow key repeats. The width is stored when the key comes back up.
	 * It is not stored on every repeat.
	 */
	const rememberAfterKeyboardResize = (event: KeyboardEvent<HTMLDivElement>) => {
		if (RESIZE_KEYS.has(event.key)) rememberSidebarWidth();
	};

	const layoutStyle = {
		"--sidebar-width": `${sidebarWidth}px`,
	} as CSSProperties;

	return (
		<div
			ref={layoutRef}
			className="relative isolate flex min-h-svh w-full bg-white max-lg:flex-col lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950"
			style={layoutStyle}
		>
			{/* Sidebar on desktop */}
			<div className="fixed inset-y-0 left-0 w-(--sidebar-width) max-lg:hidden">
				{sidebar}

				<div
					role="separator"
					aria-label="Resize navigation"
					aria-orientation="vertical"
					aria-valuemin={MIN_SIDEBAR_WIDTH}
					aria-valuemax={MAX_SIDEBAR_WIDTH}
					aria-valuenow={sidebarWidth}
					tabIndex={0}
					className="group absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize touch-none focus:outline-none"
					onPointerDown={beginResize}
					onPointerMove={resize}
					onPointerUp={finishResize}
					onPointerCancel={finishResize}
					onKeyDown={resizeWithKeyboard}
					onKeyUp={rememberAfterKeyboardResize}
				>
					{/*
						The content to the right sits in a box with rounded corners. A line of
						the full height would run past them. The mask fades the line out over
						the top and bottom five rems. The corners stay undisturbed.
					*/}
					<span className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-border-strong opacity-0 [mask-image:linear-gradient(to_bottom,transparent,black_5rem,black_calc(100%-5rem),transparent)] group-hover:opacity-100 group-focus-visible:bg-focus group-focus-visible:opacity-100" />
				</div>
			</div>

			{/* Sidebar on mobile */}
			<MobileSidebar open={showSidebar} close={() => setShowSidebar(false)}>
				{sidebar}
			</MobileSidebar>

			{/* Navbar on mobile */}
			<header className="flex items-center px-4 lg:hidden">
				<div className="py-2.5">
					<NavbarItem onClick={() => setShowSidebar(true)} aria-label="Open navigation">
						<OpenMenuIcon />
					</NavbarItem>
				</div>
				<div className="min-w-0 flex-1">{navbar}</div>
			</header>

			{/* Content */}
			<main className="flex flex-1 flex-col pb-2 lg:min-w-0 lg:pt-2 lg:pr-2 lg:pl-(--sidebar-width)">
				<div className="grow p-6 lg:rounded-lg lg:bg-white lg:p-10 lg:shadow-xs lg:ring-1 lg:ring-zinc-950/5 dark:lg:bg-zinc-900 dark:lg:ring-white/10">
					<div className="mx-auto max-w-6xl">{children}</div>
				</div>
			</main>
		</div>
	);
}
