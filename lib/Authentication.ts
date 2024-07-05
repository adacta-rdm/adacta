import { pbkdf2 as _pbkdf2, randomBytes } from "crypto";
import { promisify } from "util";

const pbkdf2 = promisify(_pbkdf2);

const hashIterations = 100000;

async function hashPassword(password: string, salt: string) {
	const buffer = await pbkdf2(password, salt, hashIterations, 64, "sha512");
	return buffer.toString("base64");
}

export async function verifyPassword(password: string, hash: string, salt: string) {
	const newHash = await hashPassword(password, salt);
	return newHash === hash;
}

export async function createPasswordHash(password: string) {
	const salt = randomBytes(128).toString("base64");
	const passwordHash = await hashPassword(password, salt);

	return { salt, passwordHash };
}
