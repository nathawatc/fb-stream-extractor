/**
 * Shell escaping utility for POSIX-compliant shells (Linux / macOS / WSL).
 */

/**
 * Escapes a string for safe use as a POSIX shell command argument.
 * Wraps in single quotes and escapes internal single quotes to prevent injection.
 */
export function shellEscape(str: string): string {
	return `'${str.replace(/'/g, "'\\''")}'`;
}
