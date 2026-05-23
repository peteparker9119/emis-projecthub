from django.contrib import admin
from .models import Sprint, Task, Requirement, Bug, Idea, Activity


@admin.register(Sprint)
class SprintAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'status', 'start_date', 'end_date', 'capacity', 'velocity']
    list_filter = ['status']
    search_fields = ['name', 'goal']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'priority', 'status', 'assignee', 'sprint']
    list_filter = ['status', 'priority', 'sprint']
    search_fields = ['title', 'description']


@admin.register(Requirement)
class RequirementAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'priority', 'status', 'assignee', 'sprint']
    list_filter = ['status', 'priority', 'sprint']
    search_fields = ['title', 'description']


@admin.register(Bug)
class BugAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'priority', 'status', 'bug_type', 'assignee', 'sprint']
    list_filter = ['status', 'priority', 'bug_type', 'sprint']
    search_fields = ['title', 'description']


@admin.register(Idea)
class IdeaAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'votes', 'status', 'submitted_by']
    list_filter = ['status']
    search_fields = ['title', 'description']


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['id', 'text', 'icon', 'created_by', 'created_at']
    search_fields = ['text']
