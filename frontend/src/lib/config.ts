/** First day of the week in calendars: 0 = Sunday, 1 = Monday. Matches the API's Monday-based week view by default. */
const raw = Number(import.meta.env.VITE_WEEK_STARTS_ON ?? 1)
export const WEEK_STARTS_ON = (raw >= 0 && raw <= 6 ? raw : 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6
