import api from './client';

// Auth
export const login = (email, password) => api.post("/users/login/", { email, password });
export const roleLogin = (role) => api.post("/users/role-login/", { role });
export const getMe = () => api.get('/users/me/');
export const getUsers = () => api.get('/users/');

// Dashboard
export const getDashboard = () => api.get('/projects/dashboard/');

// Sprints
export const getSprints = (params) => api.get('/projects/sprints/', { params });
export const createSprint = (data) => api.post('/projects/sprints/', data);
export const updateSprint = (id, data) => api.patch(`/projects/sprints/${id}/`, data);
export const deleteSprint = (id) => api.delete(`/projects/sprints/${id}/`);
export const activateSprint = (id) => api.patch(`/projects/sprints/${id}/`, { status: 'Active' });

// Tasks
export const getTasks = (params) => api.get('/projects/tasks/', { params });
export const createTask = (data) => api.post('/projects/tasks/', data);
export const updateTask = (id, data) => api.patch(`/projects/tasks/${id}/`, data);
export const deleteTask = (id) => api.delete(`/projects/tasks/${id}/`);

// Requirements
export const getRequirements = (params) => api.get('/projects/requirements/', { params });
export const createRequirement = (data) => api.post('/projects/requirements/', data);
export const updateRequirement = (id, data) => api.patch(`/projects/requirements/${id}/`, data);
export const deleteRequirement = (id) => api.delete(`/projects/requirements/${id}/`);

// Requirement sub-items
export const getReqChildren = (id) => api.get(`/projects/requirements/${id}/children/`);
export const createReqChild = (id, data) => api.post(`/projects/requirements/${id}/children/`, data);

// Requirement comments
export const getReqComments = (id) => api.get(`/projects/requirements/${id}/comments/`);
export const createReqComment = (id, data) => api.post(`/projects/requirements/${id}/comments/`, data);
export const deleteReqComment = (id, commentId) => api.delete(`/projects/requirements/${id}/comments/${commentId}/`);

// Requirement work logs
export const getReqWorklogs = (id) => api.get(`/projects/requirements/${id}/worklogs/`);
export const createReqWorklog = (id, data) => api.post(`/projects/requirements/${id}/worklogs/`, data);
export const deleteReqWorklog = (id, logId) => api.delete(`/projects/requirements/${id}/worklogs/${logId}/`);

// Requirement attachments
export const getReqAttachments = (id) => api.get(`/projects/requirements/${id}/attachments/`);
export const createReqAttachment = (id, formData) => api.post(`/projects/requirements/${id}/attachments/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteReqAttachment = (id, attId) => api.delete(`/projects/requirements/${id}/attachments/${attId}/`);

// Requirement links
export const getReqLinks = (id) => api.get(`/projects/requirements/${id}/links/`);
export const addReqLink = (id, requirementId) => api.post(`/projects/requirements/${id}/links/`, { requirement_id: requirementId });
export const removeReqLink = (id, requirementId) => api.delete(`/projects/requirements/${id}/links/`, { data: { requirement_id: requirementId } });

// Grooming
export const getReqGrooming = (id) => api.get(`/projects/requirements/${id}/grooming/`);
export const uploadWireframe = (id, formData) => api.post(`/projects/requirements/${id}/grooming/wireframe/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const uploadStakeholder = (id, formData) => api.post(`/projects/requirements/${id}/grooming/stakeholder/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const submitTlComment = (id, comment) => api.post(`/projects/requirements/${id}/grooming/tl-comment/`, { comment });
export const submitPmComment = (id, comment) => api.post(`/projects/requirements/${id}/grooming/pm-comment/`, { comment });

// Bugs
export const getBugs = (params) => api.get('/projects/bugs/', { params });
export const createBug = (data) => api.post('/projects/bugs/', data);
export const updateBug = (id, data) => api.patch(`/projects/bugs/${id}/`, data);
export const deleteBug = (id) => api.delete(`/projects/bugs/${id}/`);

// Ideas
export const getIdeas = (params) => api.get('/projects/ideas/', { params });
export const createIdea = (data) => api.post('/projects/ideas/', data);
export const voteIdea = (id) => api.post(`/projects/ideas/${id}/vote/`);
export const deleteIdea = (id) => api.delete(`/projects/ideas/${id}/`);

// Activity
export const getActivity = () => api.get('/projects/activity/');

// Projects
export const getProjects = (params) => api.get('/projects/project-list/', { params });
export const createProject = (data) => api.post('/projects/project-list/', data);
export const updateProject = (id, data) => api.patch(`/projects/project-list/${id}/`, data);
export const deleteProject = (id) => api.delete(`/projects/project-list/${id}/`);

// Standups
export const getStandups = (params) => api.get('/projects/standups/', { params });
export const createStandup = (data) => api.post('/projects/standups/', data);
export const updateStandup = (id, data) => api.patch(`/projects/standups/${id}/`, data);
export const deleteStandup = (id) => api.delete(`/projects/standups/${id}/`);

// Scrum Master
export const getScrumDashboard = () => api.get('/projects/scrum-dashboard/');
export const pullReqToSprint = (reqId, sprintId) => api.post(`/projects/requirements/${reqId}/pull-to-sprint/`, { sprint_id: sprintId });
export const bulkPullToSprint = (requirementIds, sprintId) => api.post('/projects/requirements/bulk-pull-to-sprint/', { requirement_ids: requirementIds, sprint_id: sprintId });
export const getBreachedItems  = () => api.get('/projects/breached-items/');
export const notifyBreaches    = () => api.post('/projects/notify-breaches/', {});

// PM Work Log
export const getPMWork = (params) => api.get('/projects/pm-work/', { params });
export const createPMWork = (data) => api.post('/projects/pm-work/', data);
export const updatePMWork = (id, data) => api.patch(`/projects/pm-work/${id}/`, data);
export const deletePMWork = (id) => api.delete(`/projects/pm-work/${id}/`);
export const getPMWorkAttachments = (id) => api.get(`/projects/pm-work/${id}/attachments/`);
export const uploadPMWorkAttachment = (id, formData) => api.post(`/projects/pm-work/${id}/attachments/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deletePMWorkAttachment = (id, attId) => api.delete(`/projects/pm-work/${id}/attachments/${attId}/`);
export const getPMWorkComments = (id) => api.get(`/projects/pm-work/${id}/comments/`);
export const createPMWorkComment = (id, data) => api.post(`/projects/pm-work/${id}/comments/`, data);
export const deletePMWorkComment = (id, cId) => api.delete(`/projects/pm-work/${id}/comments/${cId}/`);
export const getPMWorkSummary = (params) => api.get('/projects/pm-work/summary/', { params });
export const getCTOMiniDashboard = () => api.get('/projects/cto-mini-dashboard/');

// Meetings
export const getMeetings      = (params) => api.get('/projects/meetings/', { params });
export const createMeeting    = (data)   => api.post('/projects/meetings/', data);
export const getMeeting       = (id)     => api.get(`/projects/meetings/${id}/`);
export const updateMeeting    = (id, data) => api.patch(`/projects/meetings/${id}/`, data);
export const deleteMeeting    = (id)     => api.delete(`/projects/meetings/${id}/`);

// Scrum Alerts
export const getScrumAlerts       = ()     => api.get('/projects/scrum-alerts/');
export const createScrumAlert     = (data) => api.post('/projects/scrum-alerts/', data);
export const getLatestScrumAlert  = ()     => api.get('/projects/scrum-alerts/latest/');
export const deactivateScrumAlert = (id)   => api.post(`/projects/scrum-alerts/${id}/deactivate/`, {});

// Notifications
export const getNotifications = () => api.get('/projects/notifications/');
export const createNotification = (data) => api.post('/projects/notifications/', data);
export const markNotificationRead = (id) => api.patch(`/projects/notifications/${id}/read/`, {});
export const markAllNotificationsRead = () => api.post('/projects/notifications/read-all/', {});
export const getUnreadCount = () => api.get('/projects/notifications/unread-count/');

// Epics
export const getEpics = (params) => api.get('/projects/epics/', { params });
export const createEpic = (data) => api.post('/projects/epics/', data);
export const updateEpic = (id, data) => api.patch(`/projects/epics/${id}/`, data);
export const deleteEpic = (id) => api.delete(`/projects/epics/${id}/`);

// Teams
export const getTeams = () => api.get('/projects/teams/');
export const getMyTeam = () => api.get('/projects/teams/my/');
export const getTeamStandups = (id, date) => api.get(`/projects/teams/${id}/standups/`, { params: date ? { date } : {} });

// Releases
export const getReleases = (params) => api.get('/projects/releases/', { params });
export const createRelease = (data) => api.post('/projects/releases/', data);
export const updateRelease = (id, data) => api.patch(`/projects/releases/${id}/`, data);
export const deleteRelease = (id) => api.delete(`/projects/releases/${id}/`);
export const addToRelease = (id, data) => api.post(`/projects/releases/${id}/items/`, data);
export const removeFromRelease = (id, itemId) => api.delete(`/projects/releases/${id}/items/${itemId}/`);
