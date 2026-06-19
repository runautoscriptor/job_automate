const fs = require('fs');
const path = require('path');

const PROFILE_PATH = path.resolve(process.cwd(), 'profile', 'profile.json');
const REQUIRED_PROFILE_FIELDS = [
  'name',
  'role',
  'totalExperience',
  'skills',
  'primarySkills',
  'location',
  'preferredLocations',
  'noticePeriod',
  'currentCTC',
  'expectedCTC',
  'jobKeywords'
];

let cachedProfile = null;

function getCandidateProfilePath() {
  return PROFILE_PATH;
}

function loadCandidateProfile(options = {}) {
  const { fresh = false } = options;

  if (!fresh && cachedProfile) {
    return cachedProfile;
  }

  if (!fs.existsSync(PROFILE_PATH)) {
    throw new Error(`Candidate profile file was not found at ${PROFILE_PATH}.`);
  }

  const rawProfile = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8'));
  validateCandidateProfile(rawProfile);

  cachedProfile = Object.freeze(rawProfile);

  return cachedProfile;
}

function validateCandidateProfile(profile) {
  const missingFields = REQUIRED_PROFILE_FIELDS.filter((fieldName) => {
    const value = profile[fieldName];

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    throw new Error(
      `Candidate profile is missing required fields: ${missingFields.join(', ')}`
    );
  }
}

function getCandidateProfileView(options = {}) {
  const profile = loadCandidateProfile(options);

  return {
    raw: profile,
    personalDetails: {
      name: profile.name,
      role: profile.role,
      location: profile.location,
      education: profile.education || {}
    },
    experience: {
      totalExperience: profile.totalExperience,
      summary: profile.experienceSummary || '',
      professionalSummary: profile.professionalSummary || profile.experienceSummary || ''
    },
    skills: {
      all: profile.skills,
      primary: profile.primarySkills
    },
    locations: {
      current: profile.location,
      preferred: profile.preferredLocations
    },
    salaryDetails: {
      currentCTC: profile.currentCTC,
      expectedCTC: profile.expectedCTC
    },
    noticePeriod: profile.noticePeriod,
    jobPreferences: {
      targetRole: profile.role,
      jobKeywords: profile.jobKeywords,
      preferredLocations: profile.preferredLocations
    }
  };
}

function getProfileValue(fieldName, options = {}) {
  const profile = loadCandidateProfile(options);
  return profile[fieldName];
}

module.exports = {
  getCandidateProfilePath,
  getCandidateProfileView,
  getProfileValue,
  loadCandidateProfile,
  validateCandidateProfile
};
