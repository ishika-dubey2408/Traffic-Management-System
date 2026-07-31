import os
import sys
import django
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import pickle
import osmnx as ox

# Add backend\smart_traffic to Python path
project_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_traffic.settings')
django.setup()

from routes.models import TrafficData

# Clear OSMnx cache
cache_folder = os.path.join(project_path, 'cache')
os.makedirs(cache_folder, exist_ok=True)
if os.path.exists(cache_folder):
    for file in os.listdir(cache_folder):
        os.remove(os.path.join(cache_folder, file))
        print(f"Deleted cache file: {file}")

# Fetch OSM graph
ox.settings.use_cache = True
ox.settings.cache_folder = cache_folder
print("Loading OSM graph...")
G = ox.graph_from_place('Indore, India', network_type='drive')
edges = ox.graph_to_gdfs(G, nodes=False, edges=True)
all_road_ids = [
    str(osmid) if not isinstance(osmid, list) else str(osmid[0])
    for osmid in edges['osmid'].values
]
print(f"Sample OSM all_road_ids: {all_road_ids[:5]}")

# Fetch data
data = TrafficData.objects.values('road_id', 'date', 'time', 'speed_kmh')
df = pd.DataFrame(data)
print(f"Sample TrafficData road_ids: {df['road_id'].head().tolist()}")

# Validate road_ids
if df.empty or len(df) < 10:
    raise ValueError(f"Insufficient data: only {len(df)} records found. Need at least 10 records.")
df['road_id'] = df['road_id'].astype(str)
traffic_road_ids = set(df['road_id'])
if not traffic_road_ids.intersection(all_road_ids):
    print(f"Traffic road_ids (sample): {list(traffic_road_ids)[:5]}")
    raise ValueError("No TrafficData matches OSM road_ids. Check seed_data.py.")

# Encode road_id with all OSM road IDs
le = LabelEncoder()
le.fit(all_road_ids)

# Filter df
df = df[df['road_id'].isin(all_road_ids)]
if df.empty:
    raise ValueError("No TrafficData matches OSM road_ids after filtering. Check seed_data.py.")
df['road_id_encoded'] = le.transform(df['road_id'])

# Features and target
df['date'] = pd.to_datetime(df['date'])
df['hour'] = pd.to_datetime(df['time'], format='%H:%M:%S').dt.hour
df['day_of_week'] = df['date'].dt.dayofweek
X = df[['road_id_encoded', 'hour', 'day_of_week']]
y = df['speed_kmh']

# Train
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X, y)

# Save
with open(os.path.join(os.path.dirname(__file__), 'traffic_model.pkl'), 'wb') as f:
    pickle.dump(model, f)
with open(os.path.join(os.path.dirname(__file__), 'road_id_encoder.pkl'), 'wb') as f:
    pickle.dump(le, f)
print("Model trained and saved.")