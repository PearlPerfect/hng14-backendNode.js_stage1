const pool = require('../config/db');
const { fetchGenderize, fetchAgify, fetchNationalize } = require('./external.service');
const { getAgeGroup, getTopCountry } = require('../utils/classify');

// UUID v7 generator — time-sortable, no external dependency needed
function uuidv7() {
  const now = Date.now();
  const timeHigh = Math.floor(now / 0x100000000);
  const timeLow = now >>> 0;
  const b = new Uint8Array(16);
  b[0] = (timeHigh >>> 8) & 0xff;
  b[1] = timeHigh & 0xff;
  b[2] = (timeLow >>> 24) & 0xff;
  b[3] = (timeLow >>> 16) & 0xff;
  b[4] = (timeLow >>> 8) & 0xff;
  b[5] = timeLow & 0xff;
  b[6] = (Math.random() * 0x10 | 0) | 0x70; // version 7
  b[7] = (Math.random() * 0x40 | 0) | 0x80; // variant
  for (let i = 8; i < 16; i++) b[i] = Math.random() * 256 | 0;
  const h = Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

async function createProfile(name) {
  const existing = await pool.query(
    'SELECT * FROM profiles WHERE LOWER(name) = LOWER($1)',
    [name]
  );
  if (existing.rows.length > 0) {
    return { alreadyExists: true, data: existing.rows[0] };
  }

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

  await pool.query(
    `INSERT INTO profiles (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      profile.id, profile.name, profile.gender, profile.gender_probability,
      profile.sample_size, profile.age, profile.age_group,
      profile.country_id, profile.country_probability, profile.created_at
    ]
  );

  return { alreadyExists: false, data: profile };
}

async function getProfileById(id) {
  const result = await pool.query('SELECT * FROM profiles WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function getAllProfiles(filters = {}) {
  let query = 'SELECT * FROM profiles WHERE 1=1';
  const params = [];
  let i = 1;

  if (filters.gender) {
    query += ` AND LOWER(gender) = LOWER($${i++})`;
    params.push(filters.gender);
  }
  if (filters.country_id) {
    query += ` AND LOWER(country_id) = LOWER($${i++})`;
    params.push(filters.country_id);
  }
  if (filters.age_group) {
    query += ` AND LOWER(age_group) = LOWER($${i++})`;
    params.push(filters.age_group);
  }

  const result = await pool.query(query, params);
  return result.rows;
}

async function deleteProfile(id) {
  const result = await pool.query('DELETE FROM profiles WHERE id = $1', [id]);
  return result.rowCount > 0;
}

module.exports = { createProfile, getProfileById, getAllProfiles, deleteProfile };