from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    initials = serializers.SerializerMethodField()
    reports_to_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'name', 'emis_id', 'perfiq', 'role',
            'designation', 'level', 'team', 'cohort',
            'is_manager', 'is_master_admin', 'is_lead',
            'reports_to', 'reports_to_name', 'initials', 'date_joined',
        ]

    def get_initials(self, obj):
        return obj.initials()

    def get_reports_to_name(self, obj):
        if obj.reports_to:
            return obj.reports_to.name
        return None


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
