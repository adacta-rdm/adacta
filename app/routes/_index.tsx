import { redirect } from "react-router";

/**
 * Inventory is the application's landing page.
 */
export function loader() {
	return redirect("/inventory");
}
