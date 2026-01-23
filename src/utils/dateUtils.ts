/**
 * Get current date and time in Indian Standard Time (IST)
 * Returns ISO string in IST timezone
 */
export const getCurrentISTDateTime = (): string => {
  const now = new Date();
  
  // Get IST time using toLocaleString
  const istString = now.toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  // Parse the IST string and format as ISO
  // Format: MM/DD/YYYY, HH:MM:SS
  const [datePart, timePart] = istString.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hours, minutes, seconds] = timePart.split(':');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+05:30`;
};

/**
 * Format date and time string to IST display format
 * @param dateTimeString - ISO string or date string
 * @returns Formatted string in IST format
 */
export const formatDateTimeIST = (dateTimeString: string): string => {
  try {
    // If it's just a date (YYYY-MM-DD), add time
    let date: Date;
    if (dateTimeString.includes('T')) {
      date = new Date(dateTimeString);
    } else {
      // If only date, assume midnight IST
      date = new Date(dateTimeString + 'T00:00:00+05:30');
    }
    
    // Convert to IST for display
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch (error) {
    return dateTimeString;
  }
};

/**
 * Format date only (for table display)
 * @param dateTimeString - ISO string or date string
 * @returns Formatted date string
 */
export const formatDateIST = (dateTimeString: string): string => {
  try {
    let date: Date;
    if (dateTimeString.includes('T')) {
      date = new Date(dateTimeString);
    } else {
      date = new Date(dateTimeString + 'T00:00:00+05:30');
    }
    
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (error) {
    return dateTimeString;
  }
};

