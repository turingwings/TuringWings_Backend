/**
 * Helper to generate student usernames for cohort registration.
 * Format: TW + [first 2 letters of cohort] + [first 2 letters of student name] + [registration_no padded to 2 digits]
 * Example: TWFSSA01
 */

function getCohortCode(title) {
  if (!title) return 'XX';
  const clean = title.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (clean.length >= 2) {
    return clean.slice(0, 2).toUpperCase();
  }
  return clean.toUpperCase().padEnd(2, 'X');
}

function getNameCode(name) {
  if (!name) return 'XX';
  const clean = name.trim().replace(/[^a-zA-Z]/g, '');
  if (clean.length >= 2) {
    return clean.slice(0, 2).toUpperCase();
  }
  return clean.toUpperCase().padEnd(2, 'X');
}

function generateUsername(cohortTitle, studentName, registrationNo) {
  const cohortCode = getCohortCode(cohortTitle);
  const nameCode = getNameCode(studentName);
  const paddedNo = String(registrationNo).padStart(2, '0');
  return `TW${cohortCode}${nameCode}${paddedNo}`;
}

module.exports = {
  getCohortCode,
  getNameCode,
  generateUsername,
};
