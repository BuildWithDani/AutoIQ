/**
 * Formats a date with timezone abbreviation
 * @param date - Date object or ISO string
 * @param options - Formatting options
 * @returns Formatted date string with timezone (e.g., "11/29/2025, 4:05:13 AM CT")
 */
export function formatDateTimeWithTimezone(
  date: Date | string,
  options: {
    includeDate?: boolean;
    includeTime?: boolean;
    includeSeconds?: boolean;
  } = {}
): string {
  const {
    includeDate = true,
    includeTime = true,
    includeSeconds = false,
  } = options;

  // Parse date string - if it's an ISO string without timezone, treat it as UTC
  let dateObj: Date;
  if (typeof date === 'string') {
    // If the string doesn't end with Z or timezone offset, assume it's UTC
    const dateStr = date.trim();
    if (dateStr && !dateStr.match(/[Z+-]\d{2}:?\d{2}$/)) {
      // Add Z to indicate UTC if not present
      dateObj = new Date(dateStr + (dateStr.includes('T') ? 'Z' : ''));
    } else {
      dateObj = new Date(dateStr);
    }
  } else {
    dateObj = date;
  }
  
  // Get timezone abbreviation
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timeZoneName = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'short',
  }).formatToParts(dateObj).find(part => part.type === 'timeZoneName')?.value || '';

  // Format date
  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone,
  };

  if (includeDate) {
    dateOptions.year = 'numeric';
    dateOptions.month = '2-digit';
    dateOptions.day = '2-digit';
  }

  if (includeTime) {
    dateOptions.hour = 'numeric';
    dateOptions.minute = '2-digit';
    if (includeSeconds) {
      dateOptions.second = '2-digit';
    }
    dateOptions.hour12 = true;
  }

  const formatter = new Intl.DateTimeFormat('en-US', dateOptions);
  const formatted = formatter.format(dateObj);

  // Return formatted string with timezone
  return includeTime && timeZoneName ? `${formatted} ${timeZoneName}` : formatted;
}

/**
 * Formats a time with timezone abbreviation
 * @param date - Date object or ISO string
 * @param includeSeconds - Whether to include seconds
 * @returns Formatted time string with timezone (e.g., "9:05:04 AM CT")
 */
export function formatTimeWithTimezone(
  date: Date | string,
  includeSeconds: boolean = true
): string {
  return formatDateTimeWithTimezone(date, {
    includeDate: false,
    includeTime: true,
    includeSeconds,
  });
}

/**
 * Formats a date with timezone abbreviation
 * @param date - Date object or ISO string
 * @returns Formatted date string with timezone (e.g., "11/29/2025, 4:05:13 AM CT")
 */
export function formatDateWithTimezone(date: Date | string): string {
  return formatDateTimeWithTimezone(date, {
    includeDate: true,
    includeTime: true,
    includeSeconds: true,
  });
}

