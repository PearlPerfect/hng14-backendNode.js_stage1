const profileService = require('../services/profile.service');

async function create(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ status: 'error', message: 'Name is required' });
    }
    const result = await profileService.createProfile(name.trim());
    if (result.alreadyExists) {
      return res.status(200).json({ status: 'success', message: 'Profile already exists', data: result.data });
    }
    return res.status(201).json({ status: 'success', data: result.data });
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const profile = await profileService.getProfileById(req.params.id);
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found' });
    return res.status(200).json({ status: 'success', data: profile });
  } catch (err) { next(err); }
}

async function getAll(req, res, next) {
  try {
    const { gender, country_id, age_group } = req.query;
    const profiles = await profileService.getAllProfiles({ gender, country_id, age_group });
    return res.status(200).json({ status: 'success', count: profiles.length, data: profiles });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await profileService.deleteProfile(req.params.id);
    if (!deleted) return res.status(404).json({ status: 'error', message: 'Profile not found' });
    return res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { create, getOne, getAll, remove };