from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login, name='login'),
    path('role-login/', views.role_login, name='role-login'),
    path('token/refresh/', views.token_refresh, name='token_refresh'),
    path('me/', views.me, name='me'),
    path('<int:user_id>/assign/', views.assign_manager, name='assign_manager'),
    path('', views.list_users, name='list_users'),
]
