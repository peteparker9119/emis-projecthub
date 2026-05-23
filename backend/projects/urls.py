from django.urls import path
from . import views

urlpatterns = [
    # Sprints
    path('sprints/', views.sprint_list, name='sprint-list'),
    path('sprints/<str:pk>/', views.sprint_detail, name='sprint-detail'),

    # Tasks
    path('tasks/', views.task_list, name='task-list'),
    path('tasks/<str:pk>/', views.task_detail, name='task-detail'),

    # Requirements — static paths MUST come before <str:pk>/ wildcard
    path('requirements/', views.requirement_list, name='requirement-list'),
    path('requirements/bulk-pull-to-sprint/', views.req_bulk_pull_to_sprint, name='req-bulk-pull-to-sprint'),
    path('requirements/<str:pk>/', views.requirement_detail, name='requirement-detail'),
    path('requirements/<str:pk>/children/', views.req_children, name='req-children'),
    path('requirements/<str:pk>/comments/', views.req_comments, name='req-comments'),
    path('requirements/<str:pk>/comments/<int:comment_id>/', views.req_comment_detail, name='req-comment-detail'),
    path('requirements/<str:pk>/worklogs/', views.req_worklogs, name='req-worklogs'),
    path('requirements/<str:pk>/worklogs/<int:log_id>/', views.req_worklog_detail, name='req-worklog-detail'),
    path('requirements/<str:pk>/attachments/', views.req_attachments, name='req-attachments'),
    path('requirements/<str:pk>/attachments/<int:att_id>/', views.req_attachment_detail, name='req-attachment-detail'),
    path('requirements/<str:pk>/links/', views.req_links, name='req-links'),
    path('requirements/<str:pk>/grooming/', views.req_grooming, name='req-grooming'),
    path('requirements/<str:pk>/grooming/wireframe/', views.req_grooming_wireframe, name='req-grooming-wireframe'),
    path('requirements/<str:pk>/grooming/stakeholder/', views.req_grooming_stakeholder, name='req-grooming-stakeholder'),
    path('requirements/<str:pk>/grooming/tl-comment/', views.req_grooming_tl_comment, name='req-grooming-tl-comment'),
    path('requirements/<str:pk>/grooming/pm-comment/', views.req_grooming_pm_comment, name='req-grooming-pm-comment'),
    path('requirements/<str:pk>/pull-to-sprint/', views.req_pull_to_sprint, name='req-pull-to-sprint'),

    # Bugs
    path('bugs/', views.bug_list, name='bug-list'),
    path('bugs/<str:pk>/', views.bug_detail, name='bug-detail'),

    # Ideas
    path('ideas/', views.idea_list, name='idea-list'),
    path('ideas/<str:pk>/', views.idea_detail, name='idea-detail'),
    path('ideas/<str:pk>/vote/', views.idea_vote, name='idea-vote'),

    # Projects
    path('project-list/', views.project_list, name='project-list'),
    path('project-list/<str:pk>/', views.project_detail, name='project-detail'),

    # Activity
    path('activity/', views.activity_list, name='activity-list'),

    # Dashboard
    path('dashboard/', views.dashboard, name='dashboard'),

    # Standups
    path('standups/', views.standup_list, name='standup-list'),
    path('standups/<int:pk>/', views.standup_detail, name='standup-detail'),

    # Scrum Master Dashboard
    path('scrum-dashboard/', views.scrum_dashboard, name='scrum-dashboard'),

    # Breached items
    path('breached-items/', views.breached_items, name='breached-items'),
    path('notify-breaches/', views.notify_breaches, name='notify-breaches'),

    # PM Work Log
    path('pm-work/', views.pm_work_list, name='pm-work-list'),
    path('pm-work/summary/', views.pm_work_summary, name='pm-work-summary'),
    path('pm-work/<int:pk>/', views.pm_work_detail, name='pm-work-detail'),
    path('pm-work/<int:pk>/attachments/', views.pm_work_attachments, name='pm-work-attachments'),
    path('pm-work/<int:pk>/attachments/<int:att_id>/', views.pm_work_attachment_detail, name='pm-work-att-detail'),
    path('pm-work/<int:pk>/comments/', views.pm_work_comments, name='pm-work-comments'),
    path('pm-work/<int:pk>/comments/<int:comment_id>/', views.pm_work_comment_detail, name='pm-work-comment-detail'),

    # Meetings
    path('meetings/',              views.meeting_list,           name='meeting-list'),
    path('meetings/<str:pk>/',     views.meeting_detail,         name='meeting-detail'),

    # Scrum Alerts
    path('scrum-alerts/',                     views.scrum_alert_list,       name='scrum-alert-list'),
    path('scrum-alerts/latest/',              views.scrum_alert_latest,     name='scrum-alert-latest'),
    path('scrum-alerts/<int:pk>/deactivate/', views.scrum_alert_deactivate, name='scrum-alert-deactivate'),

    # Notifications
    path('notifications/', views.notification_list, name='notification-list'),
    path('notifications/<int:pk>/read/', views.notification_read, name='notification-read'),
    path('notifications/read-all/', views.notification_read_all, name='notification-read-all'),
    path('notifications/unread-count/', views.notification_unread_count, name='notification-unread-count'),

    # Epics
    path('epics/', views.epic_list, name='epic-list'),
    path('epics/<str:pk>/', views.epic_detail, name='epic-detail'),

    # Releases
    path('releases/', views.release_list, name='release-list'),
    path('releases/<str:pk>/', views.release_detail, name='release-detail'),
    path('releases/<str:pk>/items/', views.release_add_item, name='release-add-item'),
    path('releases/<str:pk>/items/<int:item_id>/', views.release_remove_item, name='release-remove-item'),
]
