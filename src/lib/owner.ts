// This app is single-user (Jovana's personal study app) and has no sign-in.
// Every row in the database belongs to this one fixed owner id, so the data
// still lives in Supabase and syncs across her devices — just without a login.
export const OWNER_ID = "00000000-0000-0000-0000-000000000001";
