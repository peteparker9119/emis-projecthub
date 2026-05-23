from rest_framework import serializers
from .models import Sprint, Task, Requirement, RequirementGrooming, Bug, Idea, Activity, Project, RequirementComment, WorkLog, RequirementAttachment, Standup, Notification, PMWorkEntry, PMWorkEntryAttachment, PMWorkEntryComment, Meeting, ScrumAlert, Epic, Release, ReleaseItem


class SprintSerializer(serializers.ModelSerializer):
    task_count = serializers.SerializerMethodField()
    done_count = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Sprint
        fields = [
            'id', 'name', 'start_date', 'end_date', 'goal',
            'capacity', 'velocity', 'status',
            'task_count', 'done_count', 'progress',
        ]

    def get_task_count(self, obj):
        return obj.tasks.count() + obj.requirements.count() + obj.bugs.count()

    def get_done_count(self, obj):
        tasks_done = obj.tasks.filter(status='Done').count()
        reqs_done = obj.requirements.filter(status='Done').count()
        bugs_done = obj.bugs.filter(status__in=['Fixed', 'Closed']).count()
        return tasks_done + reqs_done + bugs_done

    def get_progress(self, obj):
        total = self.get_task_count(obj)
        if total == 0:
            return 0
        done = self.get_done_count(obj)
        return round((done / total) * 100)


class TaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.SerializerMethodField()
    sprint_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'priority', 'status',
            'assignee', 'assignee_name',
            'sprint', 'sprint_name',
            'description', 'created_at',
        ]

    def get_assignee_name(self, obj):
        if obj.assignee:
            return obj.assignee.name
        return None

    def get_sprint_name(self, obj):
        if obj.sprint:
            return obj.sprint.name
        return None


class RequirementSerializer(serializers.ModelSerializer):
    assignee_name = serializers.SerializerMethodField()
    sprint_name = serializers.SerializerMethodField()
    parent_id = serializers.SerializerMethodField()
    parent_title = serializers.SerializerMethodField()
    children_count = serializers.SerializerMethodField()
    total_logged_hours = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    attachment_count = serializers.SerializerMethodField()
    grooming_status = serializers.SerializerMethodField()
    timer_status = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    epic_title = serializers.SerializerMethodField()

    class Meta:
        model = Requirement
        fields = [
            'id', 'title', 'item_type', 'priority', 'status',
            'assignee', 'assignee_name',
            'sprint', 'sprint_name',
            'description', 'department',
            'epic', 'epic_title',
            'parent', 'parent_id', 'parent_title',
            'start_date', 'end_date', 'story_points', 'breach_notified',
            'timer_status', 'days_remaining',
            'children_count', 'total_logged_hours', 'comment_count', 'attachment_count',
            'grooming_status', 'created_at',
        ]

    def get_assignee_name(self, obj):
        return obj.assignee.name if obj.assignee else None

    def get_sprint_name(self, obj):
        return obj.sprint.name if obj.sprint else None

    def get_parent_id(self, obj):
        return obj.parent_id

    def get_parent_title(self, obj):
        return obj.parent.title if obj.parent else None

    def get_children_count(self, obj):
        return obj.children.count()

    def get_total_logged_hours(self, obj):
        from django.db.models import Sum
        result = obj.worklogs.aggregate(total=Sum('hours'))['total']
        return float(result) if result else 0.0

    def get_comment_count(self, obj):
        return obj.comments.count()

    def get_attachment_count(self, obj):
        return obj.attachments.count()

    def get_grooming_status(self, obj):
        try:
            return obj.grooming.status
        except Exception:
            return 'pending'

    def get_timer_status(self, obj):
        from datetime import date
        if obj.status == 'Done':
            return 'done'
        if not obj.start_date or not obj.end_date:
            return 'pending'
        today = date.today()
        if today > obj.end_date:
            return 'breached'
        total_days = (obj.end_date - obj.start_date).days or 1
        remaining = (obj.end_date - today).days
        if remaining <= 1 or (remaining / total_days) <= 0.2:
            return 'at_risk'
        return 'on_track'

    def get_days_remaining(self, obj):
        from datetime import date
        if not obj.end_date:
            return None
        return (obj.end_date - date.today()).days

    def get_epic_title(self, obj):
        return obj.epic.title if obj.epic else None


class EpicSerializer(serializers.ModelSerializer):
    created_by_name   = serializers.SerializerMethodField()
    project_name      = serializers.SerializerMethodField()
    requirement_count = serializers.SerializerMethodField()

    class Meta:
        model = Epic
        fields = ['id','title','description','status','priority','project','project_name',
                  'created_by','created_by_name','start_date','end_date','created_at','requirement_count']
        read_only_fields = ['id','created_at']

    def get_created_by_name(self, obj): return obj.created_by.name if obj.created_by else None
    def get_project_name(self, obj): return obj.project.name if obj.project else None
    def get_requirement_count(self, obj): return obj.requirements.count()


class ReleaseItemSerializer(serializers.ModelSerializer):
    req_title  = serializers.SerializerMethodField()
    req_type   = serializers.SerializerMethodField()
    req_status = serializers.SerializerMethodField()
    added_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ReleaseItem
        fields = ['id','release','requirement','req_title','req_type','req_status','added_by','added_by_name','notes','added_at']
        read_only_fields = ['id','added_at']

    def get_req_title(self, obj): return obj.requirement.title
    def get_req_type(self, obj): return obj.requirement.item_type
    def get_req_status(self, obj): return obj.requirement.status
    def get_added_by_name(self, obj): return obj.added_by.name if obj.added_by else None


class ReleaseSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    sprint_name     = serializers.SerializerMethodField()
    item_count      = serializers.SerializerMethodField()
    items           = ReleaseItemSerializer(many=True, read_only=True)

    class Meta:
        model = Release
        fields = ['id','name','version','sprint','sprint_name','description','status',
                  'created_by','created_by_name','released_at','created_at','item_count','items']
        read_only_fields = ['id','created_at']

    def get_created_by_name(self, obj): return obj.created_by.name if obj.created_by else None
    def get_sprint_name(self, obj): return obj.sprint.name if obj.sprint else None
    def get_item_count(self, obj): return obj.items.count()


class RequirementGroomingSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    wireframe_file_url = serializers.SerializerMethodField()
    stakeholder_file_url = serializers.SerializerMethodField()
    wireframe_signed_by_name = serializers.SerializerMethodField()
    stakeholder_signed_by_name = serializers.SerializerMethodField()
    tl_commented_by_name = serializers.SerializerMethodField()
    pm_commented_by_name = serializers.SerializerMethodField()

    class Meta:
        model = RequirementGrooming
        fields = [
            'id', 'requirement',
            'wireframe_file', 'wireframe_file_url', 'wireframe_filename',
            'wireframe_signed_by', 'wireframe_signed_by_name', 'wireframe_signed_at',
            'stakeholder_file', 'stakeholder_file_url', 'stakeholder_filename',
            'stakeholder_signed_by', 'stakeholder_signed_by_name', 'stakeholder_signed_at',
            'tl_comment', 'tl_commented_by', 'tl_commented_by_name', 'tl_commented_at',
            'pm_comment', 'pm_commented_by', 'pm_commented_by_name', 'pm_commented_at',
            'status', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_status(self, obj): return obj.status

    def get_wireframe_file_url(self, obj):
        if obj.wireframe_file:
            req = self.context.get('request')
            return req.build_absolute_uri(obj.wireframe_file.url) if req else str(obj.wireframe_file.url)
        return None

    def get_stakeholder_file_url(self, obj):
        if obj.stakeholder_file:
            req = self.context.get('request')
            return req.build_absolute_uri(obj.stakeholder_file.url) if req else str(obj.stakeholder_file.url)
        return None

    def get_wireframe_signed_by_name(self, obj): return obj.wireframe_signed_by.name if obj.wireframe_signed_by else None
    def get_stakeholder_signed_by_name(self, obj): return obj.stakeholder_signed_by.name if obj.stakeholder_signed_by else None
    def get_tl_commented_by_name(self, obj): return obj.tl_commented_by.name if obj.tl_commented_by else None
    def get_pm_commented_by_name(self, obj): return obj.pm_commented_by.name if obj.pm_commented_by else None


class RequirementCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_initials = serializers.SerializerMethodField()

    class Meta:
        model = RequirementComment
        fields = ['id', 'requirement', 'author', 'author_name', 'author_initials', 'text', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_author_name(self, obj):
        return obj.author.name if obj.author else 'Unknown'

    def get_author_initials(self, obj):
        if obj.author and obj.author.name:
            parts = obj.author.name.split()
            return ''.join(p[0] for p in parts[:2]).upper()
        return '??'


class WorkLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = WorkLog
        fields = ['id', 'requirement', 'user', 'user_name', 'hours', 'date', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_user_name(self, obj):
        return obj.user.name if obj.user else 'Unknown'


class RequirementAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = RequirementAttachment
        fields = ['id', 'requirement', 'file', 'file_url', 'filename', 'uploaded_by', 'uploaded_by_name', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.name if obj.uploaded_by else 'Unknown'

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None


class StandupSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_initials = serializers.SerializerMethodField()
    sprint_name = serializers.SerializerMethodField()

    class Meta:
        model = Standup
        fields = [
            'id', 'user', 'user_name', 'user_initials',
            'sprint', 'sprint_name',
            'date', 'yesterday', 'today', 'blockers',
            'submitted_at', 'updated_at',
        ]
        read_only_fields = ['id', 'submitted_at', 'updated_at']

    def get_user_name(self, obj): return obj.user.name if obj.user else None
    def get_user_initials(self, obj): return obj.user.initials() if obj.user else '??'
    def get_sprint_name(self, obj): return obj.sprint.name if obj.sprint else None


class NotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_initials = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'sender', 'sender_name', 'sender_initials',
            'title', 'message', 'item_type', 'item_id', 'is_read', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_sender_name(self, obj): return obj.sender.name if obj.sender else 'System'
    def get_sender_initials(self, obj): return obj.sender.initials() if obj.sender else 'SY'


class PMWorkEntryCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_initials = serializers.SerializerMethodField()

    class Meta:
        model = PMWorkEntryComment
        fields = ['id', 'entry', 'author', 'author_name', 'author_initials', 'text', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_author_name(self, obj): return obj.author.name if obj.author else 'Unknown'
    def get_author_initials(self, obj):
        if obj.author:
            parts = obj.author.name.split()
            return ''.join(p[0] for p in parts[:2]).upper()
        return '??'


class PMWorkEntryAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PMWorkEntryAttachment
        fields = ['id', 'entry', 'file', 'file_url', 'filename', 'uploaded_by', 'uploaded_by_name', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_file_url(self, obj):
        if obj.file:
            req = self.context.get('request')
            return req.build_absolute_uri(obj.file.url) if req else str(obj.file.url)
        return None

    def get_uploaded_by_name(self, obj): return obj.uploaded_by.name if obj.uploaded_by else 'Unknown'


class PMWorkEntrySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_initials = serializers.SerializerMethodField()
    attachment_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    attachments = PMWorkEntryAttachmentSerializer(many=True, read_only=True)
    comments = PMWorkEntryCommentSerializer(many=True, read_only=True)

    class Meta:
        model = PMWorkEntry
        fields = [
            'id', 'user', 'user_name', 'user_initials',
            'date', 'category', 'title', 'description', 'hours',
            'attachment_count', 'comment_count',
            'attachments', 'comments',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_user_name(self, obj): return obj.user.name if obj.user else None
    def get_user_initials(self, obj): return obj.user.initials() if obj.user else '??'
    def get_attachment_count(self, obj): return obj.attachments.count()
    def get_comment_count(self, obj): return obj.comments.count()


class BugSerializer(serializers.ModelSerializer):
    assignee_name = serializers.SerializerMethodField()
    sprint_name = serializers.SerializerMethodField()

    class Meta:
        model = Bug
        fields = [
            'id', 'title', 'priority', 'status',
            'assignee', 'assignee_name',
            'sprint', 'sprint_name',
            'description', 'bug_type', 'created_at',
        ]

    def get_assignee_name(self, obj):
        if obj.assignee:
            return obj.assignee.name
        return None

    def get_sprint_name(self, obj):
        if obj.sprint:
            return obj.sprint.name
        return None


class IdeaSerializer(serializers.ModelSerializer):
    submitted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Idea
        fields = [
            'id', 'title', 'votes', 'status',
            'submitted_by', 'submitted_by_name',
            'description', 'created_at',
        ]

    def get_submitted_by_name(self, obj):
        if obj.submitted_by:
            return obj.submitted_by.name
        return None


class ActivitySerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = ['id', 'text', 'icon', 'created_at', 'created_by', 'created_by_name']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.name
        return None


class MeetingSerializer(serializers.ModelSerializer):
    created_by_name     = serializers.SerializerMethodField()
    created_by_initials = serializers.SerializerMethodField()
    attendee_ids        = serializers.SerializerMethodField()
    attendee_names      = serializers.SerializerMethodField()
    attendee_count      = serializers.SerializerMethodField()

    class Meta:
        model  = Meeting
        fields = [
            'id', 'title', 'meeting_type', 'color',
            'start_datetime', 'end_datetime',
            'description', 'location',
            'created_by', 'created_by_name', 'created_by_initials',
            'attendees', 'attendee_ids', 'attendee_names', 'attendee_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):     return obj.created_by.name if obj.created_by else None
    def get_created_by_initials(self, obj): return obj.created_by.initials() if obj.created_by else '??'
    def get_attendee_ids(self, obj):        return list(obj.attendees.values_list('id', flat=True))
    def get_attendee_names(self, obj):      return list(obj.attendees.values_list('name', flat=True))
    def get_attendee_count(self, obj):      return obj.attendees.count()


class ScrumAlertSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = ScrumAlert
        fields = ['id', 'created_by', 'created_by_name', 'alert_type', 'message', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_created_by_name(self, obj): return obj.created_by.name if obj.created_by else None


class ProjectSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    sprint_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'status', 'color',
            'start_date', 'end_date',
            'owner', 'owner_name', 'team_number',
            'task_count', 'sprint_count', 'created_at',
        ]

    def get_owner_name(self, obj):
        return obj.owner.name if obj.owner else None

    def get_task_count(self, obj):
        return 0  # extend later when tasks link to projects

    def get_sprint_count(self, obj):
        return 0  # extend later when sprints link to projects
