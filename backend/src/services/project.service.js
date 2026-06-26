const { query } = require('../config/db');

const getProjectsByUser = async (userId) => {
  const result = await query(
    'SELECT * FROM projects WHERE user_id = $1 ORDER BY name ASC',
    [userId]
  );
  return result.rows;
};

const getProjectById = async (id, userId) => {
  const result = await query(
    'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return result.rows[0] || null;
};

const createProject = async ({ userId, name }) => {
  const result = await query(
    'INSERT INTO projects (user_id, name) VALUES ($1, $2) RETURNING *',
    [userId, name]
  );
  return result.rows[0];
};

const deleteProject = async (id, userId) => {
  const result = await query(
    'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );
  return result.rows[0] || null;
};

module.exports = { getProjectsByUser, getProjectById, createProject, deleteProject };
