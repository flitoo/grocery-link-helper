require('dotenv').config();

function optionalPositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

module.exports = {
  port: process.env.PORT || 8080,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  slots: {
    // BR-07: active orders per slot are capped by available helpers. Set
    // SLOT_CAPACITY to override the helper count (e.g. for demos).
    capacityOverride: optionalPositiveInt(process.env.SLOT_CAPACITY),
    timeZone: process.env.SLOT_TIMEZONE || 'America/Toronto',
    openHour: optionalPositiveInt(process.env.SLOT_OPEN_HOUR) ?? 8,
    closeHour: optionalPositiveInt(process.env.SLOT_CLOSE_HOUR) ?? 21,
    leadHours: optionalPositiveInt(process.env.SLOT_LEAD_HOURS) ?? 2,
    windowDays: 7, // US-07: show the next 7 days
  },
};
