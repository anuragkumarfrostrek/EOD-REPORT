const express = require('express');
const router = express.Router();
const { listProjects, addProject, removeProject } = require('../controllers/project.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', listProjects);
router.post('/', addProject);
router.delete('/:id', removeProject);

module.exports = router;
