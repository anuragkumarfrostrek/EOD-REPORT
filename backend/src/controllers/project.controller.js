const { getProjectsByUser, createProject, deleteProject } = require('../services/project.service');

const listProjects = async (req, res) => {
  try {
    const projects = await getProjectsByUser(req.user.id);
    res.json({ projects });
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const addProject = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    const project = await createProject({ userId: req.user.id, name: name.trim() });
    res.status(201).json({ project });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Project with this name already exists' });
    }
    console.error('Add project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const removeProject = async (req, res) => {
  try {
    const deleted = await deleteProject(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { listProjects, addProject, removeProject };
