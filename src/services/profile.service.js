const { v7: uuidv7 } = require('uuid');
const db = require('../config/db');
const { fetchGenderize, fetchAgify, fetchNationalize } = require('./external.service');
const { getAgeGroup, getTopCountry } = require('../utils/classify');

async function createProfile(name) {
  // Check for existing profile (idempotency)
  const existing = db.prepare('SELECT * FROM profiles WHERE LOWER(name) = LOWER(?)').get(name);
  if (existing) {
    return { alreadyExists: true, data: existing };
  }

  // Call all three APIs in parallel
  const [genderData, agifyData, nationalizeData] = await Promise.all([
    fetchGenderize(name),
    fetchAgify(name),
    fetchNationalize(name),
  ]);

  const topCountry = getTopCountry(nationalizeData.countries);
  const ageGroup = getAgeGroup(agifyData.age);

  const profile = {
    id: uuidv7(),
    name: name.toLowerCase(),
    gender: genderData.gender,
    gender_probability: genderData.gender_probability,
    sample_size: genderData.sample_size,
    age: agifyData.age,
    age_group: ageGroup,
    country_id: topCountry.country_id,
    country_probability: topCountry.probability,
    created_at: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO profiles (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at)
    VALUES (@id, @name, @gender, @gender_probability, @sample_size, @age, @age_group, @country_id, @country_probability, @created_at)
  `).run(profile);

  return { alreadyExists: false, data: profile };
}

function getProfileById(id) {
  return db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
}

function getAllProfiles(filters = {}) {
  let query = 'SELECT * FROM profiles WHERE 1=1';
  const params = [];

  if (filters.gender) {
    query += ' AND LOWER(gender) = LOWER(?)';
    params.push(filters.gender);
  }
  if (filters.country_id) {
    query += ' AND LOWER(country_id) = LOWER(?)';
    params.push(filters.country_id);
  }
  if (filters.age_group) {
    query += ' AND LOWER(age_group) = LOWER(?)';
    params.push(filters.age_group);
  }

  return db.prepare(query).all(...params);
}

function deleteProfile(id) {
  const result = db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = { createProfile, getProfileById, getAllProfiles, deleteProfile };