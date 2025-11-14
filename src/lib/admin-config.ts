// Admin configuration - Load from environment variables
// Set ADMIN_EMAILS in .env.local as comma-separated list:
// ADMIN_EMAILS=email1@example.com,email2@example.com,email3@example.com
const getAdminEmailsFromEnv = (): string[] => {
  const envEmails = process.env.ADMIN_EMAILS;
  
  if (!envEmails) {
    console.warn('[Admin Config] ADMIN_EMAILS not set in environment variables. Using fallback.');
    // Fallback to empty array - you must set ADMIN_EMAILS in .env.local
    return [];
  }
  
  // Split by comma and clean up
  return envEmails
    .split(',')
    .map(email => email.trim())
    .filter(email => email.length > 0);
};

export const ADMIN_EMAILS = getAdminEmailsFromEnv();

export type AdminEmail = string;

// Check if an email is an admin email
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  // Compare emails case-insensitively
  const normalizedEmail = email.toLowerCase().trim();
  const isAdmin = ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === normalizedEmail);
  
  // Debug logging
  if (!isAdmin) {
    console.log("[Admin Config] Email check failed:");
    console.log("  - Input email:", email);
    console.log("  - Normalized:", normalizedEmail);
    console.log("  - Admin emails:", ADMIN_EMAILS);
    console.log("  - Comparisons:", ADMIN_EMAILS.map(ae => ({
      original: ae,
      normalized: ae.toLowerCase(),
      matches: ae.toLowerCase() === normalizedEmail
    })));
  }
  
  return isAdmin;
}

// Admin permissions
export const ADMIN_PERMISSIONS = {
  VIEW_USERS: 'view_users',
  DELETE_USERS: 'delete_users',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_SYSTEM: 'manage_system',
  MANAGE_DISCOUNTS: 'manage_discounts',
} as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[keyof typeof ADMIN_PERMISSIONS];

// Get admin permissions for an email (all admins have all permissions for now)
export function getAdminPermissions(email: string | null | undefined): AdminPermission[] {
  if (!isAdminEmail(email)) return [];
  
  return Object.values(ADMIN_PERMISSIONS);
}

// Check if admin has specific permission
export function hasAdminPermission(
  email: string | null | undefined, 
  permission: AdminPermission
): boolean {
  const permissions = getAdminPermissions(email);
  return permissions.includes(permission);
}
