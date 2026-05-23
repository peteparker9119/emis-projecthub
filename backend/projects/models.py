from django.db import models
from django.conf import settings


def _next_id(model_class, prefix, digits=3):
    """Generate the next sequential ID like SP-001, TSK-002, etc."""
    # Get the highest numeric suffix currently in use
    existing = list(model_class.objects.values_list('id', flat=True))
    max_seq = 0
    for eid in existing:
        try:
            parts = eid.split('-')
            num = int(parts[-1])
            if num > max_seq:
                max_seq = num
        except (IndexError, ValueError):
            pass
    return f"{prefix}-{str(max_seq + 1).zfill(digits)}"


class Sprint(models.Model):
    STATUS_CHOICES = [
        ('Planning', 'Planning'),
        ('Active', 'Active'),
        ('Completed', 'Completed'),
    ]

    id = models.CharField(max_length=10, primary_key=True, editable=False)
    name = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField()
    goal = models.TextField(blank=True)
    capacity = models.IntegerField(default=0)
    velocity = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Planning')

    class Meta:
        db_table = 'sprints'
        ordering = ['id']

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = _next_id(Sprint, 'SP')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id}: {self.name}"


class Task(models.Model):
    PRIORITY_CHOICES = [
        ('Critical', 'Critical'),
        ('High', 'High'),
        ('Medium', 'Medium'),
        ('Low', 'Low'),
    ]
    STATUS_CHOICES = [
        ('To Do', 'To Do'),
        ('In Progress', 'In Progress'),
        ('Review', 'Review'),
        ('Done', 'Done'),
    ]

    id = models.CharField(max_length=10, primary_key=True, editable=False)
    title = models.CharField(max_length=300)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='Medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='To Do')
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='tasks'
    )
    sprint = models.ForeignKey(
        Sprint, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='tasks'
    )
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tasks'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = _next_id(Task, 'TSK')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id}: {self.title}"


class Requirement(models.Model):
    PRIORITY_CHOICES = [
        ('Critical', 'Critical'),
        ('High', 'High'),
        ('Medium', 'Medium'),
        ('Low', 'Low'),
    ]
    STATUS_CHOICES = [
        ('Open', 'Open'),
        ('In Progress', 'In Progress'),
        ('Review', 'Review'),
        ('Done', 'Done'),
    ]

    DEPARTMENT_CHOICES = [
        ('DSE', 'DSE'), ('DEE', 'DEE'), ('SS', 'SS'), ('MS', 'MS'),
        ('DGE', 'DGE'), ('DPS', 'DPS'), ('Other', 'Other'), ('Tech Initiatives', 'Tech Initiatives'),
    ]

    id = models.CharField(max_length=10, primary_key=True, editable=False)
    title = models.CharField(max_length=300)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='Medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open')
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='requirements'
    )
    sprint = models.ForeignKey(
        Sprint, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='requirements'
    )
    description = models.TextField(blank=True)
    department = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES, blank=True)
    parent = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='children'
    )
    linked_requirements = models.ManyToManyField(
        'self', blank=True, symmetrical=False, related_name='linked_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'requirements'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = _next_id(Requirement, 'REQ')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id}: {self.title}"


class RequirementGrooming(models.Model):
    requirement = models.OneToOneField(Requirement, on_delete=models.CASCADE, related_name='grooming')

    # Step 1: Wireframe Signoff
    wireframe_file = models.FileField(upload_to='grooming/wireframes/', blank=True, null=True)
    wireframe_filename = models.CharField(max_length=255, blank=True)
    wireframe_signed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='wireframe_signoffs')
    wireframe_signed_at = models.DateTimeField(null=True, blank=True)

    # Step 2: Stakeholder Signoff
    stakeholder_file = models.FileField(upload_to='grooming/stakeholder/', blank=True, null=True)
    stakeholder_filename = models.CharField(max_length=255, blank=True)
    stakeholder_signed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='stakeholder_signoffs')
    stakeholder_signed_at = models.DateTimeField(null=True, blank=True)

    # Step 3: TL Comment
    tl_comment = models.TextField(blank=True)
    tl_commented_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='tl_grooming_comments')
    tl_commented_at = models.DateTimeField(null=True, blank=True)

    # Step 4: PM Comment
    pm_comment = models.TextField(blank=True)
    pm_commented_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='pm_grooming_comments')
    pm_commented_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'requirement_grooming'

    @property
    def status(self):
        if self.pm_comment:
            return 'ready_for_sprint'
        if self.tl_comment:
            return 'tl_reviewed'
        if self.wireframe_signed_by and self.stakeholder_signed_by:
            return 'attachments_ready'
        return 'pending'

    def __str__(self):
        return f"Grooming: {self.requirement_id}"


class RequirementComment(models.Model):
    requirement = models.ForeignKey(
        Requirement, on_delete=models.CASCADE, related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='req_comments'
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'requirement_comments'
        ordering = ['created_at']

    def __str__(self):
        return f"Comment on {self.requirement_id} by {self.author}"


class WorkLog(models.Model):
    requirement = models.ForeignKey(
        Requirement, on_delete=models.CASCADE, related_name='worklogs'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='worklogs'
    )
    hours = models.DecimalField(max_digits=6, decimal_places=2)
    date = models.DateField()
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'worklogs'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.hours}h on {self.requirement_id} by {self.user}"


class RequirementAttachment(models.Model):
    requirement = models.ForeignKey(
        Requirement, on_delete=models.CASCADE, related_name='attachments'
    )
    file = models.FileField(upload_to='req_attachments/', blank=True)
    filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='req_attachments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'requirement_attachments'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.filename} on {self.requirement_id}"


class Bug(models.Model):
    PRIORITY_CHOICES = [
        ('Critical', 'Critical'),
        ('High', 'High'),
        ('Medium', 'Medium'),
        ('Low', 'Low'),
    ]
    STATUS_CHOICES = [
        ('Open', 'Open'),
        ('In Progress', 'In Progress'),
        ('Fixed', 'Fixed'),
        ('Closed', 'Closed'),
    ]
    BUG_TYPE_CHOICES = [
        ('UI', 'UI'),
        ('API', 'API'),
        ('Data', 'Data'),
        ('Performance', 'Performance'),
        ('Security', 'Security'),
    ]

    id = models.CharField(max_length=10, primary_key=True, editable=False)
    title = models.CharField(max_length=300)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='Medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open')
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='bugs'
    )
    sprint = models.ForeignKey(
        Sprint, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='bugs'
    )
    description = models.TextField(blank=True)
    bug_type = models.CharField(max_length=15, choices=BUG_TYPE_CHOICES, default='UI')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bugs'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = _next_id(Bug, 'BUG')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id}: {self.title}"


class Idea(models.Model):
    STATUS_CHOICES = [
        ('Open', 'Open'),
        ('Under Review', 'Under Review'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]

    id = models.CharField(max_length=10, primary_key=True, editable=False)
    title = models.CharField(max_length=300)
    votes = models.IntegerField(default=0)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='Open')
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='ideas'
    )
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ideas'
        ordering = ['-votes', '-created_at']

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = _next_id(Idea, 'IDEA')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id}: {self.title}"


class Project(models.Model):
    STATUS_CHOICES = [
        ('Planning', 'Planning'),
        ('Active', 'Active'),
        ('On Hold', 'On Hold'),
        ('Completed', 'Completed'),
    ]
    COLOR_CHOICES = [
        ('#1a56db', 'Blue'),
        ('#0d9488', 'Teal'),
        ('#7c3aed', 'Purple'),
        ('#d97706', 'Amber'),
        ('#dc2626', 'Red'),
        ('#16a34a', 'Green'),
    ]

    id = models.CharField(max_length=10, primary_key=True, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Planning')
    color = models.CharField(max_length=10, default='#1a56db')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='owned_projects'
    )
    team_number = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'projects'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = _next_id(Project, 'PRJ')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id}: {self.name}"


class Standup(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='standups'
    )
    sprint = models.ForeignKey(
        Sprint, null=True, blank=True, on_delete=models.SET_NULL, related_name='standups'
    )
    date = models.DateField()
    yesterday = models.TextField(blank=True)
    today = models.TextField()
    blockers = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'standups'
        ordering = ['-date', '-submitted_at']
        unique_together = ('user', 'date')

    def __str__(self):
        return f"Standup {self.user} on {self.date}"


class Notification(models.Model):
    ITEM_TYPE_CHOICES = [
        ('requirement', 'Requirement'),
        ('task', 'Task'),
        ('bug', 'Bug'),
        ('sprint', 'Sprint'),
        ('general', 'General'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='sent_notifications'
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES, default='general')
    item_id = models.CharField(max_length=20, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"Notif → {self.recipient}: {self.title}"


class PMWorkEntry(models.Model):
    CATEGORY_CHOICES = [
        ('documentation',       'Documentation'),
        ('learning',            'Learning'),
        ('internal_discussion', 'Internal Discussion'),
        ('external_discussion', 'External Discussion'),
        ('online_discussion',   'Online Discussion'),
        ('grooming_discussion', 'Grooming Discussion'),
        ('tech_discussion',     'Tech Discussion'),
        ('pmu_discussion',      'PMU Discussion'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='pm_work_entries'
    )
    date = models.DateField()
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    hours = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pm_work_entries'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.user} — {self.category} on {self.date}"


class PMWorkEntryAttachment(models.Model):
    entry = models.ForeignKey(
        PMWorkEntry, on_delete=models.CASCADE, related_name='attachments'
    )
    file = models.FileField(upload_to='pm_work_attachments/')
    filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='pm_work_attachments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pm_work_attachments'
        ordering = ['-created_at']


class PMWorkEntryComment(models.Model):
    entry = models.ForeignKey(
        PMWorkEntry, on_delete=models.CASCADE, related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='pm_work_comments'
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pm_work_comments'
        ordering = ['created_at']


class Activity(models.Model):
    text = models.TextField()
    icon = models.CharField(max_length=10, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='activities'
    )

    class Meta:
        db_table = 'activities'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.text[:60]}"
