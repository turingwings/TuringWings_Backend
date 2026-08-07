const express = require('express');
const { listActiveCohorts } = require('../controllers/cohort.controller');

const router = express.Router();

router.get('/', listActiveCohorts);

module.exports = router;