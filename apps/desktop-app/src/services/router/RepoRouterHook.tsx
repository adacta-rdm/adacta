import { useMemo } from "react";

import { RouterService } from "./RouterService";
import { useRouter } from "../../hooks/useRouter";

/**
 * Special hook which in addition to the route also returns an object similar to the "RouterService"
 * but with the current repository id preselected
 */
export function useRepoRouterHook() {
	const router = useRouter();
	const id = router.match.params.repositoryId;
	return useMemo(
		() => ({ ...router, routerService: bindRepoId(id), repositoryId: id }),
		[id, router]
	);
}

function bindRepoId(boundRepositoryId: string) {
	return {
		devices: (repositoryId?: string) => {
			return RouterService.devices(repositoryId ?? boundRepositoryId);
		},

		devicesHierarchical: (repositoryId?: string) => {
			return RouterService.devicesHierarchical(repositoryId ?? boundRepositoryId);
		},

		device: (id: string, timestamp?: Date, repositoryId?: string) => {
			return RouterService.device(repositoryId ?? boundRepositoryId, id, timestamp);
		},

		deviceDefinitions(repositoryId?: string) {
			return RouterService.deviceDefinitions(repositoryId ?? boundRepositoryId);
		},

		importer: (resourceId: string, deviceId: string, repositoryId?: string) => {
			return RouterService.importer(repositoryId ?? boundRepositoryId, resourceId, deviceId);
		},

		resources: (repositoryId?: string) => {
			return RouterService.resources(repositoryId ?? boundRepositoryId);
		},

		projects: (repositoryId?: string) => {
			return RouterService.projects(repositoryId ?? boundRepositoryId);
		},

		project: (projectId: string, repositoryId?: string) => {
			return RouterService.project(repositoryId ?? boundRepositoryId, projectId);
		},

		resource: (resourceId: string, repositoryId?: string) => {
			return RouterService.resource(repositoryId ?? boundRepositoryId, resourceId);
		},

		samples: (repositoryId?: string) => {
			return RouterService.samples(repositoryId ?? boundRepositoryId);
		},

		sample: (sampleId: string, repositoryId?: string, timestamp?: Date) => {
			return RouterService.sample(repositoryId ?? boundRepositoryId, sampleId, timestamp);
		},

		nameComposition(repositoryId?: string) {
			return RouterService.nameComposition(repositoryId ?? boundRepositoryId);
		},

		userProfile: (userId: string, repositoryId?: string) => {
			return RouterService.userProfile(repositoryId ?? boundRepositoryId, userId);
		},

		login: () => {
			return RouterService.login();
		},

		settings: () => {
			return RouterService.settings();
		},
	};
}
