/**
 * Generates a random invite code for teams
 * @returns A 6-character alphanumeric code
 */
export function generateInviteCode(): string {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Removed similar looking characters
  let result = ""
  const length = 6

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }

  return result
}

/**
 * Validates if a string is a valid invite code format
 * @param code The code to validate
 * @returns Boolean indicating if the code is valid
 */
export function isValidInviteCode(code: string): boolean {
  // Check if code is 6 characters and only contains allowed characters
  const pattern = /^[A-Z0-9]{6}$/
  return pattern.test(code)
}

/**
 * Formats a team ID for display (shortens and adds ellipsis)
 * @param id The team ID to format
 * @returns Formatted team ID for display
 */
export function formatTeamId(id: string): string {
  if (!id) return ""
  if (id.length <= 8) return id

  return `${id.substring(0, 4)}...${id.substring(id.length - 4)}`
}

