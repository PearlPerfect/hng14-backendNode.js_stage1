const { Router } = require('express');
const controller = require('../controllers/profile.controller');

const router = Router();

router.post('/', controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getOne);
router.delete('/:id', controller.remove);

module.exports = router;