from django.urls import path
from .views import RouteView,  SendOTPView, VerifyOTPView, GoogleLoginView

urlpatterns = [
    path('routes/', RouteView.as_view(), name='routes'),
    
    path('send-otp/', SendOTPView.as_view()),
    path('verify-otp/', VerifyOTPView.as_view()),
    path('google-login/', GoogleLoginView.as_view()),
]