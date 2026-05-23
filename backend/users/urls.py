from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login, name='login'),
    path('token/refresh/', views.token_refresh, name='token_refresh'),
    path('me/', views.me, name='me'),
    path('', views.list_users, name='list_users'),
]
