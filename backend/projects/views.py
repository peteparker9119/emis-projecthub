from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import User
from .models import Sprint, Task, Requirement, RequirementGrooming, Bug, Idea, Activity, Project, RequirementComment, WorkLog, RequirementAttachment, Standup, Notification, PMWorkEntry, PMWorkEntryAttachment, PMWorkEntryComment, Meeting, ScrumAlert, Epic, Release, ReleaseItem, Team
from .utils import notify_mentions, notify_assignee_change
from .serializers import (
    SprintSerializer, TaskSerializer, RequirementSerializer, RequirementGroomingSerializer,
    BugSerializer, IdeaSerializer, ActivitySerializer, ProjectSerializer,
    RequirementCommentSerializer, WorkLogSerializer, RequirementAttachmentSerializer,
    StandupSerializer, NotificationSerializer,
    PMWorkEntrySerializer, PMWorkEntryAttachmentSerializer, PMWorkEntryCommentSerializer,
    MeetingSerializer, ScrumAlertSerializer, EpicSerializer, ReleaseSerializer, ReleaseItemSerializer,
    TeamSerializer,
)


# ---------------------------------------------------------------------------
# Sprints
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sprint_list(request):
    if request.method == 'GET':
        qs = Sprint.objects.all()
        search = request.query_params.get('search', '')
        status_filter = request.query_params.get('status', '')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(goal__icontains=search))
        if status_filter:
            qs = qs.filter(status=status_filter)
        serializer = SprintSerializer(qs, many=True)
        return Response(serializer.data)

    serializer = SprintSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def sprint_detail(request, pk):
    try:
        sprint = Sprint.objects.get(pk=pk)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = SprintSerializer(sprint)
        return Response(serializer.data)

    if request.method == 'PATCH':
        serializer = SprintSerializer(sprint, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    sprint.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sprint_close_check(request, pk):
    """
    Pre-close validation. Returns can_close=True only when every item in the
    sprint is in a terminal state.  If not, returns a full breakdown of pending
    items grouped by assignee (with team) so the SM knows exactly who is
    blocking closure.
    """
    try:
        sprint = Sprint.objects.get(pk=pk)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=status.HTTP_404_NOT_FOUND)

    DONE_REQ   = {'Done'}
    DONE_TASK  = {'Done'}
    DONE_BUG   = {'Fixed', 'Closed'}

    pending = []

    for r in Requirement.objects.filter(sprint=sprint).select_related('assignee'):
        if r.status not in DONE_REQ:
            pending.append({
                'id': r.id, 'title': r.title, 'type': 'Requirement',
                'item_type': r.item_type, 'status': r.status,
                'priority': r.priority,
                'assignee_id':   r.assignee_id,
                'assignee_name': r.assignee.name if r.assignee else 'Unassigned',
                'team':          r.assignee.team if r.assignee else '',
            })

    for t in Task.objects.filter(sprint=sprint).select_related('assignee'):
        if t.status not in DONE_TASK:
            pending.append({
                'id': t.id, 'title': t.title, 'type': 'Task',
                'item_type': 'Task', 'status': t.status,
                'priority': t.priority,
                'assignee_id':   t.assignee_id,
                'assignee_name': t.assignee.name if t.assignee else 'Unassigned',
                'team':          t.assignee.team if t.assignee else '',
            })

    for b in Bug.objects.filter(sprint=sprint).select_related('assignee'):
        if b.status not in DONE_BUG:
            pending.append({
                'id': b.id, 'title': b.title, 'type': 'Bug',
                'item_type': 'Bug', 'status': b.status,
                'priority': b.priority,
                'assignee_id':   b.assignee_id,
                'assignee_name': b.assignee.name if b.assignee else 'Unassigned',
                'team':          b.assignee.team if b.assignee else '',
            })

    if not pending:
        return Response({'can_close': True, 'pending_count': 0, 'pending_items': [], 'by_assignee': [], 'by_team': []})

    # Group by assignee
    assignee_map = {}
    for item in pending:
        key = item['assignee_id'] or 'unassigned'
        if key not in assignee_map:
            assignee_map[key] = {
                'assignee_id':   item['assignee_id'],
                'assignee_name': item['assignee_name'],
                'team':          item['team'],
                'count':         0,
                'items':         [],
            }
        assignee_map[key]['count'] += 1
        assignee_map[key]['items'].append(item)

    # Group by team
    team_map = {}
    for item in pending:
        team = item['team'] or 'No Team'
        if team not in team_map:
            team_map[team] = {'team': team, 'count': 0, 'members': set()}
        team_map[team]['count'] += 1
        team_map[team]['members'].add(item['assignee_name'])

    by_team = [
        {'team': t['team'], 'count': t['count'], 'members': sorted(t['members'])}
        for t in team_map.values()
    ]

    return Response({
        'can_close':     False,
        'pending_count': len(pending),
        'sprint_id':     sprint.id,
        'sprint_name':   sprint.name,
        'pending_items': pending,
        'by_assignee':   sorted(assignee_map.values(), key=lambda x: -x['count']),
        'by_team':       sorted(by_team, key=lambda x: -x['count']),
    })


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def task_list(request):
    if request.method == 'GET':
        qs = Task.objects.select_related('assignee', 'sprint').all()
        search = request.query_params.get('search', '')
        status_filter = request.query_params.get('status', '')
        priority_filter = request.query_params.get('priority', '')
        sprint_filter = request.query_params.get('sprint', '')
        assignee_filter = request.query_params.get('assignee', '')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
        if status_filter:
            qs = qs.filter(status=status_filter)
        if priority_filter:
            qs = qs.filter(priority=priority_filter)
        if sprint_filter:
            qs = qs.filter(sprint__id=sprint_filter)
        if assignee_filter:
            qs = qs.filter(assignee__id=assignee_filter)
        serializer = TaskSerializer(qs, many=True)
        return Response(serializer.data)

    serializer = TaskSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def task_detail(request, pk):
    try:
        task = Task.objects.select_related('assignee', 'sprint').get(pk=pk)
    except Task.DoesNotExist:
        return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(TaskSerializer(task).data)

    if request.method == 'PATCH':
        prev_assignee_id = task.assignee_id
        serializer = TaskSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            new_assignee_id = request.data.get('assignee')
            if new_assignee_id and str(new_assignee_id) != str(prev_assignee_id):
                try:
                    assignee = User.objects.get(pk=new_assignee_id)
                    notify_assignee_change('task', updated.id, updated.title, assignee, request.user)
                except User.DoesNotExist:
                    pass
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    task.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Requirements
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def requirement_list(request):
    if request.method == 'GET':
        qs = Requirement.objects.select_related('assignee', 'sprint').all()
        search = request.query_params.get('search', '')
        status_filter = request.query_params.get('status', '')
        priority_filter = request.query_params.get('priority', '')
        sprint_filter = request.query_params.get('sprint', '')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
        if status_filter:
            qs = qs.filter(status=status_filter)
        if priority_filter:
            qs = qs.filter(priority=priority_filter)
        if sprint_filter:
            qs = qs.filter(sprint__id=sprint_filter)
        serializer = RequirementSerializer(qs, many=True)
        return Response(serializer.data)

    serializer = RequirementSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def requirement_detail(request, pk):
    try:
        req = Requirement.objects.select_related('assignee', 'sprint', 'parent').get(pk=pk)
    except Requirement.DoesNotExist:
        return Response({'error': 'Requirement not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(RequirementSerializer(req).data)

    if request.method == 'PATCH':
        # SM-only gate: only Scrum Masters can assign a requirement to a sprint (backlog pull-in)
        incoming_sprint = request.data.get('sprint')
        if incoming_sprint and not req.sprint_id:
            if getattr(request.user, 'role', '') != 'Scrum Master':
                return Response(
                    {'error': 'Only Scrum Masters can pull requirements into sprints'},
                    status=status.HTTP_403_FORBIDDEN
                )
        prev_assignee_id = req.assignee_id
        serializer = RequirementSerializer(req, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            # Notify new assignee if assignee changed
            new_assignee_id = request.data.get('assignee')
            if new_assignee_id and str(new_assignee_id) != str(prev_assignee_id):
                try:
                    assignee = User.objects.get(pk=new_assignee_id)
                    notify_assignee_change('requirement', updated.id, updated.title, assignee, request.user)
                except User.DoesNotExist:
                    pass
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    req.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Requirement sub-items (children)
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def req_children(request, pk):
    try:
        req = Requirement.objects.get(pk=pk)
    except Requirement.DoesNotExist:
        return Response({'error': 'Requirement not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        children = req.children.select_related('assignee', 'sprint').all()
        return Response(RequirementSerializer(children, many=True).data)

    # POST — create a child requirement
    data = request.data.copy()
    data['parent'] = pk
    serializer = RequirementSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Requirement comments
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def req_comments(request, pk):
    try:
        req = Requirement.objects.get(pk=pk)
    except Requirement.DoesNotExist:
        return Response({'error': 'Requirement not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        comments = req.comments.select_related('author').all()
        return Response(RequirementCommentSerializer(comments, many=True, context={'request': request}).data)

    data = request.data.copy()
    data['requirement'] = pk
    if not data.get('author'):
        data['author'] = request.user.id
    serializer = RequirementCommentSerializer(data=data)
    if serializer.is_valid():
        comment = serializer.save()
        # Notify @mentioned users
        notify_mentions(
            text=comment.text,
            sender=request.user,
            item_type='requirement',
            item_id=pk,
            context_label=f'Requirement — {req.title}',
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def req_comment_detail(request, pk, comment_id):
    try:
        comment = RequirementComment.objects.get(pk=comment_id, requirement_id=pk)
    except RequirementComment.DoesNotExist:
        return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        serializer = RequirementCommentSerializer(comment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    comment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Requirement work logs
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def req_worklogs(request, pk):
    try:
        req = Requirement.objects.get(pk=pk)
    except Requirement.DoesNotExist:
        return Response({'error': 'Requirement not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        logs = req.worklogs.select_related('user').all()
        return Response(WorkLogSerializer(logs, many=True).data)

    data = request.data.copy()
    data['requirement'] = pk
    if not data.get('user'):
        data['user'] = request.user.id
    serializer = WorkLogSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def req_worklog_detail(request, pk, log_id):
    try:
        log = WorkLog.objects.get(pk=log_id, requirement_id=pk)
    except WorkLog.DoesNotExist:
        return Response({'error': 'Work log not found'}, status=status.HTTP_404_NOT_FOUND)
    log.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Requirement attachments
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def req_attachments(request, pk):
    try:
        req = Requirement.objects.get(pk=pk)
    except Requirement.DoesNotExist:
        return Response({'error': 'Requirement not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        attachments = req.attachments.select_related('uploaded_by').all()
        return Response(RequirementAttachmentSerializer(attachments, many=True, context={'request': request}).data)

    data = request.data.copy()
    data['requirement'] = pk
    if not data.get('uploaded_by'):
        data['uploaded_by'] = request.user.id
    if not data.get('filename') and 'file' in request.FILES:
        data['filename'] = request.FILES['file'].name
    serializer = RequirementAttachmentSerializer(data=data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def req_attachment_detail(request, pk, att_id):
    try:
        att = RequirementAttachment.objects.get(pk=att_id, requirement_id=pk)
    except RequirementAttachment.DoesNotExist:
        return Response({'error': 'Attachment not found'}, status=status.HTTP_404_NOT_FOUND)
    att.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Requirement links (linked_requirements)
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def req_links(request, pk):
    try:
        req = Requirement.objects.get(pk=pk)
    except Requirement.DoesNotExist:
        return Response({'error': 'Requirement not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        linked = req.linked_requirements.select_related('assignee', 'sprint').all()
        return Response(RequirementSerializer(linked, many=True).data)

    target_id = request.data.get('requirement_id')
    if not target_id:
        return Response({'error': 'requirement_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        target = Requirement.objects.get(pk=target_id)
    except Requirement.DoesNotExist:
        return Response({'error': 'Target requirement not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'POST':
        req.linked_requirements.add(target)
        return Response({'status': 'linked'})

    req.linked_requirements.remove(target)
    return Response({'status': 'unlinked'})


# ---------------------------------------------------------------------------
# Requirement Grooming
# ---------------------------------------------------------------------------

def _get_or_create_grooming(pk):
    req = Requirement.objects.get(pk=pk)
    grooming, _ = RequirementGrooming.objects.get_or_create(requirement=req)
    return grooming


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def req_grooming(request, pk):
    try:
        grooming = _get_or_create_grooming(pk)
    except Requirement.DoesNotExist:
        return Response({'error': 'Requirement not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(RequirementGroomingSerializer(grooming, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def req_grooming_wireframe(request, pk):
    try:
        grooming = _get_or_create_grooming(pk)
    except Requirement.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    if 'file' not in request.FILES:
        return Response({'error': 'file required'}, status=status.HTTP_400_BAD_REQUEST)
    f = request.FILES['file']
    grooming.wireframe_file = f
    grooming.wireframe_filename = f.name
    grooming.wireframe_signed_by = request.user
    grooming.wireframe_signed_at = timezone.now()
    grooming.save()
    return Response(RequirementGroomingSerializer(grooming, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def req_grooming_stakeholder(request, pk):
    try:
        grooming = _get_or_create_grooming(pk)
    except Requirement.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    if 'file' not in request.FILES:
        return Response({'error': 'file required'}, status=status.HTTP_400_BAD_REQUEST)
    f = request.FILES['file']
    grooming.stakeholder_file = f
    grooming.stakeholder_filename = f.name
    grooming.stakeholder_signed_by = request.user
    grooming.stakeholder_signed_at = timezone.now()
    grooming.save()
    return Response(RequirementGroomingSerializer(grooming, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def req_grooming_tl_comment(request, pk):
    try:
        grooming = _get_or_create_grooming(pk)
    except Requirement.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    if not grooming.wireframe_signed_by or not grooming.stakeholder_signed_by:
        return Response({'error': 'Both attachments must be signed off first'}, status=status.HTTP_400_BAD_REQUEST)
    comment = request.data.get('comment', '').strip()
    if not comment:
        return Response({'error': 'comment required'}, status=status.HTTP_400_BAD_REQUEST)
    grooming.tl_comment = comment
    grooming.tl_commented_by = request.user
    grooming.tl_commented_at = timezone.now()
    grooming.save()
    return Response(RequirementGroomingSerializer(grooming, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def req_grooming_pm_comment(request, pk):
    try:
        grooming = _get_or_create_grooming(pk)
    except Requirement.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    if not grooming.tl_comment:
        return Response({'error': 'TL must comment first'}, status=status.HTTP_400_BAD_REQUEST)
    comment = request.data.get('comment', '').strip()
    if not comment:
        return Response({'error': 'comment required'}, status=status.HTTP_400_BAD_REQUEST)
    grooming.pm_comment = comment
    grooming.pm_commented_by = request.user
    grooming.pm_commented_at = timezone.now()
    grooming.save()
    return Response(RequirementGroomingSerializer(grooming, context={'request': request}).data)


# ---------------------------------------------------------------------------
# Bugs
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def bug_list(request):
    if request.method == 'GET':
        qs = Bug.objects.select_related('assignee', 'sprint').all()
        search = request.query_params.get('search', '')
        status_filter = request.query_params.get('status', '')
        priority_filter = request.query_params.get('priority', '')
        bug_type_filter = request.query_params.get('bug_type', '')
        sprint_filter = request.query_params.get('sprint', '')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
        if status_filter:
            qs = qs.filter(status=status_filter)
        if priority_filter:
            qs = qs.filter(priority=priority_filter)
        if bug_type_filter:
            qs = qs.filter(bug_type=bug_type_filter)
        if sprint_filter:
            qs = qs.filter(sprint__id=sprint_filter)
        serializer = BugSerializer(qs, many=True)
        return Response(serializer.data)

    serializer = BugSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def bug_detail(request, pk):
    try:
        bug = Bug.objects.select_related('assignee', 'sprint').get(pk=pk)
    except Bug.DoesNotExist:
        return Response({'error': 'Bug not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(BugSerializer(bug).data)

    if request.method == 'PATCH':
        prev_assignee_id = bug.assignee_id
        serializer = BugSerializer(bug, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            new_assignee_id = request.data.get('assignee')
            if new_assignee_id and str(new_assignee_id) != str(prev_assignee_id):
                try:
                    assignee = User.objects.get(pk=new_assignee_id)
                    notify_assignee_change('bug', updated.id, updated.title, assignee, request.user)
                except User.DoesNotExist:
                    pass
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    bug.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Ideas
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def idea_list(request):
    if request.method == 'GET':
        qs = Idea.objects.select_related('submitted_by').all()
        search = request.query_params.get('search', '')
        status_filter = request.query_params.get('status', '')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
        if status_filter:
            qs = qs.filter(status=status_filter)
        serializer = IdeaSerializer(qs, many=True)
        return Response(serializer.data)

    serializer = IdeaSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def idea_detail(request, pk):
    try:
        idea = Idea.objects.select_related('submitted_by').get(pk=pk)
    except Idea.DoesNotExist:
        return Response({'error': 'Idea not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(IdeaSerializer(idea).data)

    if request.method == 'PATCH':
        serializer = IdeaSerializer(idea, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    idea.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def idea_vote(request, pk):
    try:
        idea = Idea.objects.get(pk=pk)
    except Idea.DoesNotExist:
        return Response({'error': 'Idea not found'}, status=status.HTTP_404_NOT_FOUND)
    idea.votes = (idea.votes or 0) + 1
    idea.save(update_fields=['votes'])
    return Response({'votes': idea.votes})


# ---------------------------------------------------------------------------
# Activity
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def activity_list(request):
    if request.method == 'GET':
        qs = Activity.objects.select_related('created_by').all()[:50]
        serializer = ActivitySerializer(qs, many=True)
        return Response(serializer.data)

    serializer = ActivitySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def project_list(request):
    if request.method == 'GET':
        qs = Project.objects.select_related('owner').all()
        search = request.query_params.get('search', '')
        status_filter = request.query_params.get('status', '')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response(ProjectSerializer(qs, many=True).data)

    data = request.data.copy()
    if 'owner' not in data or not data['owner']:
        data['owner'] = request.user.id
    serializer = ProjectSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def project_detail(request, pk):
    try:
        project = Project.objects.select_related('owner').get(pk=pk)
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ProjectSerializer(project).data)

    if request.method == 'PATCH':
        serializer = ProjectSerializer(project, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    project.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    active_sprints = Sprint.objects.filter(status='Active')
    active_sprint_count = active_sprints.count()

    in_progress_tasks = Task.objects.filter(status='In Progress').count()
    open_bugs = Bug.objects.filter(status='Open').count()
    approved_ideas = Idea.objects.filter(status='Approved').count()
    total_members = User.objects.filter(is_active=True).count()

    total_items = (
        Task.objects.count() +
        Requirement.objects.count() +
        Bug.objects.count()
    )

    # Active sprint details (first active sprint)
    active_sprint_data = None
    if active_sprints.exists():
        sprint = active_sprints.first()
        s = SprintSerializer(sprint)
        active_sprint_data = s.data

    # Recent activity (last 10)
    recent_activity = Activity.objects.select_related('created_by').all()[:10]
    activity_data = ActivitySerializer(recent_activity, many=True).data

    # Open bugs list
    open_bugs_list = Bug.objects.select_related('assignee', 'sprint').filter(status='Open')[:10]
    open_bugs_data = BugSerializer(open_bugs_list, many=True).data

    # Ideas list (ordered by votes desc)
    ideas_list = Idea.objects.select_related('submitted_by').all()[:10]
    ideas_data = IdeaSerializer(ideas_list, many=True).data

    return Response({
        'active_sprints': active_sprint_count,
        'in_progress_tasks': in_progress_tasks,
        'open_bugs': open_bugs,
        'approved_ideas': approved_ideas,
        'total_members': total_members,
        'total_items': total_items,
        'active_sprint': active_sprint_data,
        'recent_activity': activity_data,
        'open_bugs_list': open_bugs_data,
        'ideas': ideas_data,
    })


# ---------------------------------------------------------------------------
# Standups
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def standup_list(request):
    if request.method == 'GET':
        qs = Standup.objects.select_related('user', 'sprint').all()
        date_filter = request.query_params.get('date', '')
        sprint_filter = request.query_params.get('sprint', '')
        user_filter = request.query_params.get('user', '')
        if date_filter:
            qs = qs.filter(date=date_filter)
        if sprint_filter:
            qs = qs.filter(sprint__id=sprint_filter)
        if user_filter:
            qs = qs.filter(user__id=user_filter)
        return Response(StandupSerializer(qs, many=True).data)

    data = request.data.copy()
    if not data.get('user'):
        data['user'] = request.user.id
    standup_date = data.get('date')
    if standup_date:
        existing = Standup.objects.filter(user_id=data['user'], date=standup_date).first()
        if existing:
            serializer = StandupSerializer(existing, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer = StandupSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def standup_detail(request, pk):
    try:
        standup = Standup.objects.select_related('user', 'sprint').get(pk=pk)
    except Standup.DoesNotExist:
        return Response({'error': 'Standup not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(StandupSerializer(standup).data)

    if request.method == 'PATCH':
        serializer = StandupSerializer(standup, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    standup.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Requirement → Sprint pull-in (SM only)
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def req_pull_to_sprint(request, pk):
    if getattr(request.user, 'role', '') != 'Scrum Master':
        return Response(
            {'error': 'Only Scrum Masters can pull requirements into sprints'},
            status=status.HTTP_403_FORBIDDEN
        )
    try:
        req = Requirement.objects.select_related('assignee', 'sprint', 'parent').get(pk=pk)
    except Requirement.DoesNotExist:
        return Response({'error': 'Requirement not found'}, status=status.HTTP_404_NOT_FOUND)

    sprint_id = request.data.get('sprint_id')
    if not sprint_id:
        return Response({'error': 'sprint_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        sprint = Sprint.objects.get(pk=sprint_id)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=status.HTTP_404_NOT_FOUND)

    req.sprint = sprint
    req.save()
    return Response(RequirementSerializer(req).data)


# ---------------------------------------------------------------------------
# Scrum Master Dashboard
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def scrum_dashboard(request):
    from datetime import date as date_type
    today = date_type.today()

    # Active sprint
    active_sprint = Sprint.objects.filter(status='Active').first()

    # Today's standups
    todays_standups = Standup.objects.filter(date=today).select_related('user', 'sprint')
    submitted_user_ids = set(todays_standups.values_list('user_id', flat=True))

    # All active non-CTO users for standup tracking
    all_users = User.objects.filter(is_active=True).exclude(perfiq='CTO').order_by('name')

    # Backlog requirements that are ready for sprint (grooming done, no sprint assigned)
    backlog_qs = Requirement.objects.filter(sprint=None).select_related('assignee', 'sprint', 'parent')
    backlog_ready = [r for r in backlog_qs if _grooming_status(r) == 'ready_for_sprint']

    # Grooming overview counts
    all_reqs = Requirement.objects.all().select_related('sprint')
    grooming_counts = {
        'in_sprint': 0,
        'ready_for_sprint': 0,
        'tl_reviewed': 0,
        'attachments_ready': 0,
        'pending': 0,
    }
    for req in all_reqs:
        if req.sprint_id:
            grooming_counts['in_sprint'] += 1
        else:
            gs = _grooming_status(req)
            grooming_counts[gs] = grooming_counts.get(gs, 0) + 1

    # Recent standups (last 3 days)
    from datetime import timedelta
    recent_standups = Standup.objects.filter(
        date__gte=today - timedelta(days=3)
    ).select_related('user', 'sprint').order_by('-date', 'user__name')

    # Standup attendance per user (submitted today or not)
    users_data = []
    for u in all_users:
        submitted = u.id in submitted_user_ids
        standup = todays_standups.filter(user=u).first()
        users_data.append({
            'id': u.id,
            'name': u.name,
            'initials': u.initials(),
            'role': u.role,
            'team': u.team,
            'submitted_today': submitted,
            'standup': StandupSerializer(standup).data if standup else None,
        })

    return Response({
        'active_sprint': SprintSerializer(active_sprint).data if active_sprint else None,
        'today': str(today),
        'submitted_count': len(submitted_user_ids),
        'total_team': all_users.count(),
        'users': users_data,
        'todays_standups': StandupSerializer(todays_standups, many=True).data,
        'recent_standups': StandupSerializer(recent_standups, many=True).data,
        'backlog_ready': RequirementSerializer(backlog_ready, many=True).data,
        'backlog_ready_count': len(backlog_ready),
        'grooming_overview': grooming_counts,
    })


def _grooming_status(req):
    try:
        return req.grooming.status
    except Exception:
        return 'pending'


# ---------------------------------------------------------------------------
# Bulk pull to sprint (SM only)
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def req_bulk_pull_to_sprint(request):
    if getattr(request.user, 'role', '') != 'Scrum Master':
        return Response(
            {'error': 'Only Scrum Masters can bulk pull requirements into sprints'},
            status=status.HTTP_403_FORBIDDEN
        )
    req_ids = request.data.get('requirement_ids', [])
    sprint_id = request.data.get('sprint_id')
    if not sprint_id:
        return Response({'error': 'sprint_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not req_ids:
        return Response({'error': 'requirement_ids is required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        sprint = Sprint.objects.get(pk=sprint_id)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=status.HTTP_404_NOT_FOUND)

    pulled = []
    errors = []
    for rid in req_ids:
        try:
            req = Requirement.objects.get(pk=rid)
            req.sprint = sprint
            req.save()
            pulled.append(rid)
        except Requirement.DoesNotExist:
            errors.append(f'{rid} not found')

    return Response({'pulled': pulled, 'errors': errors, 'sprint': SprintSerializer(sprint).data})


# ---------------------------------------------------------------------------
# Breached items
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def breached_items(request):
    from datetime import date as date_type
    today = date_type.today()
    breached = []

    for t in Task.objects.filter(sprint__end_date__lt=today).exclude(status='Done').select_related('sprint', 'assignee'):
        breached.append({
            'type': 'task', 'id': t.id, 'title': t.title,
            'assignee_name': t.assignee.name if t.assignee else None,
            'assignee_id': t.assignee.id if t.assignee else None,
            'sprint_name': t.sprint.name if t.sprint else None,
            'sprint_end': str(t.sprint.end_date) if t.sprint else None,
            'days_overdue': (today - t.sprint.end_date).days if t.sprint else 0,
            'priority': t.priority, 'status': t.status,
        })

    for r in Requirement.objects.filter(sprint__end_date__lt=today).exclude(status='Done').select_related('sprint', 'assignee'):
        breached.append({
            'type': 'requirement', 'id': r.id, 'title': r.title,
            'assignee_name': r.assignee.name if r.assignee else None,
            'assignee_id': r.assignee.id if r.assignee else None,
            'sprint_name': r.sprint.name if r.sprint else None,
            'sprint_end': str(r.sprint.end_date) if r.sprint else None,
            'days_overdue': (today - r.sprint.end_date).days if r.sprint else 0,
            'priority': r.priority, 'status': r.status,
        })

    for b in Bug.objects.filter(sprint__end_date__lt=today).exclude(status__in=['Fixed', 'Closed']).select_related('sprint', 'assignee'):
        breached.append({
            'type': 'bug', 'id': b.id, 'title': b.title,
            'assignee_name': b.assignee.name if b.assignee else None,
            'assignee_id': b.assignee.id if b.assignee else None,
            'sprint_name': b.sprint.name if b.sprint else None,
            'sprint_end': str(b.sprint.end_date) if b.sprint else None,
            'days_overdue': (today - b.sprint.end_date).days if b.sprint else 0,
            'priority': b.priority, 'status': b.status,
        })

    breached.sort(key=lambda x: x['days_overdue'], reverse=True)
    return Response(breached)


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def notification_list(request):
    if request.method == 'GET':
        qs = Notification.objects.filter(recipient=request.user).select_related('sender')
        return Response(NotificationSerializer(qs, many=True).data)

    data = request.data.copy()
    data['sender'] = request.user.id
    serializer = NotificationSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def notification_read(request, pk):
    try:
        notif = Notification.objects.get(pk=pk, recipient=request.user)
    except Notification.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    notif.is_read = True
    notif.save()
    return Response(NotificationSerializer(notif).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notification_read_all(request):
    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'all marked read'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_unread_count(request):
    count = Notification.objects.filter(recipient=request.user, is_read=False).count()
    return Response({'count': count})


# ---------------------------------------------------------------------------
# PM Work Log
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def pm_work_list(request):
    if request.method == 'GET':
        qs = PMWorkEntry.objects.select_related('user').prefetch_related('attachments', 'comments')
        date_filter  = request.query_params.get('date', '')
        user_filter  = request.query_params.get('user', '')
        if date_filter:
            qs = qs.filter(date=date_filter)
        if user_filter:
            qs = qs.filter(user__id=user_filter)
        return Response(PMWorkEntrySerializer(qs, many=True, context={'request': request}).data)

    data = request.data.copy()
    if not data.get('user'):
        data['user'] = request.user.id
    serializer = PMWorkEntrySerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def pm_work_detail(request, pk):
    try:
        entry = PMWorkEntry.objects.prefetch_related('attachments', 'comments').get(pk=pk)
    except PMWorkEntry.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(PMWorkEntrySerializer(entry, context={'request': request}).data)

    if request.method == 'PATCH':
        serializer = PMWorkEntrySerializer(entry, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    entry.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def pm_work_attachments(request, pk):
    try:
        entry = PMWorkEntry.objects.get(pk=pk)
    except PMWorkEntry.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(PMWorkEntryAttachmentSerializer(
            entry.attachments.all(), many=True, context={'request': request}
        ).data)

    if 'file' not in request.FILES:
        return Response({'error': 'file required'}, status=status.HTTP_400_BAD_REQUEST)
    f = request.FILES['file']
    att = PMWorkEntryAttachment.objects.create(
        entry=entry, file=f, filename=f.name, uploaded_by=request.user
    )
    return Response(PMWorkEntryAttachmentSerializer(att, context={'request': request}).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def pm_work_attachment_detail(request, pk, att_id):
    try:
        att = PMWorkEntryAttachment.objects.get(pk=att_id, entry_id=pk)
    except PMWorkEntryAttachment.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    att.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def pm_work_comments(request, pk):
    try:
        entry = PMWorkEntry.objects.get(pk=pk)
    except PMWorkEntry.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(PMWorkEntryCommentSerializer(entry.comments.all(), many=True).data)

    data = request.data.copy()
    data['entry'] = pk
    if not data.get('author'):
        data['author'] = request.user.id
    serializer = PMWorkEntryCommentSerializer(data=data)
    if serializer.is_valid():
        comment = serializer.save()
        # Notify @mentioned users
        notify_mentions(
            text=comment.text,
            sender=request.user,
            item_type='general',
            item_id=pk,
            context_label=f'PM Work Log — {entry.title}',
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def pm_work_comment_detail(request, pk, comment_id):
    try:
        c = PMWorkEntryComment.objects.get(pk=comment_id, entry_id=pk)
    except PMWorkEntryComment.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    c.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pm_work_summary(request):
    """Consolidated PM work summary — supports single date or date range."""
    from datetime import date as date_type, timedelta

    date_from_str = request.query_params.get('date_from')
    date_to_str   = request.query_params.get('date_to')
    target_date   = request.query_params.get('date', str(date_type.today()))

    if date_from_str and date_to_str:
        try:
            start = date_type.fromisoformat(date_from_str)
            end   = date_type.fromisoformat(date_to_str)
        except ValueError:
            start = end = date_type.fromisoformat(target_date)
    else:
        start = end = date_type.fromisoformat(target_date)

    work_days = sum(
        1 for i in range((end - start).days + 1)
        if (start + timedelta(i)).weekday() < 5
    )
    expected_hours = max(work_days * 8, 8)

    # Active sprint for sprint-items breakdown
    active_sprint = Sprint.objects.filter(status='Active').first()

    pm_users = User.objects.filter(role='Product Manager', is_active=True).order_by('name')
    result = []
    for pm in pm_users:
        entries = list(
            PMWorkEntry.objects.filter(user=pm, date__gte=start, date__lte=end)
            .prefetch_related('attachments', 'comments')
        )
        total_hours = sum(float(e.hours) for e in entries)
        categories = {}
        for e in entries:
            cat = e.category
            if cat not in categories:
                categories[cat] = {'hours': 0.0, 'count': 0}
            categories[cat]['hours'] = round(categories[cat]['hours'] + float(e.hours), 2)
            categories[cat]['count'] += 1

        # Sprint items by type assigned to this PM
        sprint_items = {}
        if active_sprint:
            for r in Requirement.objects.filter(sprint=active_sprint, assignee=pm):
                t = r.item_type
                sprint_items[t] = sprint_items.get(t, 0) + 1

        hours_pct = round((total_hours / expected_hours * 100), 1) if expected_hours > 0 else 0
        attention_flag = hours_pct < 50

        result.append({
            'user_id': pm.id,
            'user_name': pm.name,
            'user_initials': pm.initials(),
            'user_role': pm.role,
            'total_hours': total_hours,
            'entry_count': len(entries),
            'expected_hours': expected_hours,
            'hours_pct': hours_pct,
            'attention_flag': attention_flag,
            'sprint_items': sprint_items,
            'categories': categories,
            'entries': PMWorkEntrySerializer(entries, many=True, context={'request': request}).data,
        })

    return Response({
        'date': target_date,
        'date_from': str(start),
        'date_to': str(end),
        'expected_hours': expected_hours,
        'pms': result,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cto_mini_dashboard(request):
    """Department-wise requirement stats for CTO command view."""
    from django.db.models import Count

    released_ids = set(
        ReleaseItem.objects.filter(release__status='Published')
        .values_list('requirement_id', flat=True)
    )

    depts = ['DSE', 'DEE', 'SS', 'MS', 'DGE', 'DPS', 'Other', 'Tech Initiatives']
    dept_stats = []
    for dept in depts:
        qs = Requirement.objects.filter(department=dept)
        total = qs.count()
        if total == 0:
            continue
        released     = qs.filter(id__in=released_ids).count()
        not_released = total - released
        by_pm        = qs.filter(assignee__role='Product Manager').count()
        raise_q      = qs.filter(status='Open', sprint__isnull=True).count()
        dept_stats.append({
            'dept': dept,
            'total': total,
            'released': released,
            'not_released': not_released,
            'by_pm': by_pm,
            'raise_question': raise_q,
        })

    return Response({
        'departments': dept_stats,
        'project_count': Project.objects.count(),
        'active_project_count': Project.objects.filter(status='Active').count(),
        'total_requirements': Requirement.objects.count(),
        'released_count': len(released_ids),
    })


# ---------------------------------------------------------------------------
# Meetings
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def meeting_list(request):
    if request.method == 'GET':
        from datetime import datetime, timedelta
        qs = Meeting.objects.prefetch_related('attendees').select_related('created_by').all()
        week_start = request.query_params.get('week_start')
        if week_start:
            try:
                start = datetime.fromisoformat(week_start)
                end   = start + timedelta(days=7)
                qs = qs.filter(start_datetime__gte=start, start_datetime__lt=end)
            except ValueError:
                pass
        return Response(MeetingSerializer(qs, many=True).data)

    # POST — PM and SM can create meetings
    allowed_roles = ('Product Manager', 'Scrum Master')
    if getattr(request.user, 'role', '') not in allowed_roles:
        return Response({'error': 'Only Product Managers and Scrum Masters can create meetings'}, status=status.HTTP_403_FORBIDDEN)

    from django.utils.dateparse import parse_datetime
    start_dt = parse_datetime(request.data.get('start_datetime', ''))
    end_dt   = parse_datetime(request.data.get('end_datetime', ''))
    if start_dt and end_dt:
        overlap = Meeting.objects.filter(created_by=request.user).filter(
            Q(start_datetime__lt=end_dt) & Q(end_datetime__gt=start_dt)
        )
        if overlap.exists():
            return Response({'error': 'You already have a meeting overlapping this time slot'}, status=status.HTTP_409_CONFLICT)

    data = request.data.copy()
    data['created_by'] = request.user.id
    serializer = MeetingSerializer(data=data)
    if serializer.is_valid():
        meeting = serializer.save()
        return Response(MeetingSerializer(meeting).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def meeting_detail(request, pk):
    try:
        meeting = Meeting.objects.prefetch_related('attendees').select_related('created_by').get(pk=pk)
    except Meeting.DoesNotExist:
        return Response({'error': 'Meeting not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(MeetingSerializer(meeting).data)

    # Only creator or CTO can modify/delete
    is_cto = getattr(request.user, 'perfiq', '') == 'CTO'
    if meeting.created_by != request.user and not is_cto:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PATCH':
        from django.utils.dateparse import parse_datetime
        start_dt = parse_datetime(request.data.get('start_datetime', '')) or meeting.start_datetime
        end_dt   = parse_datetime(request.data.get('end_datetime', ''))   or meeting.end_datetime
        overlap = Meeting.objects.filter(created_by=meeting.created_by).exclude(pk=pk).filter(
            Q(start_datetime__lt=end_dt) & Q(end_datetime__gt=start_dt)
        )
        if overlap.exists():
            return Response({'error': 'This time slot overlaps with another meeting'}, status=status.HTTP_409_CONFLICT)

        serializer = MeetingSerializer(meeting, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    meeting.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Scrum Alerts
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def scrum_alert_list(request):
    if request.method == 'GET':
        qs = ScrumAlert.objects.select_related('created_by').all()[:20]
        return Response(ScrumAlertSerializer(qs, many=True).data)

    if getattr(request.user, 'role', '') != 'Scrum Master':
        return Response({'error': 'Only Scrum Masters can push alerts'}, status=status.HTTP_403_FORBIDDEN)

    data = request.data.copy()
    data['created_by'] = request.user.id
    serializer = ScrumAlertSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def scrum_alert_latest(request):
    from datetime import timedelta
    cutoff = timezone.now() - timedelta(hours=2)
    alert = ScrumAlert.objects.filter(is_active=True, created_at__gte=cutoff).order_by('-created_at').first()
    if not alert:
        return Response({'alert': None})
    return Response({'alert': ScrumAlertSerializer(alert).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def scrum_alert_deactivate(request, pk):
    if getattr(request.user, 'role', '') != 'Scrum Master':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    try:
        alert = ScrumAlert.objects.get(pk=pk)
    except ScrumAlert.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    alert.is_active = False
    alert.save()
    return Response(ScrumAlertSerializer(alert).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notify_breaches(request):
    """Find newly-breached requirements and notify all Scrum Master users."""
    from datetime import date
    today = date.today()

    breached = Requirement.objects.filter(
        end_date__lt=today,
        breach_notified=False,
    ).exclude(status='Done')

    if not breached.exists():
        return Response({'notified': 0})

    sm_users = User.objects.filter(role='Scrum Master')
    count = 0

    for req in breached:
        for sm in sm_users:
            Notification.objects.create(
                recipient=sm,
                sender=None,
                title=f'Breach Alert: {req.id}',
                message=(
                    f'"{req.title}" has breached its end date '
                    f'({req.end_date.strftime("%d %b %Y")}). '
                    f'Current status: {req.status}.'
                ),
                item_type='requirement',
                item_id=req.id,
            )
        req.breach_notified = True
        req.save(update_fields=['breach_notified'])
        count += 1

    return Response({'notified': count})


# ---------------------------------------------------------------------------
# Epics
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def epic_list(request):
    if request.method == 'GET':
        qs = Epic.objects.select_related('created_by', 'project').all()
        serializer = EpicSerializer(qs, many=True)
        return Response(serializer.data)
    if request.user.role not in ('Product Manager', 'PM Team Lead'):
        return Response({'error': 'Only PMs and TLs can create epics'}, status=status.HTTP_403_FORBIDDEN)
    serializer = EpicSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def epic_detail(request, pk):
    try:
        epic = Epic.objects.select_related('created_by', 'project').get(pk=pk)
    except Epic.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(EpicSerializer(epic).data)
    if request.method == 'PATCH':
        if request.user.role not in ('Product Manager', 'PM Team Lead'):
            return Response({'error': 'Only PMs and TLs can edit epics'}, status=status.HTTP_403_FORBIDDEN)
        serializer = EpicSerializer(epic, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    if request.user.role not in ('Product Manager', 'PM Team Lead'):
        return Response({'error': 'Only PMs and TLs can delete epics'}, status=status.HTTP_403_FORBIDDEN)
    epic.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Releases
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def release_list(request):
    if request.method == 'GET':
        qs = Release.objects.select_related('created_by', 'sprint').prefetch_related('items__requirement').all()
        return Response(ReleaseSerializer(qs, many=True).data)
    if request.user.role != 'Scrum Master':
        return Response({'error': 'Only SM can create releases'}, status=status.HTTP_403_FORBIDDEN)
    serializer = ReleaseSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def release_detail(request, pk):
    try:
        release = Release.objects.select_related('created_by', 'sprint').prefetch_related('items__requirement').get(pk=pk)
    except Release.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(ReleaseSerializer(release).data)
    if request.method == 'PATCH':
        if request.user.role != 'Scrum Master':
            return Response({'error': 'Only SM can edit releases'}, status=status.HTTP_403_FORBIDDEN)
        s = ReleaseSerializer(release, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
    if request.user.role != 'Scrum Master':
        return Response({'error': 'Only SM can delete releases'}, status=status.HTTP_403_FORBIDDEN)
    release.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def release_add_item(request, pk):
    """SM adds a completed requirement to a release"""
    if request.user.role != 'Scrum Master':
        return Response({'error': 'Only SM can push items to releases'}, status=status.HTTP_403_FORBIDDEN)
    try:
        release = Release.objects.get(pk=pk)
    except Release.DoesNotExist:
        return Response({'error': 'Release not found'}, status=status.HTTP_404_NOT_FOUND)
    req_id = request.data.get('requirement_id')
    notes  = request.data.get('notes', '')
    try:
        req = Requirement.objects.get(pk=req_id)
    except Requirement.DoesNotExist:
        return Response({'error': 'Requirement not found'}, status=status.HTTP_404_NOT_FOUND)
    item, created = ReleaseItem.objects.get_or_create(
        release=release, requirement=req,
        defaults={'added_by': request.user, 'notes': notes}
    )
    return Response(ReleaseItemSerializer(item).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def release_remove_item(request, pk, item_id):
    if request.user.role != 'Scrum Master':
        return Response({'error': 'Only SM can remove items from releases'}, status=status.HTTP_403_FORBIDDEN)
    try:
        item = ReleaseItem.objects.get(pk=item_id, release_id=pk)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except ReleaseItem.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# Teams
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def team_list(request):
    teams = Team.objects.select_related('team_lead').prefetch_related('members').all()
    return Response(TeamSerializer(teams, many=True).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_team(request):
    team = Team.objects.filter(team_lead=request.user).select_related('team_lead').prefetch_related('members').first()
    if not team:
        return Response({'error': 'No team found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(TeamSerializer(team).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def team_standups(request, pk):
    from datetime import date as date_cls
    try:
        team = Team.objects.prefetch_related('members').get(pk=pk)
    except Team.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    target_date = request.query_params.get('date', str(date_cls.today()))
    all_members = list(team.members.all())
    standups = Standup.objects.filter(user__in=all_members, date=target_date).select_related('user')
    standup_map = {s.user_id: s for s in standups}
    result = []
    for m in all_members:
        s = standup_map.get(m.id)
        result.append({'user_id': m.id, 'name': m.name, 'initials': m.initials(), 'role': m.role,
                       'submitted': s is not None,
                       'yesterday': s.yesterday if s else '', 'today': s.today if s else '',
                       'blockers': s.blockers if s else '', 'submitted_at': str(s.submitted_at) if s else None})
    return Response({'team_id': team.id, 'team': team.name, 'date': target_date, 'members': result})
