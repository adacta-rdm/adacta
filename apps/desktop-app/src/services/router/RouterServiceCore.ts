/**
 * Contains core functionality of the RouterService which does not require react.
 * This split between React and non-React allows these base methods to be used in a node(-like)
 * environment.
 */
import { createIDatetime } from "~/lib/createDate";

export class RouterServiceCore {
	protected static BASE_ROUTES = {
		devices: "/devices",
		devicesHierarchical: "/devicesHierarchical",
		deviceDefinitions: "/deviceDefinitions",
		resources: "/resources",
		projects: "/projects",
		samples: "/samples",
		users: "/users",
		auth: "/auth",
		settings: "/settings",
		nameComposition: "/nameComposition",
		welcome: "/welcome",
	};

	public static welcome() {
		return RouterServiceCore.BASE_ROUTES.welcome;
	}

	public static devices(repositoryId: string) {
		return `/${repositoryId}${RouterServiceCore.BASE_ROUTES.devices}/flat`;
	}

	public static devicesHierarchical(repositoryId: string) {
		return `/${repositoryId}${RouterServiceCore.BASE_ROUTES.devices}`;
	}

	public static device(repositoryId: string, id: string, timestamp?: Date) {
		if (timestamp) {
			return `${RouterServiceCore.devices(repositoryId)}/${id}/${createIDatetime(timestamp)}`;
		}

		return `${RouterServiceCore.devices(repositoryId)}/${id}`;
	}

	public static deviceDefinitions(repositoryId: string) {
		return `/${repositoryId}${RouterServiceCore.BASE_ROUTES.deviceDefinitions}`;
	}

	public static importer(repositoryId: string, resourceId: string, deviceId: string) {
		return `${RouterServiceCore.device(repositoryId, deviceId)}/importer/${resourceId}`;
	}

	public static resources(repositoryId: string) {
		return `/${repositoryId}${RouterServiceCore.BASE_ROUTES.resources}`;
	}

	public static projects(repositoryId: string) {
		return `/${repositoryId}${RouterServiceCore.BASE_ROUTES.projects}`;
	}

	public static project(repositoryId: string, projectId: string) {
		return `${RouterServiceCore.projects(repositoryId)}/${projectId}`;
	}

	public static resource(repositoryId: string, resourceId: string) {
		return `${RouterServiceCore.resources(repositoryId)}/${resourceId}`;
	}

	public static samples(repositoryId: string) {
		return `/${repositoryId}${RouterServiceCore.BASE_ROUTES.samples}`;
	}

	public static sample(repositoryId: string, sampleId: string, timestamp?: Date) {
		if (timestamp) {
			// eslint-disable-next-line no-console
			console.warn("There is no route for a time dependent sample view");
		}

		return `${RouterServiceCore.samples(repositoryId)}/${sampleId}`;
	}

	public static userProfile(repositoryId: string, userId: string) {
		return `/${repositoryId}${RouterServiceCore.BASE_ROUTES.users}/profile/${userId}`;
	}

	public static login() {
		return `${RouterServiceCore.BASE_ROUTES.auth}/`;
	}

	public static settings() {
		return RouterServiceCore.BASE_ROUTES.settings;
	}

	public static nameComposition(repositoryId: string) {
		return `/${repositoryId}${RouterServiceCore.BASE_ROUTES.nameComposition}`;
	}

	/**
	 * Determines if a location starts with a given base route
	 * If for example location "/test/1234" and base route "/test" were passed the function would
	 * return true
	 */
	public static isSubRoute(location: string, baseRoute: string) {
		return location.includes(`${baseRoute}/`);
	}

	/**
	 * Tries to extract the document IDs part out of the passed locations.
	 */
	public static extractId(location: string) {
		if (
			RouterServiceCore.isSubRoute(location, RouterServiceCore.BASE_ROUTES.resources) ||
			RouterServiceCore.isSubRoute(location, RouterServiceCore.BASE_ROUTES.samples) ||
			RouterServiceCore.isSubRoute(location, RouterServiceCore.BASE_ROUTES.devices)
		) {
			const locationParts = location.split("/");

			if (!locationParts[3] || !locationParts[1]) {
				return undefined;
			}

			// While not super sophisticated it is good enough for now
			return { id: locationParts[3], repositoryId: locationParts[1] };
		}
	}
}
