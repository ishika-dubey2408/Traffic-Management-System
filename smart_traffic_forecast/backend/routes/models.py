from django.db import models
from django.utils import timezone
from datetime import timedelta
# Create your models here.


class TrafficData(models.Model):
    road_id = models.BigIntegerField()
    latitude_start = models.FloatField()
    longitude_start = models.FloatField()
    latitude_end = models.FloatField()
    longitude_end = models.FloatField()
    date = models.DateField()
    time = models.TimeField()
    speed_kmh = models.FloatField()
    congestion_level = models.CharField(max_length=20)

    class Meta:
        indexes = [
            models.Index(fields=['road_id', 'time']),
        ]

class RawGPSData(models.Model):
    latitude = models.FloatField()
    longitude = models.FloatField()
    speed_kmh = models.FloatField()
    timestamp = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    

#------------------



class UserProfile(models.Model):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class OTP(models.Model):
    email = models.EmailField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=5)

