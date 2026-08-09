const express = require('express');
const { listActiveCohorts, getCohortBySlug } = require('../controllers/cohort.controller');

const router = express.Router();

router.get('/', listActiveCohorts);
router.get('/:slug', getCohortBySlug);

module.exports = router;