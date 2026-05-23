from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['name', 'email', 'emis_id', 'perfiq', 'role', 'team', 'is_active']
    list_filter = ['perfiq', 'team', 'is_manager', 'is_active']
    search_fields = ['name', 'email', 'emis_id']
    ordering = ['name']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal', {'fields': ('name', 'emis_id')}),
        ('Role & Org', {'fields': ('perfiq', 'role', 'designation', 'level', 'team', 'cohort', 'reports_to')}),
        ('Flags', {'fields': ('is_manager', 'is_master_admin', 'is_lead')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'name', 'password1', 'password2', 'perfiq'),
        }),
    )
