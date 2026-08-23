const UAParser = require("ua-parser-js");
const geoip = require("geoip-lite");

/*
  Get the user's public IP address
*/
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return (
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "Unknown"
  );
}

/*
  Convert IPv4-mapped IPv6 address to normal IPv4
*/
function cleanIp(ip) {
  if (!ip) return "Unknown";

  if (ip.startsWith("::ffff:")) {
    return ip.substring(7);
  }

  return ip;
}

/*
  Get browser, operating system and device information
*/
function getDeviceInfo(req) {
  const userAgent = req.headers["user-agent"] || "";

  const parser = new UAParser(userAgent);

  const result = parser.getResult();

  let deviceType = "Desktop";

  if (result.device.type === "mobile") {
    deviceType = "Mobile";
  } else if (result.device.type === "tablet") {
    deviceType = "Tablet";
  }

  return {
    browser: result.browser.name || "Unknown",
    browserVersion: result.browser.version || "Unknown",

    operatingSystem: result.os.name || "Unknown",
    operatingSystemVersion: result.os.version || "Unknown",

    deviceType,

    deviceModel:
      result.device.model ||
      result.device.vendor ||
      "Unknown",
  };
}

/*
  Get approximate location from IP address
*/
function getLocation(ip) {
  const cleanAddress = cleanIp(ip);

  const location = geoip.lookup(cleanAddress);

  if (!location) {
    return {
      city: "Unknown",
      state: "Unknown",
      country: "Unknown",
      latitude: null,
      longitude: null,
    };
  }

  return {
    city: location.city || "Unknown",
    state: location.region || "Unknown",
    country: location.country || "Unknown",
    latitude: location.ll?.[0] ?? null,
    longitude: location.ll?.[1] ?? null,
  };
}

/*
  Automatically choose theme based on login time.

  5:00 AM - 11:59 AM IST = Light
  All other times = Dark
*/
function getAutomaticTheme() {
  const now = new Date();

  const istTime = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  const [hour] = istTime.split(":").map(Number);

  if (hour >= 5 && hour < 12) {
    return "light";
  }

  return "dark";
}

/*
  Build complete login information
*/
function collectLoginInfo(req) {
  const ip = cleanIp(getClientIp(req));

  const device = getDeviceInfo(req);

  const location = getLocation(ip);

  return {
    ipAddress: ip,

    browser: device.browser,
    browserVersion: device.browserVersion,

    operatingSystem: device.operatingSystem,
    operatingSystemVersion: device.operatingSystemVersion,

    deviceType: device.deviceType,
    deviceModel: device.deviceModel,

    loginTimestamp: new Date().toISOString(),

    city: location.city,
    state: location.state,
    country: location.country,

    approximateLocation: {
      latitude: location.latitude,
      longitude: location.longitude,
    },

    automaticTheme: getAutomaticTheme(),
  };
}

module.exports = {
  getClientIp,
  getDeviceInfo,
  getLocation,
  getAutomaticTheme,
  collectLoginInfo,
};