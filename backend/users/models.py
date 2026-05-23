from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('perfiq', 'CTO')
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    PERFIQ_CHOICES = [
        ('CTO', 'CTO'),
        ('MANAGER', 'Manager'),
        ('EMPLOYEE', 'Employee'),
    ]
    LEVEL_CHOICES = [
        ('L0', 'L0'),
        ('L1', 'L1'),
        ('L2', 'L2'),
        ('L3', 'L3'),
    ]

    # Identity
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=150)
    emis_id = models.CharField(max_length=20, unique=True, blank=True, null=True)

    # Role & Org
    perfiq = models.CharField(max_length=10, choices=PERFIQ_CHOICES, default='EMPLOYEE')
    role = models.CharField(max_length=100, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    level = models.CharField(max_length=5, choices=LEVEL_CHOICES, default='L2')
    team = models.CharField(max_length=20, blank=True)
    cohort = models.IntegerField(null=True, blank=True)

    # Flags
    is_manager = models.BooleanField(default=False)
    is_master_admin = models.BooleanField(default=False)
    is_lead = models.BooleanField(default=False)

    # Hierarchy
    reports_to = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='direct_reports'
    )

    # Django required fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    class Meta:
        db_table = 'users'
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.email})'

    def initials(self):
        parts = self.name.split()
        return ''.join(p[0] for p in parts[:2]).upper()
