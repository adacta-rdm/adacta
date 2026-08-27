/**
 * Repository list.
 *
 * Fixture data for now. Only the body of this module changes when the database
 * lands. Routes call these functions and stay untouched.
 */

export type Repository = {
	id: string;
	name: string;
};

const repositories: Repository[] = [
	{ id: "demo", name: "Demo Laboratory" },
	{ id: "pilot", name: "Pilot Plant" },
];

export function listRepositories(): Repository[] {
	return repositories;
}

export function findRepository(id: string): Repository | undefined {
	return repositories.find((repository) => repository.id === id);
}
