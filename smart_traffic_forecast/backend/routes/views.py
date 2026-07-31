# routes/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings

import osmnx as ox
import osmnx.distance as distance
import networkx as nx
import pandas as pd

from datetime import datetime
import os
import time
import random

from django.core.mail import send_mail
from .models import UserProfile, OTP

from google.oauth2 import id_token
from google.auth.transport import requests as grequests
from rest_framework_simplejwt.tokens import RefreshToken


# ------------------ Graph Cache ------------------

G = None


def load_graph(network_type='drive'):
    global G
    ox.settings.use_cache = True
    ox.settings.cache_folder = os.path.join(settings.BASE_DIR, 'cache')

    print('Loading graph...')
    start = time.time()

    G = ox.graph_from_place('Indore, India', network_type=network_type)
    G = distance.add_edge_lengths(G)

    print(f'Graph loaded in {time.time() - start:.2f}s')


load_graph()


# ------------------ Route API ------------------

class RouteView(APIView):

    def post(self, request):

        try:
            source = tuple(map(float, request.data['source'].split(',')))
            dest = tuple(map(float, request.data['destination'].split(',')))

            date_time = request.data.get('date_time')

            origin = ox.nearest_nodes(G, source[1], source[0])
            destination = ox.nearest_nodes(G, dest[1], dest[0])

            route = ox.shortest_path(G, origin, destination, weight='length')

            if not route:
                return Response({'error': 'No route found'}, status=404)

            edges = ox.graph_to_gdfs(G, nodes=False, edges=True)

            segments = []
            total_distance = 0

            for u, v in zip(route[:-1], route[1:]):

                try:
                    edge = edges.loc[(u, v)]

                    if isinstance(edge, pd.DataFrame):
                        edge = edge.iloc[0]

                    coords = list(edge.geometry.coords)
                    length_m = edge.get('length', 0)

                    total_distance += length_m

                    segments.append({
                        'latitude_start': coords[0][1],
                        'longitude_start': coords[0][0],
                        'latitude_end': coords[-1][1],
                        'longitude_end': coords[-1][0],
                        'congestion_level': 'green',
                        'speed_kmh': 30,
                        'length_m': round(length_m, 1),
                        'travel_time_min': round((length_m / 1000) / 30 * 60, 1)
                    })

                except Exception as e:
                    print('Edge error:', e)
                    continue

            result = [{
                'route_name': 'Best Route',
                'total_distance_km': round(total_distance / 1000, 2),
                'total_time_min': round((total_distance / 1000) / 30 * 60, 1),
                'segments': segments,
                'recommended': True
            }]

            return Response(result)

        except Exception as e:
            print('Route error:', e)
            return Response({'error': str(e)}, status=500)


# ------------------ JWT Helper ------------------

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)

    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


# ------------------ OTP APIs ------------------

class SendOTPView(APIView):

    def post(self, request):

        email = request.data.get('email')

        if not email:
            return Response({'error': 'Email required'}, status=400)

        OTP.objects.filter(email=email).delete()

        otp = str(random.randint(100000, 999999))

        OTP.objects.create(email=email, code=otp)

        send_mail(
            'Your OTP Code',
            f'OTP: {otp}',
            settings.DEFAULT_FROM_EMAIL,
            [email]
        )

        return Response({'message': 'OTP sent'})


class VerifyOTPView(APIView):

    def post(self, request):

        email = request.data.get('email')
        otp = request.data.get('otp')

        try:
            latest_otp = OTP.objects.filter(email=email).latest('created_at')

        except OTP.DoesNotExist:
            return Response({'error': 'OTP not found'}, status=400)

        if latest_otp.is_expired():
            latest_otp.delete()
            return Response({'error': 'OTP expired'}, status=400)

        if latest_otp.code != otp:
            return Response({'error': 'Invalid OTP'}, status=400)

        latest_otp.delete()

        user, _ = UserProfile.objects.get_or_create(email=email)

        tokens = get_tokens_for_user(user)

        return Response({
            'message': 'OTP verified',
            'email': user.email,
            'token': tokens['access']
        })


# ------------------ Google Login ------------------

class GoogleLoginView(APIView):

    def post(self, request):

        token = request.data.get('token')

        if not token:
            return Response({'error': 'Token required'}, status=400)

        try:
            idinfo = id_token.verify_oauth2_token(
                token,
                grequests.Request()
            )

            email = idinfo['email']
            name = idinfo.get('name', '')

            user, _ = UserProfile.objects.get_or_create(email=email)

            user.name = name
            user.save()

            tokens = get_tokens_for_user(user)

            return Response({
                'message': 'Google login successful',
                'email': user.email,
                'token': tokens['access']
            })

        except Exception:
            return Response({'error': 'Invalid token'}, status=400)