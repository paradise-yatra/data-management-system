/**
 * Detect device type from User-Agent header
 * @param {string} userAgent - User-Agent string from request headers
 * @returns {string} - Device type: 'mobile', 'tablet', 'desktop', or 'unknown'
 */
export const detectDeviceType = (userAgent) => {
  if (!userAgent || typeof userAgent !== 'string') {
    return 'unknown';
  }

  const ua = userAgent.toLowerCase();

  // Tablet detection (check before mobile as tablets often contain 'mobile' in UA)
  const tabletPatterns = [
    /ipad/i,
    /android(?!.*mobile)/i,
    /tablet/i,
    /playbook/i,
    /silk/i,
    /kindle/i,
  ];

  for (const pattern of tabletPatterns) {
    if (pattern.test(ua)) {
      return 'tablet';
    }
  }

  // Mobile detection
  const mobilePatterns = [
    /mobile/i,
    /iphone/i,
    /ipod/i,
    /android.*mobile/i,
    /blackberry/i,
    /windows phone/i,
    /opera mini/i,
    /iemobile/i,
    /palm/i,
    /smartphone/i,
  ];

  for (const pattern of mobilePatterns) {
    if (pattern.test(ua)) {
      return 'mobile';
    }
  }

  // Default to desktop for desktop browsers
  return 'desktop';
};

/**
 * Extract IP address from request object
 * @param {Object} req - Express request object
 * @returns {string|null} - IP address or null
 */
export const extractIpAddress = (req) => {
  // Check for forwarded IP (when behind proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  // Check req.ip (requires app.set('trust proxy', true))
  if (req.ip) {
    return req.ip;
  }

  // Fallback to connection remote address
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }

  return null;
};

export default { detectDeviceType, extractIpAddress };
